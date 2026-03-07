import { NextRequest, NextResponse } from "next/server";

import { classifyTranscript } from "@/lib/ai/classifier";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordingId, businessType } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: "recordingId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: segments, error: segmentsError } = await supabase
      .from("transcription_segments")
      .select("*")
      .eq("recording_id", recordingId)
      .order("segment_index", { ascending: true });

    if (segmentsError) {
      return NextResponse.json(
        { error: "Failed to fetch transcription segments" },
        { status: 500 }
      );
    }

    if (!segments || segments.length === 0) {
      return NextResponse.json(
        { error: "No transcription segments found for this recording" },
        { status: 404 }
      );
    }

    const typedSegments = segments as { content: string }[];
    const transcript = typedSegments.map((seg) => seg.content).join("\n");

    const classification = await classifyTranscript(transcript, {
      businessType: businessType ?? "hair",
    });

    const { data: recording, error: recordingError } = await supabase
      .from("recording_sessions")
      .select("customer_id, staff_id, org_id, appointment_id")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording session not found" },
        { status: 404 }
      );
    }

    const rec = recording as {
      customer_id: string;
      staff_id: string;
      org_id: string;
      appointment_id: string | null;
    };

    const { data: karuteRecord, error: karuteError } = await supabase
      .from("karute_records")
      .insert({
        customer_id: rec.customer_id,
        recording_id: recordingId,
        staff_id: rec.staff_id,
        appointment_id: rec.appointment_id,
        org_id: rec.org_id,
        ai_summary: classification.summary,
        business_type: businessType ?? "hair",
        status: "draft",
      })
      .select()
      .single();

    const kr = karuteRecord as { id: string } | null;

    if (karuteError || !kr) {
      return NextResponse.json(
        { error: "Failed to create karute record" },
        { status: 500 }
      );
    }

    const entriesToInsert = classification.entries.map((entry) => ({
      karute_id: kr.id,
      category: entry.category,
      subcategory: entry.subcategory,
      content: entry.content,
      original_quote: entry.original_quote,
      confidence: entry.confidence,
    }));

    if (entriesToInsert.length > 0) {
      const { error: entriesError } = await supabase
        .from("karute_entries")
        .insert(entriesToInsert);

      if (entriesError) {
        return NextResponse.json(
          { error: "Failed to create karute entries" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      karuteId: kr.id,
      summary: classification.summary,
      entries: classification.entries,
      entryCount: classification.entries.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
