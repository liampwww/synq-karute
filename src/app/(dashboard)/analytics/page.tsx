"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw, Loader2, User, MessageSquare, Sparkles, Lightbulb } from "lucide-react";

import { TranslatedText } from "@/components/translated-text";
import { useI18n } from "@/lib/i18n/context";
import { useAppearanceStore } from "@/stores/appearance-store";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffAnalytics {
  id: string;
  staff_id: string;
  total_sessions: number;
  avg_confidence: number;
  top_topics: { topic: string; count: number }[];
  repeat_rate: number;
  revenue_attributed?: number;
  ai_coaching_notes: string | null;
  period_start: string;
  period_end: string;
  calculated_at: string;
}

type AnalyticsOrError = StaffAnalytics | { error: true };

const SECTION_KEYS: Record<string, { key: string; icon: typeof MessageSquare; accent: string }> = {
  "コーチングアドバイス": { key: "coachingAdvice", icon: MessageSquare, accent: "indigo" },
  "施術に役立つ情報": { key: "treatmentInfo", icon: Sparkles, accent: "emerald" },
  "リピートにつながる会話の枠組み": { key: "repeatConversation", icon: Lightbulb, accent: "amber" },
};

const ACCENT_STYLES: Record<
  string,
  { bg: string; border: string; icon: string; label: string }
> = {
  default: {
    bg: "bg-muted/30",
    border: "border-border",
    icon: "text-muted-foreground",
    label: "text-muted-foreground",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800",
    icon: "text-indigo-600 dark:text-indigo-400",
    label: "text-indigo-700 dark:text-indigo-300",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
    label: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    label: "text-amber-700 dark:text-amber-300",
  },
};

function parseCoachingSections(notes: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  const regex = /【([^】]+)】\s*\n?([\s\S]*?)(?=【|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(notes)) !== null) {
    const title = m[1].trim();
    const content = m[2].trim();
    if (content) sections.push({ title, content });
  }
  return sections.length > 0 ? sections : [{ title: "", content: notes }];
}

