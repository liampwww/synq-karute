import { createClient } from "@/lib/supabase/client";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

type Customer = Tables<"customers">;

export async function getCustomers(
  orgId: string,
  search?: string
): Promise<Customer[]> {
  const supabase = createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,name_kana.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as Customer;
}

export async function createCustomer(
  input: InsertTables<"customers">
): Promise<Customer> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  id: string,
  input: UpdateTables<"customers">
): Promise<Customer> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) throw error;
}
