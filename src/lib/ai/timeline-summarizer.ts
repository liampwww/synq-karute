import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getTimelineSummaryPrompt } from "./insight-prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTimelineSummary(
  supabase: SupabaseClient<Database>,
  customerId: string,
  businessType: string
): Promise<string | null> {
  const { data: customer } = await supabase
    .from("customers")
    .select("name, profile")
    .eq("id", customerId)
    .single();

  if (!customer) return null;

  const { data: timelineEvents } = await supabase
    .from("timeline_events")
    .select("event_type, title, description, event_date, structured_data")
    .eq("customer_id", customerId)
    .order("event_date", { ascending: true })
    .limit(50);

  const { data: karuteRecords } = await supabase
    .from("karute_records")
    .select("ai_summary, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true })
    .limit(20);

  const timelineStr = (timelineEvents || [])
    .map(
      (e) =>
        `[${e.event_date}] ${e.event_type}: ${e.title}${e.description ? ` -- ${e.description}` : ""}`
    )
    .join("\n");

  const karuteStr = (karuteRecords || [])
    .map((r) => `[${r.created_at}] カルテ: ${r.ai_summary || ""}`)
    .filter((s) => s.length > 15)
    .join("\n");

  const allData = [timelineStr, karuteStr].filter(Boolean).join("\n\n");

  if (allData.length < 30) return null;

  const prompt = getTimelineSummaryPrompt(
    businessType,
    allData,
    customer.name
  );

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  const summary = response.choices[0]?.message?.content?.trim();
  if (!summary) return null;

  const existingProfile =
    (customer.profile as Record<string, unknown>) || {};
  await supabase
    .from("customers")
    .update({
      profile: {
        ...existingProfile,
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      },
    })
    .eq("id", customerId);

  return summary;
}
