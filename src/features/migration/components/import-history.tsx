"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  History,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Tables, MigrationJobStatus } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MigrationJob = Tables<"migration_jobs">;

const STATUS_BADGE_CONFIG: Record<
  MigrationJobStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  completed: { variant: "outline", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
  failed: { variant: "destructive" },
  importing: { variant: "outline", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  analyzing: { variant: "outline", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  mapping: { variant: "outline", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  pending: { variant: "secondary" },
  cancelled: { variant: "outline", className: "text-muted-foreground border-muted-foreground/30" },
  rolling_back: { variant: "secondary" },
};

const STATUS_LABELS: Record<MigrationJobStatus, string> = {
  completed: "完了",
  failed: "失敗",
  importing: "インポート中",
  analyzing: "分析中",
  mapping: "マッピング中",
  pending: "待機中",
  cancelled: "キャンセル",
  rolling_back: "ロールバック中",
};

function parseErrorLog(errorLog: unknown): Array<{ row?: number; error: string }> {
  if (!errorLog || !Array.isArray(errorLog)) return [];
  return errorLog.map((entry) => {
    if (typeof entry === "object" && entry !== null && "error" in entry) {
      return {
        row: "row" in entry ? Number((entry as { row?: number }).row) : undefined,
        error: String((entry as { error: unknown }).error),
      };
    }
    return { error: String(entry) };
  });
}

function JobCard({ job, expandedId, onToggle }: { job: MigrationJob; expandedId: string | null; onToggle: (id: string) => void }) {
  const config = STATUS_BADGE_CONFIG[job.status];
  const errorEntries = parseErrorLog(job.error_log);
  const hasErrors = errorEntries.length > 0;
  const isExpanded = expandedId === job.id;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {job.source_name || job.source_type || "無題のインポート"}
              </CardTitle>
              <CardDescription className="text-xs">
                {job.source_type} • {format(new Date(job.created_at), "yyyy/MM/dd HH:mm")}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={config.variant}
            className={config.className}
          >
            {STATUS_LABELS[job.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">合計</p>
            <p className="font-medium">{job.total_records}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">成功</p>
            <p className="font-medium text-green-600 dark:text-green-400">{job.imported_records}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">スキップ</p>
            <p className="font-medium text-amber-600 dark:text-amber-400">{job.skipped_records}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">失敗</p>
            <p className="font-medium text-red-600 dark:text-red-400">{job.failed_records}</p>
          </div>
        </div>

        {(job.completed_at || job.started_at) && (
          <p className="text-xs text-muted-foreground">
            {job.started_at && `開始: ${format(new Date(job.started_at), "HH:mm")}`}
            {job.started_at && job.completed_at && " • "}
            {job.completed_at && `完了: ${format(new Date(job.completed_at), "yyyy/MM/dd HH:mm")}`}
          </p>
        )}

        {hasErrors && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-auto py-2 px-3 text-destructive hover:bg-destructive/10"
              onClick={() => onToggle(job.id)}
            >
              <span className="text-xs font-medium">
                {job.failed_records} 件のエラー
              </span>
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
            {isExpanded && (
              <div className="max-h-40 overflow-y-auto border-t border-destructive/20 p-3 space-y-1">
                {errorEntries.slice(0, 20).map((entry, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {entry.row != null ? `行 ${entry.row}: ` : ""}{entry.error}
                  </p>
                ))}
                {errorEntries.length > 20 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    ...他 {errorEntries.length - 20} 件
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ImportHistory() {
  const organization = useAuthStore((s) => s.organization);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchJobs() {
      const { data, error } = await supabase
        .from("migration_jobs")
        .select("*")
        .eq("org_id", organization!.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setJobs((data ?? []) as MigrationJob[]);
      }
      setLoading(false);
    }

    fetchJobs();
  }, [organization?.id]);

  if (!organization) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">インポート履歴</h2>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">まだインポート履歴がありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              expandedId={expandedId}
              onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
