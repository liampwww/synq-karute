import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  NormalizedRecord,
  FieldMapping,
  DedupStrategy,
} from "../types";
import { checkDuplicate } from "./dedup-engine";
import { writeTimelineEvents } from "./timeline-writer";

const CustomerSchema = z.object({
  name: z.string().min(1),
  name_kana: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

interface BatchWriteResult {
  imported: number;
  failed: number;
  skipped: number;
  duplicates: number;
  errors: Array<{ row: number; error: string }>;
  customerIdMap: Map<number, string>;
}

function applyTransform(
  value: unknown,
  transform: FieldMapping["transform"]
): unknown {
  if (value == null || value === "") return null;
  const str = String(value);

  switch (transform) {
    case "phone_normalize":
      return str.replace(/[-\s()（）\u3000]/g, "").replace(/^(\+81|0081)/, "0");

    case "date_parse": {
      const dateStr = str
        .replace(/年|月/g, "-")
        .replace(/日/g, "")
        .replace(/\//g, "-")
        .trim();
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    case "tags_split":
      return str
        .split(/[,、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

    case "name_split":
      return str.trim();

    case "kana_convert":
      return str.trim();

    case "none":
    case "custom":
    default:
      return str.trim();
  }
}

function applyMappings(
  record: NormalizedRecord,
  mappings: FieldMapping[]
): { customers: Record<string, unknown>; timeline: Record<string, unknown> } {
  const customers: Record<string, unknown> = {};
  const timeline: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (!mapping.confirmed || !mapping.targetField) continue;
    const rawValue = record._raw[mapping.sourceField];
    const transformed = applyTransform(rawValue, mapping.transform);

    if (mapping.targetTable === "customers") {
      if (mapping.targetField === "name" && mapping.transform === "name_split") {
        const existing = (customers.name as string) || "";
        customers.name = existing ? `${existing} ${transformed}` : transformed;
      } else {
        customers[mapping.targetField] = transformed;
      }
    } else if (mapping.targetTable === "timeline_events") {
      timeline[mapping.targetField] = transformed;
    }
  }

  return { customers, timeline };
}

export async function batchWriteRecords(
  supabase: SupabaseClient<Database>,
  records: NormalizedRecord[],
  mappings: FieldMapping[],
  orgId: string,
  jobId: string,
  sourceProvider: string,
  dedupStrategy: DedupStrategy
): Promise<BatchWriteResult> {
  const result: BatchWriteResult = {
    imported: 0,
    failed: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
    customerIdMap: new Map(),
  };

  const timelineRecords: NormalizedRecord[] = [];

  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    for (const record of batch) {
      try {
        const { customers, timeline } = applyMappings(record, mappings);

        const validation = CustomerSchema.safeParse(customers);
        if (!validation.success) {
          result.failed++;
          result.errors.push({
            row: record._sourceIndex,
            error: validation.error.issues.map((e: { message: string }) => e.message).join(", "),
          });

          await supabase.from("migration_records").insert({
            job_id: jobId,
            source_row_index: record._sourceIndex,
            target_table: "customers",
            status: "failed",
            source_data: record._raw as unknown as import("@/types/database").Json,
            error_message: validation.error.issues
              .map((e: { message: string }) => e.message)
              .join(", "),
          });
          continue;
        }

        const dedup = await checkDuplicate(
          supabase,
          orgId,
          customers,
          dedupStrategy
        );

        if (dedup.action === "skip") {
          result.skipped++;
          result.duplicates++;
          result.customerIdMap.set(
            record._sourceIndex,
            dedup.existingCustomerId!
          );

          await supabase.from("migration_records").insert({
            job_id: jobId,
            source_row_index: record._sourceIndex,
            target_table: "customers",
            target_id: dedup.existingCustomerId!,
            status: "duplicate",
            source_data: record._raw as unknown as import("@/types/database").Json,
          });

          if (Object.keys(timeline).length > 0 && timeline.event_date) {
            timelineRecords.push({
              ...record,
              _targetTable: "timeline_events",
              fields: {
                ...timeline,
                customer_id: dedup.existingCustomerId!,
              },
            });
          }
          continue;
        }

        let customerId: string;

        if (dedup.action === "merge" && dedup.existingCustomerId) {
          const updateData: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(validation.data)) {
            if (value != null && value !== "" && key !== "name") {
              updateData[key] = value;
            }
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("customers")
              .update(updateData)
              .eq("id", dedup.existingCustomerId);
          }

          customerId = dedup.existingCustomerId;
          result.duplicates++;
        } else {
          const insertData = {
            ...validation.data,
            org_id: orgId,
            email: validation.data.email || null,
          };

          const { data: newCustomer, error: insertError } = await supabase
            .from("customers")
            .insert(insertData)
            .select("id")
            .single();

          if (insertError || !newCustomer) {
            result.failed++;
            result.errors.push({
              row: record._sourceIndex,
              error: insertError?.message || "Insert failed",
            });

            await supabase.from("migration_records").insert({
              job_id: jobId,
              source_row_index: record._sourceIndex,
              target_table: "customers",
              status: "failed",
              source_data: record._raw as unknown as import("@/types/database").Json,
              error_message: insertError?.message || "Insert failed",
            });
            continue;
          }

          customerId = newCustomer.id;
        }

        result.customerIdMap.set(record._sourceIndex, customerId);
        result.imported++;

        await supabase.from("migration_records").insert({
          job_id: jobId,
          source_row_index: record._sourceIndex,
          target_table: "customers",
          target_id: customerId,
          status: "imported",
          source_data: record._raw as unknown as import("@/types/database").Json,
        });

        if (Object.keys(timeline).length > 0 && timeline.event_date) {
          timelineRecords.push({
            ...record,
            _targetTable: "timeline_events",
            fields: { ...timeline, customer_id: customerId },
          });
        }

        await supabase
          .from("migration_jobs")
          .update({
            imported_records: result.imported,
            failed_records: result.failed,
            skipped_records: result.skipped,
          })
          .eq("id", jobId);
      } catch (err) {
        result.failed++;
        result.errors.push({
          row: record._sourceIndex,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  if (timelineRecords.length > 0) {
    await writeTimelineEvents(
      supabase,
      timelineRecords,
      orgId,
      jobId,
      sourceProvider
    );
  }

  return result;
}
