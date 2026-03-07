import { startOfDay, addDays } from "date-fns";

import { createClient } from "@/lib/supabase/client";
import type { Tables, InsertTables, UpdateTables } from "@/types/database";

export type AppointmentWithRelations = Tables<"appointments"> & {
  customer: Pick<Tables<"customers">, "id" | "name" | "name_kana"> | null;
  staff: Pick<Tables<"staff">, "id" | "name"> | null;
};

const APPOINTMENT_SELECT =
  "*, customer:customers(id, name, name_kana), staff:staff(id, name)" as const;

export async function getAppointments(
  orgId: string,
  date: Date
): Promise<AppointmentWithRelations[]> {
  const supabase = createClient();
  const dayStart = startOfDay(date).toISOString();
  const nextDayStart = startOfDay(addDays(date, 1)).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("org_id", orgId)
    .gte("start_time", dayStart)
    .lt("start_time", nextDayStart)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data as AppointmentWithRelations[];
}

export async function getAppointmentsByDateRange(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<AppointmentWithRelations[]> {
  const supabase = createClient();
  const rangeStart = startOfDay(startDate).toISOString();
  const rangeEnd = startOfDay(addDays(endDate, 1)).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("org_id", orgId)
    .gte("start_time", rangeStart)
    .lt("start_time", rangeEnd)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data as AppointmentWithRelations[];
}

export async function createAppointment(
  data: InsertTables<"appointments">
): Promise<Tables<"appointments">> {
  const supabase = createClient();

  const { data: created, error } = await supabase
    .from("appointments")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return created as Tables<"appointments">;
}

export async function updateAppointment(
  id: string,
  data: UpdateTables<"appointments">
): Promise<Tables<"appointments">> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from("appointments")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as Tables<"appointments">;
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getCustomers(
  orgId: string
): Promise<Pick<Tables<"customers">, "id" | "name" | "name_kana">[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, name_kana")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getStaff(
  orgId: string
): Promise<Pick<Tables<"staff">, "id" | "name">[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("staff")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}
