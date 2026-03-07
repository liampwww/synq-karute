"use client";

import Link from "next/link";
import { Mic } from "lucide-react";

import { useRecordingStore } from "@/stores/recording-store";
import { useI18n } from "@/lib/i18n/context";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecordingBanner() {
  const { isRecording, elapsedSeconds } = useRecordingStore();
  const { t } = useI18n();

  if (!isRecording) return null;

  return (
    <Link
      href="/recording"
      className="flex items-center gap-3 bg-red-500/10 px-4 py-2 text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-400"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
      </span>
      <Mic className="size-4" />
      <span className="text-sm font-medium">{t("recording.recording")}</span>
      <span className="ml-auto font-mono text-sm tabular-nums">
        {formatTime(elapsedSeconds)}
      </span>
    </Link>
  );
}
