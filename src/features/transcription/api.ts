import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type TranscriptionResponse = {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  language: string;
  duration: number;
  segmentCount: number;
};

type ClassificationResponse = {
  karuteId: string;
  summary: string;
  entries: Array<{
    category: string;
    subcategory: string;
    content: string;
    original_quote: string;
    confidence: number;
  }>;
  entryCount: number;
};

export async function startTranscription(
  recordingId: string,
  businessType?: string
): Promise<TranscriptionResponse> {
  const response = await fetch("/api/transcriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordingId, businessType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to start transcription");
  }

  return response.json();
}

export async function startClassification(
  recordingId: string,
  businessType?: string
): Promise<ClassificationResponse> {
  const response = await fetch("/api/classifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordingId, businessType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to start classification");
  }

  return response.json();
}

export async function getTranscriptionSegments(
  recordingId: string
): Promise<Tables<"transcription_segments">[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transcription_segments")
    .select("*")
    .eq("recording_id", recordingId)
    .order("segment_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Tables<"transcription_segments">[];
}
