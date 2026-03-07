import { NextRequest } from "next/server";

import { getOpenAI } from "@/lib/ai/openai";
import { ASK_AI_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

interface AskAiRequestBody {
  question: string;
  customerId?: string;
  orgId: string;
}

interface KaruteRecordWithCustomer {
  id: string;
  ai_summary: string | null;
  created_at: string;
  customer_id: string;
  customers: { name: string; name_kana: string | null } | null;
}

interface KaruteEntry {
  category: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as AskAiRequestBody;
    const { question, customerId, orgId } = body;

    if (!question?.trim()) {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "orgId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let contextText = "";

    if (customerId) {
      const { data: customer } = await supabase
        .from("customers")
        .select("name, name_kana, notes, tags")
        .eq("id", customerId)
        .single();

      if (customer) {
        const c = customer as {
          name: string;
          name_kana: string | null;
          notes: string | null;
          tags: string[];
        };
        contextText += `【顧客情報】\n`;
        contextText += `氏名: ${c.name}`;
        if (c.name_kana) contextText += ` (${c.name_kana})`;
        contextText += "\n";
        if (c.tags?.length > 0) contextText += `タグ: ${c.tags.join(", ")}\n`;
        if (c.notes) contextText += `メモ: ${c.notes}\n`;
        contextText += "\n";
      }

      const { data: records } = await supabase
        .from("karute_records")
        .select("id, ai_summary, created_at")
        .eq("customer_id", customerId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (records && records.length > 0) {
        contextText += `【カルテ記録】\n`;
        for (const record of records as { id: string; ai_summary: string | null; created_at: string }[]) {
          const date = new Date(record.created_at).toLocaleDateString("ja-JP");
          contextText += `\n--- ${date} ---\n`;
          if (record.ai_summary) contextText += `要約: ${record.ai_summary}\n`;

          const { data: entries } = await supabase
            .from("karute_entries")
            .select("category, content")
            .eq("karute_id", record.id);

          if (entries && entries.length > 0) {
            for (const entry of entries as KaruteEntry[]) {
              contextText += `[${entry.category}] ${entry.content}\n`;
            }
          }
        }
      }
    } else {
      const { data: records } = await supabase
        .from("karute_records")
        .select("id, ai_summary, created_at, customer_id, customers(name, name_kana)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (records && records.length > 0) {
        contextText += `【最近のカルテ記録】\n`;
        for (const record of records as unknown as KaruteRecordWithCustomer[]) {
          const date = new Date(record.created_at).toLocaleDateString("ja-JP");
          const customerName = record.customers?.name ?? "不明";
          contextText += `\n--- ${customerName} (${date}) ---\n`;
          if (record.ai_summary) contextText += `要約: ${record.ai_summary}\n`;

          const { data: entries } = await supabase
            .from("karute_entries")
            .select("category, content")
            .eq("karute_id", record.id);

          if (entries && entries.length > 0) {
            for (const entry of entries as KaruteEntry[]) {
              contextText += `[${entry.category}] ${entry.content}\n`;
            }
          }
        }
      }
    }

    const openai = getOpenAI();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: ASK_AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: contextText
            ? `以下のカルテ情報を参考に質問に回答してください。\n\n${contextText}\n\n質問: ${question}`
            : `質問: ${question}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
