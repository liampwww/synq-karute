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

    const body = await request.json();
    const url = body.url as string | null;
    const headers = (body.headers as Record<string, string>) || {};

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400 }
      );
    }

    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are allowed" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: {
        Accept: "application/json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ...headers,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API request failed: ${res.status} ${res.statusText}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Response too large (max 100MB)" },
        { status: 413 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    let fileName = "api-export";
    if (contentType.includes("json")) {
      fileName += ".json";
    } else if (
      contentType.includes("spreadsheet") ||
      contentType.includes("excel")
    ) {
      fileName += ".xlsx";
    } else {
      fileName += ".csv";
    }

    const analysis = await analyzeFile(buffer, fileName);

    const orgId = body.orgId as string | null;
    const staffId = body.staffId as string | null;
    if (!orgId || !staffId) {
      return NextResponse.json(
        { error: "orgId and staffId are required" },
        { status: 400 }
      );
    }

    const storagePath = `migrations/${orgId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(storagePath, buffer, {
        contentType: contentType.split(";")[0] || "application/octet-stream",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("migration_jobs")
      .insert({
        org_id: orgId,
        staff_id: staffId,
        source_type: analysis.detectedFormat,
        source_name: fileName,
        status: "analyzing",
        total_records: analysis.totalRows,
        field_mapping: analysis.suggestedMappings as unknown as Json,
        uploaded_file_path: storagePath,
        metadata: {
          encoding: analysis.encoding,
          columns: analysis.columns,
          source: "api",
          url: url,
        } as unknown as Json,
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
