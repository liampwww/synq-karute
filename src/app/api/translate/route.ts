import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/openai";

const MAX_LENGTH = 8000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text || text.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: "Invalid or too long text" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following Japanese text to natural English. 
Preserve the tone, structure, and meaning. Return ONLY the translation, no explanations or quotes.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: Math.min(4096, Math.ceil(text.length * 2)),
    });

    const translated =
      response.choices[0]?.message?.content?.trim() ?? text;
    return NextResponse.json({ translated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
