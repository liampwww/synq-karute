import { toFile } from "openai";

import { getOpenAI } from "@/lib/ai/openai";
import { getTranscriptionPrompt } from "@/lib/ai/prompts";

export type TranscriptionSegment = {
  text: string;
  start: number;
  end: number;
  speaker?: string;
};

export type TranscriptionResult = {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
};

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string = "ja",
  businessType?: string
): Promise<TranscriptionResult> {
  const openai = getOpenAI();

  const file = await toFile(audioBuffer, "audio.webm", {
    type: "audio/webm",
  });

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
    prompt: getTranscriptionPrompt(businessType ?? "hair"),
  });

  const segments: TranscriptionSegment[] = (response.segments ?? []).map(
    (seg) => ({
      text: seg.text,
      start: seg.start,
      end: seg.end,
    })
  );

  return {
    text: response.text,
    segments,
    language: response.language,
    duration: response.duration,
  };
}

export function formatTranscription(result: TranscriptionResult): string {
  return result.segments
    .map((seg) => {
      const startMin = Math.floor(seg.start / 60);
      const startSec = Math.floor(seg.start % 60);
      const timestamp = `${String(startMin).padStart(2, "0")}:${String(startSec).padStart(2, "0")}`;
      const label = seg.speaker ? `[${seg.speaker}]` : "";
      return `[${timestamp}]${label} ${seg.text}`;
    })
    .join("\n");
}
