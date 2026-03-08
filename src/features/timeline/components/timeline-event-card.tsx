"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
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
  Clock,
  User,
  DollarSign,
  Tag,
} from "lucide-react";

import type { Tables } from "@/types/database";
import type { TimelineEventType } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const EVENT_TYPE_CONFIG: Record<
  TimelineEventType,
  { icon: typeof Calendar; label: string; color: string; bgColor: string }
> = {
  visit: { icon: Calendar, label: "来店", color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  treatment: { icon: Stethoscope, label: "施術", color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  note: { icon: MessageSquare, label: "メモ", color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  photo: { icon: Camera, label: "写真", color: "text-pink-500", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  form: { icon: ClipboardList, label: "フォーム", color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950/30" },
  contact: { icon: Phone, label: "連絡", color: "text-cyan-500", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  import: { icon: Download, label: "インポート", color: "text-gray-500", bgColor: "bg-gray-50 dark:bg-gray-950/30" },
  milestone: { icon: Star, label: "マイルストーン", color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  status_change: { icon: RefreshCw, label: "ステータス変更", color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
};

interface StructuredData {
  business_type?: string;
  entry_count?: number;
  recording_id?: string;
  service_type?: string;
  staff_name?: string;
  duration?: string;
  amount?: string | number;
  notes?: string;
  photo_urls?: string[];
  photo_count?: number;
  [key: string]: unknown;
}

interface TimelineEventCardProps {
  event: Tables<"timeline_events">;
  onClickDetail?: (eventId: string) => void;
  gapDays?: number | null;
}

export function TimelineEventCard({
  event,
  onClickDetail,
  gapDays,
}: TimelineEventCardProps) {
  const config =
    EVENT_TYPE_CONFIG[event.event_type as TimelineEventType] ??
    EVENT_TYPE_CONFIG.note;
  const Icon = config.icon;
  const data = (event.structured_data ?? {}) as StructuredData;

  const relativeTime = formatDistanceToNow(new Date(event.event_date), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <>
      {gapDays != null && gapDays > 30 && (
        <div className="relative flex gap-4 pb-4">
          <div className="flex flex-col items-center">
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="flex-1 flex items-center gap-2 py-2">
            <div className="h-px flex-1 bg-orange-300/50 dark:bg-orange-700/50" />
            <span className="text-[11px] font-medium text-orange-500 whitespace-nowrap px-2">
              {gapDays}日間 来店なし
            </span>
            <div className="h-px flex-1 bg-orange-300/50 dark:bg-orange-700/50" />
          </div>
        </div>
      )}

      <div className="relative flex gap-4 pb-8 last:pb-0">
        <div className="flex flex-col items-center">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${config.bgColor} ${config.color}`}
          >
            <Icon className="size-4" />
          </div>
          <div className="w-px flex-1 bg-border" />
        </div>

        <div
          className="flex-1 space-y-1.5 pb-2 cursor-pointer group"
          onClick={() => onClickDetail?.(event.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium group-hover:text-primary transition-colors">
                {event.title}
              </h4>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {config.label}
              </Badge>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <time className="text-xs text-muted-foreground">
                {format(new Date(event.event_date), "yyyy/MM/dd HH:mm")}
              </time>
              <span className="text-[10px] text-muted-foreground/60">
                {relativeTime}
              </span>
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {event.description}
            </p>
          )}

          {(data.service_type || data.staff_name || data.duration || data.amount || data.entry_count) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              {data.service_type && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Tag className="size-3" />
                  {data.service_type}
                </span>
              )}
              {data.staff_name && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <User className="size-3" />
                  {data.staff_name}
                </span>
              )}
              {data.duration && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  {data.duration}
                </span>
              )}
              {data.amount && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <DollarSign className="size-3" />
                  ¥{Number(data.amount).toLocaleString()}
                </span>
              )}
              {data.entry_count && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <FileText className="size-3" />
                  {data.entry_count}件の情報を抽出
                </span>
              )}
            </div>
          )}

          {event.event_type === "photo" && (data.photo_urls?.length ?? data.photo_count) && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {data.photo_urls?.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`写真 ${i + 1}`}
                  className="size-12 rounded object-cover border"
                />
              ))}
              {data.photo_count != null && !data.photo_urls?.length && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Camera className="size-3" />
                  {data.photo_count}枚
                </span>
              )}
            </div>
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
            <div className="flex items-center gap-1 text-[11px] text-primary/70">
              <FileText className="size-3" />
              <span>カルテ記録あり</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
