import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { DedupStrategy } from "../types";

export interface DedupResult {
  existingCustomerId: string | null;
  action: "create" | "skip" | "merge";
}

export async function checkDuplicate(
  supabase: SupabaseClient<Database>,
  orgId: string,
  fields: Record<string, unknown>,
  strategy: DedupStrategy
): Promise<DedupResult> {
  if (strategy === "create_new") {
    return { existingCustomerId: null, action: "create" };
  }

  const phone = fields.phone as string | undefined;
  const email = fields.email as string | undefined;
  const name = fields.name as string | undefined;

  let existingId: string | null = null;

  if (phone) {
    const normalized = normalizePhone(phone);
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .eq("phone", normalized)
      .limit(1)
      .single();

    if (data) existingId = data.id;
  }

  if (!existingId && email) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", email.toLowerCase().trim())
      .limit(1)
      .single();

    if (data) existingId = data.id;
  }

  if (!existingId && name) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", name.trim())
      .limit(1)
      .single();

    if (data) existingId = data.id;
  }

  if (!existingId) {
    return { existingCustomerId: null, action: "create" };
  }

  switch (strategy) {
    case "skip":
      return { existingCustomerId: existingId, action: "skip" };
    case "merge":
      return { existingCustomerId: existingId, action: "merge" };
    default:
      return { existingCustomerId: null, action: "create" };
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[-\s()（）\u3000]/g, "").replace(/^(\+81|0081)/, "0");
}
