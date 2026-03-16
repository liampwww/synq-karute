import { NextRequest, NextResponse } from "next/server";

import { classifyTranscript } from "@/lib/ai/classifier";
import { createClient } from "@/lib/supabase/server";
import { calculateCustomerInsights } from "@/lib/insights/calculate-customer-insights";
import { sendOutboundWebhook } from "@/lib/webhooks/send-outbound";

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

    const { data: pastKarutes } = await supabase
      .from("karute_records")
      .select("ai_summary, created_at")
      .eq("customer_id", rec.customer_id)
      .order("created_at", { ascending: false })
      .limit(5);

    const customerHistory = (pastKarutes ?? [])
      .filter((k) => k.ai_summary)
      .map((k) => ({
        summary: k.ai_summary as string,
        date: new Date(k.created_at).toISOString().slice(0, 10),
      }));

    const classification = await classifyTranscript(transcript, {
      businessType: businessType ?? "hair",
      customerHistory,
    });

    const { data: karuteRecord, error: karuteError } = await supabase
      .from("karute_records")
      .insert({
        customer_id: rec.customer_id,
        recording_id: recordingId,
        staff_id: rec.staff_id,
        appointment_id: rec.appointment_id,
        org_id: rec.org_id,
        ai_summary: classification.summary,
        staff_advice: classification.staffAdvice ?? null,
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

    await supabase.from("timeline_events").insert({
      customer_id: rec.customer_id,
      org_id: rec.org_id,
      staff_id: rec.staff_id,
      event_type: "treatment" as const,
      source: "recording",
      source_ref: `recording:${recordingId}`,
      title: classification.summary?.slice(0, 80) || "施術記録",
      description: classification.summary || null,
      structured_data: {
        business_type: businessType ?? "hair",
        entry_count: classification.entries.length,
        recording_id: recordingId,
      },
      event_date: new Date().toISOString(),
      linked_record_id: kr.id,
      linked_record_type: "karute",
    });

    try {
      await calculateCustomerInsights(supabase, rec.customer_id, rec.org_id);
    } catch {
      // Non-fatal: insights recalc can fail without breaking the flow
    }

    try {
      await sendOutboundWebhook(supabase, rec.org_id, {
        type: "karute.created",
        payload: {
          karute_id: kr.id,
          customer_id: rec.customer_id,
          org_id: rec.org_id,
          staff_id: rec.staff_id,
          appointment_id: rec.appointment_id,
          summary: classification.summary ?? null,
          staff_advice: classification.staffAdvice ?? null,
          entry_count: classification.entries.length,
          created_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-fatal: webhook delivery can fail without breaking the flow
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
