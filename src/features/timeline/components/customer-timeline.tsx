"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Filter, Plus, RefreshCw, Sparkles, Loader2 } from "lucide-react";

import type { Tables, TimelineEventType } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
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
  { value: "contact", label: "連絡" },
  { value: "import", label: "インポート" },
];

interface CustomerTimelineProps {
  customerId: string;
  onNavigateToKarute?: (karuteId: string) => void;
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
      const options: TimelineQueryOptions = { limit: 100 };
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
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
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
                      AIサマリー
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
          <p className="text-sm">タイムラインイベントがありません</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
