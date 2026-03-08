"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import {
  Filter,
  Plus,
  RefreshCw,
  Sparkles,
  Loader2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

import type { Tables, TimelineEventType } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import {
  getCustomerTimeline,
  type TimelineQueryOptions,
} from "@/features/timeline/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TimelineEventCard } from "./timeline-event-card";
import { AddEventForm } from "./add-event-form";

const EVENT_TYPE_FILTERS: {
  value: TimelineEventType;
  label: string;
}[] = [
  { value: "visit", label: "来店" },
  { value: "treatment", label: "施術" },
  { value: "note", label: "メモ" },
  { value: "photo", label: "写真" },
  { value: "form", label: "フォーム" },
  { value: "contact", label: "連絡" },
  { value: "import", label: "インポート" },
  { value: "milestone", label: "マイルストーン" },
];

interface CustomerTimelineProps {
  customerId: string;
  onNavigateToKarute?: (karuteId: string) => void;
}

function computeGapDays(events: Tables<"timeline_events">[]) {
  const gaps: Map<string, number> = new Map();
  const visitTypes = new Set<TimelineEventType>(["visit", "treatment"]);
  const sorted = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  let prevVisitDate: Date | null = null;
  for (const ev of sorted) {
    if (visitTypes.has(ev.event_type as TimelineEventType)) {
      if (prevVisitDate) {
        const gap = differenceInDays(prevVisitDate, new Date(ev.event_date));
        if (gap > 30) {
          gaps.set(ev.id, gap);
        }
      }
      prevVisitDate = new Date(ev.event_date);
    }
  }
  return gaps;
}

export function CustomerTimeline({
  customerId,
  onNavigateToKarute,
}: CustomerTimelineProps) {
  const organization = useAuthStore((s) => s.organization);

  const [events, setEvents] = useState<Tables<"timeline_events">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<TimelineEventType[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const options: TimelineQueryOptions = { limit: 200 };
      if (activeFilters.length > 0) {
        options.eventTypes = activeFilters;
      }
      const data = await getCustomerTimeline(customerId, options);
      setEvents(data);
    } catch {
      toast.error("タイムラインの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [customerId, organization, activeFilters]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  useEffect(() => {
    async function loadPersistedSummary() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("customers")
          .select("profile")
          .eq("id", customerId)
          .single();
        const profile = data?.profile as Record<string, unknown> | null;
        if (profile?.ai_summary && typeof profile.ai_summary === "string") {
          setAiSummary(profile.ai_summary);
        }
      } catch {
        // silent
      }
    }
    loadPersistedSummary();
  }, [customerId]);

  const gapMap = useMemo(() => computeGapDays(events), [events]);

  const timelineStats = useMemo(() => {
    if (events.length === 0) return null;
    const visitEvents = events.filter(
      (e) => e.event_type === "visit" || e.event_type === "treatment"
    );
    const totalVisits = visitEvents.length;
    const firstEvent = events[events.length - 1];
    const lastVisit = visitEvents[0];
    const daysSinceLastVisit = lastVisit
      ? differenceInDays(new Date(), new Date(lastVisit.event_date))
      : null;
    return { totalVisits, firstEvent, lastVisit, daysSinceLastVisit };
  }, [events]);

  const toggleFilter = (eventType: TimelineEventType) => {
    setActiveFilters((prev) =>
      prev.includes(eventType)
        ? prev.filter((f) => f !== eventType)
        : [...prev, eventType]
    );
  };

  const handleGenerateSummary = async () => {
    if (!organization) return;
    setIsSummarizing(true);
    try {
      const res = await fetch("/api/timeline/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          businessType: organization.type || "hair",
        }),
      });
      const json = await res.json();
      if (json.summary) {
        setAiSummary(json.summary);
        toast.success("AIサマリーを生成しました");
      } else {
        toast.info("サマリー生成に十分なデータがありません");
      }
    } catch {
      toast.error("サマリー生成に失敗しました");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEventClick = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (
      event?.linked_record_id &&
      event.linked_record_type === "karute" &&
      onNavigateToKarute
    ) {
      onNavigateToKarute(event.linked_record_id);
    }
  };

  return (
    <div className="space-y-4">
      {timelineStats && timelineStats.totalVisits > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{timelineStats.totalVisits}</p>
            <p className="text-[11px] text-muted-foreground">来店回数</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{events.length}</p>
            <p className="text-[11px] text-muted-foreground">記録件数</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            {timelineStats.daysSinceLastVisit != null ? (
              <>
                <p className={`text-2xl font-bold tabular-nums ${timelineStats.daysSinceLastVisit > 60 ? "text-orange-500" : timelineStats.daysSinceLastVisit > 90 ? "text-red-500" : ""}`}>
                  {timelineStats.daysSinceLastVisit}
                </p>
                <p className="text-[11px] text-muted-foreground">最終来店からの日数</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">-</p>
                <p className="text-[11px] text-muted-foreground">最終来店からの日数</p>
              </>
            )}
          </div>
        </div>
      )}

      {timelineStats?.daysSinceLastVisit != null && timelineStats.daysSinceLastVisit > 60 && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-2.5">
          <AlertTriangle className="size-4 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-400">
            {timelineStats.daysSinceLastVisit > 90
              ? `${timelineStats.daysSinceLastVisit}日間来店がありません。再来促進のアクションを検討してください。`
              : `前回の来店から${timelineStats.daysSinceLastVisit}日経過しています。フォローアップをおすすめします。`}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPE_FILTERS.map((filter) => (
              <Badge
                key={filter.value}
                variant={
                  activeFilters.includes(filter.value) ? "default" : "outline"
                }
                className="cursor-pointer text-xs"
                onClick={() => toggleFilter(filter.value)}
              >
                {filter.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={fetchTimeline}>
            <RefreshCw className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            追加
          </Button>
        </div>
      </div>

      {(aiSummary || events.length > 3) && (
        <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            {aiSummary ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      AIカスタマーサマリー
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {aiSummary}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    AIで顧客サマリーを生成
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                >
                  {isSummarizing ? (
                    <>
                      <Loader2 className="size-3 animate-spin" data-icon="inline-start" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" data-icon="inline-start" />
                      サマリー生成
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <AddEventForm
          customerId={customerId}
          onSaved={() => {
            setShowAddForm(false);
            fetchTimeline();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {isLoading ? (
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-64 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <BarChart3 className="size-8 opacity-30" />
          <p className="text-sm">タイムラインイベントがありません</p>
          <p className="text-xs text-muted-foreground/70">
            録音・施術記録・手動入力・インポートからイベントが追加されます
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="size-3.5" data-icon="inline-start" />
            最初のイベントを追加
          </Button>
        </div>
      ) : (
        <div className="pt-2">
          {events.map((event) => (
            <TimelineEventCard
              key={event.id}
              event={event}
              onClickDetail={handleEventClick}
              gapDays={gapMap.get(event.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
