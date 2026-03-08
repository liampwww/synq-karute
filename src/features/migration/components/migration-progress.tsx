"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";

import type { MigrationProgress as MigrationProgressType } from "@/lib/migration/types";
import { getMigrationStatus, rollbackMigration } from "@/features/migration/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MigrationProgressProps {
  jobId: string;
  onComplete: () => void;
}

export function MigrationProgress({
  jobId,
  onComplete,
}: MigrationProgressProps) {
  const [progress, setProgress] = useState<MigrationProgressType | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const pollStatus = useCallback(async () => {
    try {
      const status = await getMigrationStatus(jobId);
      setProgress(status);
      return status.status;
    } catch {
      return "error";
    }
  }, [jobId]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      while (active) {
        const status = await pollStatus();
        if (
          status === "completed" ||
          status === "failed" ||
          status === "cancelled"
        ) {
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [pollStatus]);

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      await rollbackMigration(jobId);
      await pollStatus();
    } finally {
      setIsRollingBack(false);
    }
  };

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = progress.totalRecords || 1;
  const done =
    progress.importedRecords + progress.failedRecords + progress.skippedRecords;
  const percent = Math.round((done / total) * 100);
  const isFinished =
    progress.status === "completed" ||
    progress.status === "failed" ||
    progress.status === "cancelled";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {progress.status === "completed" ? (
              <>
                <CheckCircle2 className="size-5 text-green-500" />
                インポート完了
              </>
            ) : progress.status === "failed" ? (
              <>
                <XCircle className="size-5 text-red-500" />
                インポート失敗
              </>
            ) : progress.status === "cancelled" ? (
              <>
                <RotateCcw className="size-5 text-yellow-500" />
                ロールバック完了
              </>
            ) : (
              <>
                <Loader2 className="size-5 animate-spin" />
                インポート中...
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{progress.totalRecords}</p>
              <p className="text-xs text-muted-foreground">合計</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {progress.importedRecords}
              </p>
              <p className="text-xs text-muted-foreground">成功</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {progress.skippedRecords}
              </p>
              <p className="text-xs text-muted-foreground">スキップ</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {progress.failedRecords}
              </p>
              <p className="text-xs text-muted-foreground">失敗</p>
            </div>
          </div>

          {progress.errorLog && progress.errorLog.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-600">
                エラーログ（最新10件）
              </p>
              <div className="max-h-40 overflow-y-auto rounded border p-2 text-xs space-y-0.5">
                {progress.errorLog.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-muted-foreground">
                    行 {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {isFinished && progress.status === "completed" && (
          <Button variant="outline" onClick={handleRollback} disabled={isRollingBack}>
            {isRollingBack ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ロールバック中...
              </>
            ) : (
              <>
                <RotateCcw className="size-4" data-icon="inline-start" />
                ロールバック
              </>
            )}
          </Button>
        )}
        <div className="ml-auto">
          {isFinished && (
            <Button onClick={onComplete}>完了</Button>
          )}
        </div>
      </div>
    </div>
  );
}
