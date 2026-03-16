"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, Square, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/lib/audio/recorder";
import { useRecordingStore } from "@/stores/recording-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  createRecordingSession,
  updateRecordingSession,
  uploadAudioFile,
} from "@/features/recording/api";
import {
  startTranscription,
  startClassification,
} from "@/features/transcription/api";
import { WaveformVisualizer } from "./waveform-visualizer";

interface RecordingControlsProps {
  customerId: string;
  customerName: string;
  appointmentId?: string;
}

export function RecordingControls({
  customerId,
  customerName,
  appointmentId,
}: RecordingControlsProps) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);

  const {
    isRecording,
    isPaused,
    elapsedSeconds,
    audioLevel,
    startSession,
    endSession,
    setRecording,
    setPaused,
    setElapsedSeconds,
    setAudioLevel,
  } = useRecordingStore();

  const staff = useAuthStore((s) => s.staff);
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    setBrowserSupported(AudioRecorder.isSupported());
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(useRecordingStore.getState().elapsedSeconds + 1);
    }, 1000);
  }, [setElapsedSeconds]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {});
        recorderRef.current = null;
      }
    };
  }, [stopTimer]);

  const handleStart = useCallback(async () => {
    if (!staff || !organization) {
      toast.error("スタッフ情報が見つかりません");
      return;
    }

    if (!AudioRecorder.isSupported()) {
      toast.error("このブラウザは録音に対応していません");
      return;
    }

    try {
      const session = await createRecordingSession({
        staff_id: staff.id,
        customer_id: customerId,
        org_id: organization.id,
        appointment_id: appointmentId,
      });

      const recorder = new AudioRecorder();
      recorder.setCallbacks({
        onAudioLevel: (level) => setAudioLevel(level),
        onError: (error) => {
          toast.error(`録音エラー: ${error.message}`);
          stopTimer();
          endSession();
        },
      });

      await recorder.start();

      recorderRef.current = recorder;

      startSession({
        recordingId: session.id,
        customerId,
        appointmentId: appointmentId ?? null,
      });

      startTimer();
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("マイクへのアクセスが拒否されました。設定を確認してください。");
      } else {
        toast.error("録音を開始できませんでした");
      }
    }
  }, [
    staff,
    organization,
    customerId,
    appointmentId,
    setAudioLevel,
    startSession,
    startTimer,
    stopTimer,
    endSession,
  ]);

  const handlePause = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.pause();
      setPaused(true);
      stopTimer();
      setAudioLevel(0);
    }
  }, [setPaused, stopTimer, setAudioLevel]);

  const handleResume = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.resume();
      setPaused(false);
      startTimer();
    }
  }, [setPaused, startTimer]);

  const handleStop = useCallback(async () => {
    if (!recorderRef.current) return;

    const recordingId = useRecordingStore.getState().currentRecordingId;
    if (!recordingId || !organization) return;

    stopTimer();
    setIsProcessing(true);
    setRecording(false);
    setPaused(false);
    setAudioLevel(0);

    try {
      const blob = await recorderRef.current.stop();
      recorderRef.current = null;

      const seconds = useRecordingStore.getState().elapsedSeconds;

      const storagePath = await uploadAudioFile(
        recordingId,
        blob,
        organization.id
      );

      await updateRecordingSession(recordingId, {
        status: "completed",
        duration_seconds: seconds,
        ended_at: new Date().toISOString(),
        audio_storage_path: storagePath,
      });

      toast.success("録音を保存しました");

      const businessType = organization?.type ?? "hair";

      toast("文字起こし中...", { id: "pipeline" });
      await startTranscription(recordingId, businessType);

      toast("AI分類中...", { id: "pipeline" });
      const result = await startClassification(recordingId, businessType);

      toast.success(
        `カルテを作成しました（${result.entryCount}件の情報を抽出）`,
        { id: "pipeline" }
      );
    } catch {
      toast.error("録音の保存に失敗しました");
      if (recordingId) {
        await updateRecordingSession(recordingId, {
          status: "failed",
        }).catch(() => {});
      }
    } finally {
      endSession();
      setIsProcessing(false);
    }
  }, [
    organization,
    stopTimer,
    setRecording,
    setPaused,
    setAudioLevel,
    endSession,
  ]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!browserSupported) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">録音非対応</p>
          <p className="mt-1 text-sm text-muted-foreground">
            このブラウザは録音機能に対応していません。Safari または Chrome
            をご利用ください。
          </p>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </motion.div>
        <p className="text-lg font-medium text-muted-foreground">
          録音を保存中...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">お客様</p>
        <p className="text-lg font-semibold">{customerName}</p>
      </div>

      <AnimatePresence mode="wait">
        {!isRecording ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6"
          >
            <button
              onClick={handleStart}
              className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-xl active:scale-95"
            >
              <div className="absolute inset-0 rounded-full bg-red-400 opacity-0 transition-opacity group-hover:opacity-20" />
              <Mic className="h-12 w-12" />
            </button>
            <p className="text-sm font-medium text-muted-foreground">
              タップして録音開始
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex w-full max-w-sm flex-col items-center gap-6"
          >
            <div className="relative flex h-28 w-28 items-center justify-center">
              {!isPaused && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.5,
                    }}
                  />
                </>
              )}
              <div
                className={`flex h-28 w-28 items-center justify-center rounded-full ${isPaused ? "bg-amber-500" : "bg-red-500"} text-white shadow-lg`}
              >
                <Mic className="h-12 w-12" />
              </div>
            </div>

            <motion.div
              className="font-mono text-4xl font-bold tracking-wider tabular-nums"
              animate={isPaused ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
              transition={
                isPaused
                  ? { duration: 1.2, repeat: Infinity }
                  : { duration: 0.2 }
              }
            >
              {formatTime(elapsedSeconds)}
            </motion.div>

            <WaveformVisualizer
              isActive={isRecording && !isPaused}
              audioLevel={audioLevel}
            />

            <div className="flex items-center gap-4">
              {isPaused ? (
                <Button
                  onClick={handleResume}
                  size="lg"
                  variant="outline"
                  className="h-14 w-14 rounded-full p-0"
                >
                  <Play className="h-6 w-6" />
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  size="lg"
                  variant="outline"
                  className="h-14 w-14 rounded-full p-0"
                >
                  <Pause className="h-6 w-6" />
                </Button>
              )}

              <Button
                onClick={handleStop}
                size="lg"
                variant="destructive"
                className="h-14 w-14 rounded-full p-0"
              >
                <Square className="h-6 w-6" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isPaused ? "一時停止中" : "録音中..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
