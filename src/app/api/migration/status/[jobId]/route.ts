import { NextRequest, NextResponse } from "next/server";

import type { Tables } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: job, error } = await supabase
      .from("migration_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: "Migration job not found" },
        { status: 404 }
      );
    }

    const typedJob = job as unknown as Tables<"migration_jobs">;

    return NextResponse.json({
      jobId: typedJob.id,
      status: typedJob.status,
      totalRecords: typedJob.total_records,
      importedRecords: typedJob.imported_records,
      failedRecords: typedJob.failed_records,
      skippedRecords: typedJob.skipped_records,
      errorLog: typedJob.error_log,
      startedAt: typedJob.started_at,
      completedAt: typedJob.completed_at,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
