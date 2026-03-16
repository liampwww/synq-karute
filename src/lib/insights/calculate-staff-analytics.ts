import type { SupabaseClient } from "@supabase/supabase-js";
import { subDays, startOfMonth, endOfMonth, format } from "date-fns";

interface StaffAnalyticsInput {
  staffId: string;
  orgId: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Recalculates staff analytics for a given period.
 * Aggregates: total sessions, avg confidence, top topics, repeat rate.
 * Optionally calls AI for coaching notes.
 */
export async function calculateStaffAnalytics(
  supabase: SupabaseClient,
  input: StaffAnalyticsInput
): Promise<void> {
  const { staffId, orgId, periodStart, periodEnd } = input;
  const startStr = format(periodStart, "yyyy-MM-dd");
  const endStr = format(periodEnd, "yyyy-MM-dd");

  const { data: karutes, error: karuteError } = await supabase
    .from("karute_records")
    .select("id, customer_id, ai_summary, created_at")
    .eq("staff_id", staffId)
    .eq("org_id", orgId)
    .gte("created_at", startStr)
    .lte("created_at", endStr + "T23:59:59.999Z");

  if (karuteError) throw karuteError;

  const karuteList = karutes ?? [];
  const totalSessions = karuteList.length;

  if (totalSessions === 0) {
    await upsertStaffAnalytics(supabase, {
      staffId,
      orgId,
      periodStart: startStr,
      periodEnd: endStr,
      total_sessions: 0,
      avg_confidence: 0,
      repeat_rate: 0,
      ai_coaching_notes: null,
    });
    return;
  }

  const karuteIds = karuteList.map((k) => k.id);
  const { data: entries, error: entriesError } = await supabase
    .from("karute_entries")
    .select("karute_id, category, subcategory, content, confidence")
    .in("karute_id", karuteIds);

  if (entriesError) throw entriesError;

  const entryList = entries ?? [];
  const entriesByCategory = new Map<
    string,
    { subcategory: string; content: string }[]
  >();
  for (const e of entryList) {
    const cat = e.category;
    const list = entriesByCategory.get(cat) ?? [];
    list.push({
      subcategory: e.subcategory ?? cat,
      content: (e.content ?? "").slice(0, 120),
    });
    entriesByCategory.set(cat, list);
  }
  const avgConfidence =
    entryList.length > 0
      ? entryList.reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
        entryList.length
      : 0;

  const topicCounts = new Map<string, number>();
  for (const e of entryList) {
    const key = e.subcategory || e.category;
    topicCounts.set(key, (topicCounts.get(key) ?? 0) + 1);
  }
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const customerSessionCounts = new Map<string, number>();
  for (const k of karuteList) {
    const c = k.customer_id;
    customerSessionCounts.set(c, (customerSessionCounts.get(c) ?? 0) + 1);
  }
  const repeatCustomers = [...customerSessionCounts.values()].filter(
    (n) => n > 1
  ).length;
  const uniqueCustomers = customerSessionCounts.size;
  const repeatRate =
    uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

  let aiCoachingNotes: string | null = null;
  if (totalSessions >= 3 && process.env.OPENAI_API_KEY) {
    try {
      aiCoachingNotes = await generateCoachingNotes(
        totalSessions,
        avgConfidence,
        topTopics,
        repeatRate,
        karuteList.map((k) => k.ai_summary).filter(Boolean) as string[],
        entriesByCategory
      );
    } catch {
      // Non-fatal: analytics still saved without coaching notes
    }
  }

  await upsertStaffAnalytics(supabase, {
    staffId,
    orgId,
    periodStart: startStr,
    periodEnd: endStr,
    total_sessions: totalSessions,
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    top_topics: topTopics,
    repeat_rate: Math.round(repeatRate * 100) / 100,
    ai_coaching_notes: aiCoachingNotes,
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  symptom: "症状・悩み",
  treatment: "施術内容",
  preference: "好み・希望",
  lifestyle: "生活スタイル",
  product: "商品・購入",
  next_appointment: "次回予約",
  professional: "職種関連",
  personal: "個人的",
  other: "その他",
};

function formatEntriesByCategory(
  entriesByCategory: Map<string, { subcategory: string; content: string }[]>
): string {
  const lines: string[] = [];
  for (const [cat, list] of entriesByCategory.entries()) {
    const label = CATEGORY_LABELS[cat] ?? cat;
    const samples = list
      .slice(0, 5)
      .map((e) => `  - ${e.subcategory}: ${e.content}`)
      .join("\n");
    if (samples) lines.push(`${label}:\n${samples}`);
  }
  return lines.join("\n\n") || "（データなし）";
}

async function generateCoachingNotes(
  totalSessions: number,
  avgConfidence: number,
  topTopics: { topic: string; count: number }[],
  repeatRate: number,
  summaries: string[],
  entriesByCategory: Map<string, { subcategory: string; content: string }[]>
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはサロン・接客業のスタッフコーチです。
スタッフのパフォーマンスデータとカルテ履歴を分析し、以下の3つのセクションを日本語で出力してください。
各セクションは簡潔に（2〜4文程度）、実践的で具体的に。箇条書き可。`,
        },
        {
          role: "user",
          content: `以下のスタッフデータを分析し、コーチングメモを生成してください。

【基本データ】
- 期間内セッション数: ${totalSessions}
- AI信頼度平均: ${(avgConfidence * 100).toFixed(1)}%
- リピート率: ${(repeatRate * 100).toFixed(1)}%
- よく出るトピック: ${topTopics.map((t) => t.topic).join(", ")}
- サマリー例: ${summaries.slice(0, 3).join(" | ") || "なし"}

【カルテエントリのサンプル（カテゴリ別）】
${formatEntriesByCategory(entriesByCategory)}

【出力形式】必ず以下の3セクションを出力してください。見出しは【】で囲むこと。

【コーチングアドバイス】
（パフォーマンスの良い点・改善点を1〜3文で具体的に）

【施術に役立つ情報】
（顧客がよく言及する症状・傾向・好みなど、施術で活かせるヒントを2〜3点）

【リピートにつながる会話の枠組み】
（挨拶→悩みの確認→施術→フィードバック→次回予約の提案など、このスタッフの傾向に合わせた具体的な流れやトーク例を1〜2文で）`,
        },
      ],
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error("OpenAI API error");
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  return content ?? "";
}

async function upsertStaffAnalytics(
  supabase: SupabaseClient,
  data: {
    staffId: string;
    orgId: string;
    periodStart: string;
    periodEnd: string;
    total_sessions: number;
    avg_confidence: number;
    top_topics?: unknown[];
    repeat_rate: number;
    ai_coaching_notes: string | null;
  }
) {
  const row = {
    staff_id: data.staffId,
    org_id: data.orgId,
    period_start: data.periodStart,
    period_end: data.periodEnd,
    total_sessions: data.total_sessions,
    avg_confidence: data.avg_confidence,
    top_topics: (data.top_topics ?? []) as never,
    repeat_rate: data.repeat_rate,
    ai_coaching_notes: data.ai_coaching_notes,
    calculated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("staff_analytics")
    .select("id")
    .eq("staff_id", data.staffId)
    .eq("period_start", data.periodStart)
    .eq("period_end", data.periodEnd)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("staff_analytics")
      .update(row)
      .eq("staff_id", data.staffId)
      .eq("period_start", data.periodStart)
      .eq("period_end", data.periodEnd);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("staff_analytics").insert(row);
    if (error) throw error;
  }
}

export function getDefaultPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const end = endOfMonth(now);
  const start = startOfMonth(subDays(now, 365));
  return { start, end };
}
