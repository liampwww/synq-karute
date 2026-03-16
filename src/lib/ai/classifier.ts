import { z } from "zod";

import { getGemini } from "@/lib/ai/gemini";
import { getOpenAI } from "@/lib/ai/openai";
import { getClassificationPrompt, getClassificationPromptWithHistory } from "@/lib/ai/prompts";
import type { KarteCategory } from "@/types/database";

const KARTE_CATEGORIES: [KarteCategory, ...KarteCategory[]] = [
  "symptom",
  "treatment",
  "preference",
  "lifestyle",
  "next_appointment",
  "product",
  "other",
  "professional",
  "personal",
];

export const ClassificationEntrySchema = z.object({
  category: z.enum(KARTE_CATEGORIES),
  subcategory: z.string(),
  content: z.string(),
  original_quote: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ClassificationResultSchema = z.object({
  summary: z.string(),
  staffAdvice: z.string().optional(),
  entries: z.array(ClassificationEntrySchema),
});

export type ClassificationEntry = z.infer<typeof ClassificationEntrySchema>;
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

async function classifyWithGPT(
  transcript: string,
  businessType: string,
  customerHistory?: { summary: string; date: string }[]
): Promise<ClassificationResult> {
  const openai = getOpenAI();
  const prompt = customerHistory?.length
    ? getClassificationPromptWithHistory(businessType, customerHistory)
    : getClassificationPrompt(businessType);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("GPT returned empty response");
  }

  const parsed = JSON.parse(content);
  return ClassificationResultSchema.parse(parsed);
}

async function classifyWithGemini(
  transcript: string,
  businessType: string,
  customerHistory?: { summary: string; date: string }[]
): Promise<ClassificationResult> {
  const gemini = getGemini();
  const prompt = customerHistory?.length
    ? getClassificationPromptWithHistory(businessType, customerHistory)
    : getClassificationPrompt(businessType);

  const model = gemini.getGenerativeModel({
    model: "gemini-2.5-pro",
    systemInstruction: prompt,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const result = await model.generateContent(transcript);
  const content = result.response.text();

  const parsed = JSON.parse(content);
  return ClassificationResultSchema.parse(parsed);
}

export async function classifyTranscript(
  transcript: string,
  options?: {
    model?: "gpt" | "gemini";
    businessType?: string;
    customerHistory?: { summary: string; date: string }[];
  }
): Promise<ClassificationResult> {
  const model = options?.model ?? "gpt";
  const bizType = options?.businessType ?? "hair";
  const history = options?.customerHistory;

  switch (model) {
    case "gpt":
      return classifyWithGPT(transcript, bizType, history);
    case "gemini":
      return classifyWithGemini(transcript, bizType, history);
  }
}

function computeOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersection++;
    }
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

function mergeResults(
  resultA: ClassificationResult,
  resultB: ClassificationResult
): ClassificationResult {
  const merged: ClassificationEntry[] = [];
  const matchedB = new Set<number>();

  for (const entryA of resultA.entries) {
    let bestMatchIdx = -1;
    let bestOverlap = 0;

    for (let i = 0; i < resultB.entries.length; i++) {
      if (matchedB.has(i)) continue;
      const entryB = resultB.entries[i];
      if (entryA.category !== entryB.category) continue;

      const overlap = computeOverlap(entryA.content, entryB.content);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatchIdx = i;
      }
    }

    if (bestMatchIdx >= 0 && bestOverlap > 0.3) {
      matchedB.add(bestMatchIdx);
      const entryB = resultB.entries[bestMatchIdx];
      const higherConfidence = Math.max(entryA.confidence, entryB.confidence);
      const boosted = Math.min(higherConfidence * 1.1, 1.0);
      const preferred = entryA.content.length >= entryB.content.length ? entryA : entryB;
      merged.push({
        category: preferred.category,
        subcategory: preferred.subcategory,
        content: preferred.content,
        original_quote: preferred.original_quote,
        confidence: Math.round(boosted * 100) / 100,
      });
    } else {
      merged.push({
        ...entryA,
        confidence: Math.round(entryA.confidence * 0.8 * 100) / 100,
      });
    }
  }

  for (let i = 0; i < resultB.entries.length; i++) {
    if (matchedB.has(i)) continue;
    merged.push({
      ...resultB.entries[i],
      confidence: Math.round(resultB.entries[i].confidence * 0.8 * 100) / 100,
    });
  }

  const summary =
    resultA.summary.length >= resultB.summary.length
      ? resultA.summary
      : resultB.summary;

  const staffAdvice = resultA.staffAdvice || resultB.staffAdvice || undefined;

  return { summary, staffAdvice, entries: merged };
}

export async function classifyWithCrossValidation(
  transcript: string,
  businessType?: string
): Promise<ClassificationResult> {
  const bizType = businessType ?? "hair";
  const [gptResult, geminiResult] = await Promise.all([
    classifyWithGPT(transcript, bizType),
    classifyWithGemini(transcript, bizType),
  ]);

  return mergeResults(gptResult, geminiResult);
}
