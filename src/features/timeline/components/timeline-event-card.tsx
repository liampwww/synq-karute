"use client";

import { format } from "date-fns";
import {
  Calendar,
  FileText,
  Camera,
  ClipboardList,
  Phone,
  Download,
  Star,
  RefreshCw,
  Stethoscope,
  MessageSquare,
} from "lucide-react";

import type { Tables } from "@/types/database";
import type { TimelineEventType } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const EVENT_TYPE_CONFIG: Record<
  TimelineEventType,
  { icon: typeof Calendar; label: string; color: string }
> = {
  visit: { icon: Calendar, label: "来店", color: "text-blue-500" },
  treatment: {
    icon: Stethoscope,
    label: "施術",
    color: "text-purple-500",
  },
  note: { icon: MessageSquare, label: "メモ", color: "text-yellow-500" },
  photo: { icon: Camera, label: "写真", color: "text-pink-500" },
  form: { icon: ClipboardList, label: "フォーム", color: "text-green-500" },
  contact: { icon: Phone, label: "連絡", color: "text-cyan-500" },
  import: { icon: Download, label: "インポート", color: "text-gray-500" },
  milestone: { icon: Star, label: "マイルストーン", color: "text-amber-500" },
  status_change: {
    icon: RefreshCw,
    label: "ステータス変更",
    color: "text-orange-500",
  },
};

interface TimelineEventCardProps {
  event: Tables<"timeline_events">;
  onClickDetail?: (eventId: string) => void;
}

export function TimelineEventCard({
  event,
  onClickDetail,
}: TimelineEventCardProps) {
  const config =
    EVENT_TYPE_CONFIG[event.event_type as TimelineEventType] ??
    EVENT_TYPE_CONFIG.note;
  const Icon = config.icon;

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full border bg-background ${config.color}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>

      <div
        className="flex-1 space-y-1 pb-2 cursor-pointer group"
        onClick={() => onClickDetail?.(event.id)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium group-hover:text-primary transition-colors">
              {event.title}
            </h4>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {config.label}
            </Badge>
          </div>
          <time className="text-xs text-muted-foreground shrink-0">
            {format(new Date(event.event_date), "yyyy/MM/dd HH:mm")}
          </time>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {event.description}
          </p>
        )}

        {event.source !== "manual" && (
          <p className="text-[11px] text-muted-foreground/60">
            {event.source === "recording"
              ? "録音から自動生成"
              : event.source.startsWith("import:")
                ? `${event.source.replace("import:", "")} からインポート`
                : event.source.startsWith("sync:")
                  ? `${event.source.replace("sync:", "")} から同期`
                  : event.source}
          </p>
        )}

        {event.linked_record_id && event.linked_record_type === "karute" && (
          <FileText className="size-3 text-muted-foreground/40 inline" />
        )}
      </div>
    </div>
  );
}
