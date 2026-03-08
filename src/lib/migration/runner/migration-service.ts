import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  FieldMapping,
  ImportOptions,
  AnalysisResult,
  NormalizedRecord,
} from "../types";
import { CsvParserConnector } from "../connectors/csv-parser";
import { ExcelParserConnector } from "../connectors/excel-parser";
import { batchWriteRecords } from "./batch-writer";

function getConnector(fileName: string) {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "csv":
    case "tsv":
      return new CsvParserConnector();
    case "xlsx":
    case "xls":
      return new ExcelParserConnector();
    default:
      return new CsvParserConnector();
  }
}

export async function analyzeFile(
  buffer: Buffer,
  fileName: string
): Promise<AnalysisResult> {
  const connector = getConnector(fileName);
  const result = await connector.parseFile!(buffer, fileName);
  const sample = result.records.slice(0, 10);
  const mappings = connector.suggestMappings(sample);
  const columns = (result.sourceMetadata.columns as string[]) || [];

  return {
    columns,
    sampleRows: sample.map((r) => r._raw),
    totalRows: result.totalCount,
    suggestedMappings: mappings,
    encoding: (result.sourceMetadata.encoding as string) || "utf-8",
    detectedFormat: connector.providerId,
  };
}

export async function runImport(
  supabase: SupabaseClient<Database>,
  buffer: Buffer,
  fileName: string,
  orgId: string,
  staffId: string,
  options: ImportOptions,
  jobId: string
): Promise<void> {
  await supabase
    .from("migration_jobs")
    .update({ status: "importing", started_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const connector = getConnector(fileName);
    const result = await connector.parseFile!(buffer, fileName);

    await supabase
      .from("migration_jobs")
      .update({ total_records: result.totalCount })
      .eq("id", jobId);

    const writeResult = await batchWriteRecords(
      supabase,
      result.records,
      options.mappings,
      orgId,
      jobId,
      options.sourceType,
      options.dedupStrategy
    );

    await supabase
      .from("migration_jobs")
      .update({
        status: "completed",
        imported_records: writeResult.imported,
        failed_records: writeResult.failed,
        skipped_records: writeResult.skipped,
        error_log: writeResult.errors.slice(0, 100),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (err) {
    await supabase
      .from("migration_jobs")
      .update({
        status: "failed",
        error_log: [
          {
            row: -1,
            error: err instanceof Error ? err.message : "Unknown error",
          },
        ],
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function rollbackJob(
  supabase: SupabaseClient<Database>,
  jobId: string
): Promise<{ deleted: number }> {
  await supabase
    .from("migration_jobs")
    .update({ status: "rolling_back" })
    .eq("id", jobId);

  const { data: records } = await supabase
    .from("migration_records")
    .select("target_table, target_id")
    .eq("job_id", jobId)
    .eq("status", "imported")
    .not("target_id", "is", null);

  let deleted = 0;

  if (records) {
    const customerIds = records
      .filter((r) => r.target_table === "customers" && r.target_id)
      .map((r) => r.target_id!);

    const timelineRefs = records
      .filter((r) => r.target_table === "timeline_events" && r.target_id)
      .map((r) => r.target_id!);

    if (timelineRefs.length > 0) {
      await supabase
        .from("timeline_events")
        .delete()
        .in("id", timelineRefs);
      deleted += timelineRefs.length;
    }

    if (customerIds.length > 0) {
      await supabase
        .from("customers")
        .delete()
        .in("id", customerIds);
      deleted += customerIds.length;
    }
  }

  await supabase
    .from("migration_jobs")
    .update({ status: "cancelled" })
    .eq("id", jobId);

  return { deleted };
}
