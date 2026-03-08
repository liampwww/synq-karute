"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { TimelineEventType } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
import { createTimelineEvent } from "@/features/timeline/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const EVENT_TYPE_OPTIONS: { value: TimelineEventType; label: string }[] = [
  { value: "visit", label: "来店" },
  { value: "treatment", label: "施術" },
  { value: "note", label: "メモ" },
  { value: "photo", label: "写真" },
  { value: "contact", label: "連絡" },
  { value: "form", label: "フォーム" },
];

interface AddEventFormProps {
  customerId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function AddEventForm({
  customerId,
  onSaved,
  onCancel,
}: AddEventFormProps) {
  const organization = useAuthStore((s) => s.organization);
  const activeStaff = useAuthStore((s) => s.staff);

  const [eventType, setEventType] = useState<TimelineEventType>("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !title.trim()) return;

    setIsSaving(true);
    try {
      await createTimelineEvent({
        customer_id: customerId,
        org_id: organization.id,
        staff_id: activeStaff?.id ?? null,
        event_type: eventType,
        source: "manual",
        title: title.trim(),
        description: description.trim() || null,
        event_date: new Date(eventDate).toISOString(),
      });
      toast.success("イベントを追加しました");
      onSaved();
    } catch {
      toast.error("イベントの追加に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as TimelineEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <Input
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            placeholder="詳細（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              キャンセル
            </Button>
            <Button type="submit" size="sm" disabled={isSaving || !title.trim()}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