function CoachingNotesBlock({
  notes,
  useStyled,
  t,
}: {
  notes: string;
  useStyled: boolean;
  t: (key: string) => string;
}) {
  const sections = parseCoachingSections(notes);
  const isLegacy = sections.length === 1 && !sections[0].title;

  const getSectionLabel = (title: string) => {
    const config = SECTION_KEYS[title];
    return config ? t(`analytics.${config.key}`) : null;
  };

  if (!useStyled) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <MessageSquare className="size-3" />
          {t("analytics.aiCoachingNotes")}
        </p>
        {isLegacy ? (
          <p className="text-sm whitespace-pre-line leading-relaxed">
            <TranslatedText text={notes} as="span" />
          </p>
        ) : (
          <div className="space-y-4">
            {sections.map(({ title, content }) => {
              const config = SECTION_KEYS[title];
              const Icon = config?.icon ?? MessageSquare;
              return (
                <div key={title} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Icon className="size-3" />
                    {getSectionLabel(title) ?? <TranslatedText text={title} as="span" />}
                  </p>
                  <p className="text-sm whitespace-pre-line leading-relaxed pl-4 border-l-2 border-primary/10">
                    <TranslatedText text={content} as="span" />
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {t("analytics.aiCoachingNotes")}
      </p>
      {isLegacy ? (
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm whitespace-pre-line leading-relaxed text-foreground/90">
            <TranslatedText text={notes} as="span" />
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1">
          {sections.map(({ title, content }) => {
            const config = SECTION_KEYS[title];
            const Icon = config?.icon ?? MessageSquare;
            const accent = config?.accent ?? "default";
            const styles = ACCENT_STYLES[accent] ?? ACCENT_STYLES.default;
            return (
              <div
                key={title}
                className={`rounded-xl border ${styles.border} ${styles.bg} p-4 shadow-sm transition-shadow hover:shadow-md`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`size-4 ${styles.icon}`} />
                  <span className={`text-xs font-semibold ${styles.label}`}>
                    {getSectionLabel(title) ?? <TranslatedText text={title} as="span" />}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  <TranslatedText text={content} as="span" />
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useI18n();
  const organization = useAuthStore((s) => s.organization);

  const [staffListFull, setStaffListFull] = useState<{ id: string; name: string }[]>([]);
  const [analyticsByStaff, setAnalyticsByStaff] = useState<Map<string, AnalyticsOrError>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("synq-karute-analytics-staff-id");
  });
  const setSelectedStaffId = useCallback((id: string | null) => {
    setSelectedStaffIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("synq-karute-analytics-staff-id", id);
      else localStorage.removeItem("synq-karute-analytics-staff-id");
    }
  }, []);
  const coachingNotesStyled = useAppearanceStore(
    (s) => s.coachingNotesStyle === "styled"
  );

  const fetchStaff = useCallback(async () => {
    if (!organization) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("staff")
      .select("id, name")
      .eq("org_id", organization.id)
      .order("name");
    setStaffListFull((data ?? []) as { id: string; name: string }[]);
  }, [organization]);

  const fetchAll = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name")
        .eq("org_id", organization.id)
        .order("name");
      if (staffError) {
        toast.error(t("analytics.fetchStaffFailed"));
        return;
      }
      const list = (staffData ?? []) as { id: string; name: string }[];
      setStaffListFull(list);
      if (list.length > 0) {
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("synq-karute-analytics-staff-id")
            : null;
        const valid = stored && list.some((s) => s.id === stored);
        setSelectedStaffId(valid ? stored : list[0].id);
      }
      const map = new Map<string, AnalyticsOrError>();
      for (const s of list) {
        const res = await fetch(`/api/analytics/staff/${s.id}`);
        const json = await res.json();
        if (json.analytics) map.set(s.id, json.analytics);
      }
      setAnalyticsByStaff(map);
    } catch {
      toast.error(t("analytics.fetchDataFailed"));
      setAnalyticsByStaff(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, setSelectedStaffId, t]);

  useEffect(() => {
    if (organization) fetchAll();
  }, [organization?.id, fetchAll]);

  const handleRecalculate = useCallback(async (staffId: string) => {
    setRecalculating(staffId);
    try {
      const res = await fetch(`/api/analytics/staff/${staffId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        setAnalyticsByStaff((prev) => new Map(prev).set(staffId, { error: true }));
        return;
      }
      if (json.analytics) {
        setAnalyticsByStaff((prev) => new Map(prev).set(staffId, json.analytics));
        toast.success(t("analytics.updateSuccess"));
      }
    } catch {
      toast.error(t("analytics.updateFailed"));
      setAnalyticsByStaff((prev) => new Map(prev).set(staffId, { error: true }));
    } finally {
      setRecalculating(null);
    }
  }, [t]);

  useEffect(() => {
    if (
      selectedStaffId &&
      !analyticsByStaff.has(selectedStaffId) &&
      !recalculating &&
      !isLoading
    ) {
      handleRecalculate(selectedStaffId);
    }
  }, [selectedStaffId, analyticsByStaff, recalculating, isLoading, handleRecalculate]);

  const selectedAnalytics = selectedStaffId ? analyticsByStaff.get(selectedStaffId) : null;
  const selectedStaff = staffListFull.find((s) => s.id === selectedStaffId);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="size-6" />
          {t("analytics.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("analytics.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("analytics.selectStaff")}</CardTitle>
          <Select
            value={selectedStaffId ?? ""}
            onValueChange={(v) => setSelectedStaffId(v || null)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t("analytics.selectStaff")}>
                {selectedStaff ? (selectedStaff.name || t("analytics.noName")) : t("analytics.selectStaff")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {staffListFull.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name || t("analytics.noName")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
            </div>
          </CardContent>
        </Card>
      ) : staffListFull.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t("analytics.noStaff")}
            </p>
          </CardContent>
        </Card>
      ) : selectedStaff ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" />
                {selectedStaff.name}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRecalculate(selectedStaff.id)}
                disabled={recalculating === selectedStaff.id}
              >
                {recalculating === selectedStaff.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {recalculating === selectedStaff.id ? t("analytics.calculating") : t("analytics.recalculate")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedAnalytics ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <BarChart3 className="size-8 opacity-30" />
                <p className="text-sm">{t("analytics.noAnalytics")}</p>
                <p className="text-xs">{t("analytics.karuteHint")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecalculate(selectedStaff.id)}
                  disabled={!!recalculating}
                >
                  {t("analytics.calculateNow")}
                </Button>
              </div>
            ) : "error" in selectedAnalytics ? (
              <div className="flex flex-col items-center gap-2 py-8 text-destructive">
                <p className="text-sm">{t("analytics.calcFailed")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecalculate(selectedStaff.id)}
                  disabled={!!recalculating}
                >
                  {t("analytics.retry")}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div className="stat-card stat-card-1 rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">{selectedAnalytics.total_sessions}</p>
                    <p className="text-[10px] text-muted-foreground">{t("analytics.sessions")}</p>
                  </div>
                  <div className="stat-card stat-card-2 rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {(selectedAnalytics.avg_confidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("analytics.aiConfidence")}</p>
                  </div>
                  <div className="stat-card stat-card-3 rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {(selectedAnalytics.repeat_rate * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("analytics.repeatRate")}</p>
                  </div>
                  <div className="stat-card stat-card-4 rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">
                      ¥{(selectedAnalytics.revenue_attributed ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("analytics.revenue")}</p>
                  </div>
                </div>

                {selectedAnalytics.top_topics?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{t("analytics.topTopics")}</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedAnalytics.top_topics.slice(0, 8).map((item) => (
                        <Badge key={item.topic} variant="secondary" className="text-[10px]">
                          <TranslatedText text={item.topic} as="span" /> ({item.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAnalytics.ai_coaching_notes && (
                  <CoachingNotesBlock
                    notes={selectedAnalytics.ai_coaching_notes}
                    useStyled={coachingNotesStyled}
                    t={t}
                  />
                )}

                <p className="text-[10px] text-muted-foreground/70">
                  {t("analytics.period")}: {selectedAnalytics.period_start} 〜 {selectedAnalytics.period_end} ・
                  {new Date(selectedAnalytics.calculated_at).toLocaleString()}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
