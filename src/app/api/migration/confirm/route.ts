import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database, Json, Tables } from "@/types/database";
import type { FieldMapping, DedupStrategy } from "@/lib/migration/types";
import { runImport } from "@/lib/migration/runner/migration-service";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // ignore
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobId,
      mappings,
      dedupStrategy,
    }: {
      jobId: string;
      mappings: FieldMapping[];
      dedupStrategy: DedupStrategy;
    } = body;

    if (!jobId || !mappings) {
      return NextResponse.json(
        { error: "jobId and mappings are required" },
        { status: 400 }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("migration_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Migration job not found" },
        { status: 404 }
      );
    }

    const typedJob = job as unknown as Tables<"migration_jobs">;

    await supabase
      .from("migration_jobs")
      .update({
        status: "mapping",
        field_mapping: mappings as unknown as Json,
      })
      .eq("id", jobId);

    const { data: fileData } = await supabase.storage
      .from("migrations")
      .download(typedJob.uploaded_file_path!);

    if (!fileData) {
      return NextResponse.json(
        { error: "Could not download source file" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    runImport(
      supabase,
      buffer,
      typedJob.source_name || "import.csv",
      typedJob.org_id,
      typedJob.staff_id,
      {
        mappings,
        dedupStrategy: dedupStrategy || "skip",
        sourceType: typedJob.source_type,
        sourceName: typedJob.source_name || "",
      },
      jobId
    ).catch(() => {
      // background import - errors handled inside runImport
    });

    return NextResponse.json({ jobId, status: "importing" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
