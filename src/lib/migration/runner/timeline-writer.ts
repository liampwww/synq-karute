import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database";
import type { NormalizedRecord } from "../types";

export async function writeTimelineEvents(
  supabase: SupabaseClient<Database>,
  records: NormalizedRecord[],
  orgId: string,
  jobId: string,
  sourceProvider: string
): Promise<{ inserted: number; failed: number }> {
  const timelineRecords = records.filter(
    (r) => r._targetTable === "timeline_events"
  );
  if (timelineRecords.length === 0) {
    return { inserted: 0, failed: 0 };
  }

  let inserted = 0;
  let failed = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < timelineRecords.length; i += BATCH_SIZE) {
    const batch = timelineRecords.slice(i, i + BATCH_SIZE);
    const rows = batch
      .map((record) => {
        const customerId = record.fields.customer_id as string | undefined;
        if (!customerId) return null;

        return {
          customer_id: customerId,
          org_id: orgId,
          event_type: "visit" as const,
          source: `import:${sourceProvider}`,
          source_ref: `job:${jobId}:row:${record._sourceIndex}`,
          title: (record.fields.title as string) || "来店",
          description: (record.fields.notes as string) || null,
      structured_data: {
        service_type: (record.fields.service_type as string) || null,
        staff_name: (record.fields.staff_name as string) || null,
        duration_minutes: (record.fields.duration as number) || null,
        original_system: sourceProvider,
        amount: (record.fields.amount as string) || null,
      } as unknown as Json,
          event_date:
            (record.fields.event_date as string) || new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      const { error } = await supabase
        .from("timeline_events")
        .insert(rows as NonNullable<(typeof rows)[0]>[]);

      if (error) {
        failed += rows.length;
      } else {
        inserted += rows.length;
      }
    }
  }

  return { inserted, failed };
}
