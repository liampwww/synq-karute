import { NextRequest, NextResponse } from "next/server";

import type { Json } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { analyzeFile } from "@/lib/migration/runner/migration-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("orgId") as string | null;
    const staffId = formData.get("staffId") as string | null;

    if (!file || !orgId || !staffId) {
      return NextResponse.json(
        { error: "file, orgId, and staffId are required" },
        { status: 400 }
      );
    }

    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 100MB)" },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storagePath = `${orgId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("migrations")
      .upload(storagePath, buffer, { contentType: "application/octet-stream" });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const analysis = await analyzeFile(buffer, file.name);

    const { data: job, error: jobError } = await supabase
      .from("migration_jobs")
      .insert({
        org_id: orgId,
        staff_id: staffId,
        source_type: analysis.detectedFormat,
        source_name: file.name,
        status: "analyzing",
        total_records: analysis.totalRows,
        field_mapping: analysis.suggestedMappings as unknown as Json,
        uploaded_file_path: storagePath,
        metadata: { encoding: analysis.encoding, columns: analysis.columns } as unknown as Json,
      })
      .select()
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Failed to create migration job" },
        { status: 500 }
      );
    }

    const typedJob = job as unknown as { id: string };
    return NextResponse.json({
      jobId: typedJob.id,
      analysis,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
