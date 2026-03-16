import { createClient } from "@/lib/supabase/client";
import type { Tables, KarteCategory, KarteStatus } from "@/types/database";

export interface KaruteRecordSummary {
  id: string;
  customer_id: string;
  recording_id: string | null;
  staff_id: string;
  appointment_id: string | null;
  org_id: string;
  ai_summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    name_kana: string | null;
  };
  karute_entries: Array<{
    id: string;
    category: string;
  }>;
}

export interface KaruteEntry {
  id: string;
  karute_id: string;
  category: string;
  subcategory: string | null;
  content: string;
  original_quote: string | null;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface KaruteRecordDetail {
  id: string;
  customer_id: string;
  recording_id: string | null;
  staff_id: string;
  appointment_id: string | null;
  org_id: string;
  business_type: string;
  ai_summary: string | null;
  staff_advice: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    name_kana: string | null;
  };
  karute_entries: KaruteEntry[];
}

const KARUTE_LIST_SELECT =
  "*, customer:customers(id, name, name_kana), karute_entries(id, category)" as const;
const KARUTE_DETAIL_SELECT =
  "*, customer:customers(id, name, name_kana), karute_entries(*)" as const;

export async function getKaruteRecords(
  orgId: string,
  options?: { customerId?: string; limit?: number }
): Promise<KaruteRecordSummary[]> {
  const supabase = createClient();

  let query = supabase
    .from("karute_records")
    .select(KARUTE_LIST_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (options?.customerId) {
    query = query.eq("customer_id", options.customerId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as KaruteRecordSummary[];
}

export async function getKaruteRecord(
  id: string
): Promise<KaruteRecordDetail | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("karute_records")
    .select(KARUTE_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as KaruteRecordDetail;
}

export async function updateKaruteRecord(
  id: string,
  data: { ai_summary?: string; status?: KarteStatus }
): Promise<Tables<"karute_records">> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from("karute_records")
    .update(data as Record<string, unknown>)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as Tables<"karute_records">;
}

export async function updateKaruteEntry(
  id: string,
  data: { content?: string; category?: KarteCategory }
): Promise<Tables<"karute_entries">> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from("karute_entries")
    .update(data as Record<string, unknown>)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as Tables<"karute_entries">;
}

export async function deleteKaruteEntry(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("karute_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function addKaruteEntry(data: {
  karute_id: string;
  category: KarteCategory;
  content: string;
  confidence?: number;
}): Promise<Tables<"karute_entries">> {
  const supabase = createClient();

  const insertData: {
    karute_id: string;
    category: KarteCategory;
    content: string;
    confidence?: number;
  } = {
    karute_id: data.karute_id,
    category: data.category,
    content: data.content,
    confidence: data.confidence,
  };

  const { data: created, error } = await supabase
    .from("karute_entries")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return created as Tables<"karute_entries">;
}

export async function exportKaruteAsText(karuteId: string): Promise<string> {
  const karute = await getKaruteRecord(karuteId);
  if (!karute) throw new Error("Karute record not found");

  const categoryLabels: Record<string, string> = {
    symptom: "症状 (Symptoms)",
    treatment: "治療 (Treatment)",
    preference: "希望・要望 (Preferences)",
    lifestyle: "生活習慣 (Lifestyle)",
    next_appointment: "次回予約 (Next Appointment)",
    product: "商品 (Products)",
    other: "その他 (Other)",
  };

  const statusLabels: Record<string, string> = {
    draft: "下書き",
    review: "レビュー中",
    approved: "承認済み",
  };

  const lines: string[] = [];

  lines.push(`カルテ - ${karute.customer.name}`);
  lines.push(
    `日付: ${new Date(karute.created_at).toLocaleDateString("ja-JP")}`
  );
  lines.push(`ステータス: ${statusLabels[karute.status] ?? karute.status}`);
  lines.push("");

  if (karute.ai_summary) {
    lines.push("═══ AI要約 ═══");
    lines.push(karute.ai_summary);
    lines.push("");
  }

  const grouped = new Map<string, KaruteEntry[]>();
  for (const entry of karute.karute_entries) {
    const existing = grouped.get(entry.category) ?? [];
    existing.push(entry);
    grouped.set(entry.category, existing);
  }

  const categoryOrder = [
    "symptom",
    "treatment",
    "preference",
    "lifestyle",
    "next_appointment",
    "product",
    "other",
  ];

  for (const category of categoryOrder) {
    const entries = grouped.get(category);
    if (!entries?.length) continue;

    lines.push(`═══ ${categoryLabels[category] ?? category} ═══`);
    for (const entry of entries) {
      lines.push(`• ${entry.content}`);
      if (entry.original_quote) {
        lines.push(`  「${entry.original_quote}」`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
