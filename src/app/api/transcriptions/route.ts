import { NextRequest, NextResponse } from "next/server";

import { transcribeAudio } from "@/lib/ai/whisper";
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

    const { data: recording, error: recordingError } = await supabase
      .from("recording_sessions")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    const rec = recording as { audio_storage_path: string | null };

    if (!rec.audio_storage_path) {
      return NextResponse.json(
        { error: "No audio file associated with this recording" },
        { status: 400 }
      );
    }

    const { data: fileData, error: storageError } = await supabase.storage
      .from("recordings")
      .download(rec.audio_storage_path);

    if (storageError || !fileData) {
      return NextResponse.json(
        { error: "Failed to download audio file" },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const transcription = await transcribeAudio(audioBuffer, "ja", businessType);

    const segmentsToInsert = transcription.segments.map((seg, index) => ({
      recording_id: recordingId,
      segment_index: index,
      content: seg.text,
      start_ms: Math.round(seg.start * 1000),
      end_ms: Math.round(seg.end * 1000),
      language: transcription.language,
      speaker_label: seg.speaker ?? null,
    }));

    if (segmentsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("transcription_segments")
        .insert(segmentsToInsert);

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to save transcription segments" },
          { status: 500 }
        );
      }
    }

    await supabase
      .from("recording_sessions")
      .update({ status: "completed" })
      .eq("id", recordingId);

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments,
      language: transcription.language,
      duration: transcription.duration,
      segmentCount: segmentsToInsert.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
