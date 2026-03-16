import type { SupabaseClient } from "@supabase/supabase-js";

interface KaruteWithEntries {
  id: string;
  ai_summary: string | null;
  created_at: string;
  entries: { category: string; subcategory: string | null; content: string }[];
}

/**
 * Recalculates customer insights from karute history.
 * Aggregates: total visits, top topics, recurring themes, trend analysis.
 */
export async function calculateCustomerInsights(
  supabase: SupabaseClient,
  customerId: string,
  orgId: string
): Promise<void> {
  const { data: karutes, error: karuteError } = await supabase
    .from("karute_records")
    .select("id, ai_summary, created_at")
    .eq("customer_id", customerId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (karuteError) throw karuteError;

  const karuteIds = (karutes ?? []).map((k) => k.id);
  if (karuteIds.length === 0) {
    await upsertCustomerInsights(supabase, customerId, orgId, {
      total_visits: 0,
      total_spend: 0,
      ltv: 0,
      top_pro_topics: [],
      top_personal_topics: [],
      recurring_themes: [],
      trend_analysis: {},
    });
    return;
  }

  const { data: entries, error: entriesError } = await supabase
    .from("karute_entries")
    .select("karute_id, category, subcategory, content")
    .in("karute_id", karuteIds);

  if (entriesError) throw entriesError;

  const entriesByKarute = new Map<string, { category: string; subcategory: string | null; content: string }[]>();
  for (const e of entries ?? []) {
    const list = entriesByKarute.get(e.karute_id) ?? [];
    list.push({
      category: e.category,
      subcategory: e.subcategory,
      content: e.content,
    });
    entriesByKarute.set(e.karute_id, list);
  }

  const karutesWithEntries: KaruteWithEntries[] = (karutes ?? []).map((k) => ({
    ...k,
    entries: entriesByKarute.get(k.id) ?? [],
  }));

  const totalVisits = karutesWithEntries.length;

  const proTopics = new Map<string, number>();
  const personalTopics = new Map<string, number>();
  const contentByCategory = new Map<string, string[]>();

  for (const k of karutesWithEntries) {
    for (const e of k.entries) {
      const key = e.subcategory || e.category;
      if (e.category === "professional" || ["symptom", "treatment", "preference", "product", "next_appointment"].includes(e.category)) {
        proTopics.set(key, (proTopics.get(key) ?? 0) + 1);
      } else {
        personalTopics.set(key, (personalTopics.get(key) ?? 0) + 1);
      }
      const list = contentByCategory.get(key) ?? [];
      list.push(e.content);
      contentByCategory.set(key, list);
    }
  }

  const topPro = Array.from(proTopics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const topPersonal = Array.from(personalTopics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const recurringThemes = Array.from(contentByCategory.entries())
    .filter(([, contents]) => contents.length >= 2)
    .map(([theme, contents]) => ({
      theme,
      frequency: contents.length,
      sample: contents[0],
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  const recentKarutes = karutesWithEntries.slice(0, 5);
  const olderKarutes = karutesWithEntries.slice(5, 10);
  const recentTopics = new Set<string>();
  const olderTopics = new Set<string>();
  for (const k of recentKarutes) {
    for (const e of k.entries) {
      recentTopics.add(e.subcategory || e.category);
    }
  }
  for (const k of olderKarutes) {
    for (const e of k.entries) {
      olderTopics.add(e.subcategory || e.category);
    }
  }
  const emerging = [...recentTopics].filter((t) => !olderTopics.has(t));
  const declining = [...olderTopics].filter((t) => !recentTopics.has(t));

  const trendAnalysis = {
    emerging_topics: emerging.slice(0, 5),
    declining_topics: declining.slice(0, 5),
  };

  await upsertCustomerInsights(supabase, customerId, orgId, {
    total_visits: totalVisits,
    total_spend: 0,
    ltv: 0,
    top_pro_topics: topPro,
    top_personal_topics: topPersonal,
    recurring_themes: recurringThemes,
    trend_analysis: trendAnalysis,
  });
}

async function upsertCustomerInsights(
  supabase: SupabaseClient,
  customerId: string,
  orgId: string,
  data: {
    total_visits: number;
    total_spend: number;
    ltv: number;
    top_pro_topics: unknown[];
    top_personal_topics: unknown[];
    recurring_themes: unknown[];
    trend_analysis: Record<string, unknown>;
  }
) {
  const row = {
    customer_id: customerId,
    org_id: orgId,
    total_visits: data.total_visits,
    total_spend: data.total_spend,
    ltv: data.ltv,
    top_pro_topics: data.top_pro_topics as never,
    top_personal_topics: data.top_personal_topics as never,
    recurring_themes: data.recurring_themes as never,
    trend_analysis: data.trend_analysis as never,
    last_calculated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("customer_insights")
    .select("id")
    .eq("customer_id", customerId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("customer_insights")
      .update(row)
      .eq("customer_id", customerId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("customer_insights").insert(row);
    if (error) throw error;
  }
}
