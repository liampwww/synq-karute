import { createClient } from "@/lib/supabase/client";
import type { Tables, InsertTables } from "@/types/database";

type TimelineEvent = Tables<"timeline_events">;

export interface TimelineQueryOptions {
  eventTypes?: string[];
  sources?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getCustomerTimeline(
  customerId: string,
  options?: TimelineQueryOptions
): Promise<TimelineEvent[]> {
  const supabase = createClient();
  let query = supabase
    .from("timeline_events")
    .select("*")
    .eq("customer_id", customerId)
    .order("event_date", { ascending: false });

  if (options?.eventTypes?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("event_type", options.eventTypes as any);
  }
  if (options?.sources?.length) {
    query = query.in("source", options.sources);
  }
  if (options?.startDate) {
    query = query.gte("event_date", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("event_date", options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TimelineEvent[];
}

export async function createTimelineEvent(
  input: InsertTables<"timeline_events">
): Promise<TimelineEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as TimelineEvent;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
