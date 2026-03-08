import OpenAI from "openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, InsightType } from "@/types/database";
import { getInsightPrompt } from "./insight-prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const InsightSchema = z.object({
  insight_type: z.enum([
    "next_treatment",
    "follow_up",
    "reactivation",
    "churn_risk",
    "unresolved_issue",
    "talking_point",
    "upsell",
    "photo_request",
    "plan_incomplete",
    "high_value",
  ]),
  title: z.string(),
  description: z.string(),
  priority_score: z.number().min(0).max(1),
  action_data: z.object({
    suggested_action: z.string(),
    evidence: z.string(),
  }),
});

export async function generateInsightsForCustomer(
  supabase: SupabaseClient<Database>,
  customerId: string,
  orgId: string,
  businessType: string
): Promise<number> {
  const { data: customer } = await supabase
    .from("customers")
    .select("name, name_kana, phone, email, notes, tags")
    .eq("id", customerId)
    .single();

  if (!customer) return 0;

  const { data: timelineEvents } = await supabase
    .from("timeline_events")
    .select("event_type, title, description, event_date, structured_data")
    .eq("customer_id", customerId)
    .order("event_date", { ascending: false })
    .limit(30);

  const { data: karuteRecords } = await supabase
    .from("karute_records")
    .select("ai_summary, created_at, business_type")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(10);

  const customerSummary = [
    `名前: ${customer.name}`,
    customer.phone ? `電話: ${customer.phone}` : null,
    customer.notes ? `メモ: ${customer.notes}` : null,
    customer.tags?.length ? `タグ: ${(customer.tags as string[]).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const timelineStr = (timelineEvents || [])
    .map(
      (e) =>
        `[${e.event_date}] ${e.event_type}: ${e.title}${e.description ? ` - ${e.description}` : ""}`
    )
    .join("\n");

  const karuteStr = (karuteRecords || [])
    .map((r) => `[${r.created_at}] ${r.ai_summary || ""}`)
    .filter((s) => s.length > 15)
    .join("\n");

  const fullTimeline = [timelineStr, karuteStr].filter(Boolean).join("\n\n");

  if (fullTimeline.length < 20) return 0;

  const prompt = getInsightPrompt(customerSummary, businessType, fullTimeline);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return 0;

  let insights: z.infer<typeof InsightSchema>[];
  try {
    const cleaned = content.replace(/^```json?\n?|\n?```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed) ? parsed : parsed.insights || [];
    insights = [];
    for (const item of arr) {
      const result = InsightSchema.safeParse(item);
      if (result.success) {
        insights.push(result.data);
      }
    }
  } catch {
    return 0;
  }

  if (insights.length === 0) return 0;

  await supabase
    .from("customer_ai_insights")
    .update({ status: "expired" })
    .eq("customer_id", customerId)
    .eq("status", "active");

  const insightsToInsert = insights.map((insight) => ({
    customer_id: customerId,
    org_id: orgId,
    insight_type: insight.insight_type as InsightType,
    title: insight.title,
    description: insight.description,
    action_data: insight.action_data,
    priority_score: insight.priority_score,
    status: "active" as const,
    expires_at: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  const { error } = await supabase
    .from("customer_ai_insights")
    .insert(insightsToInsert);

  if (error) return 0;

  return insights.length;
}
