"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  TrendingUp,
  MessageSquare,
  Tag,
  Sparkles,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { TranslatedText } from "@/components/translated-text";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CustomerInsight {
  id: string;
  customer_id: string;
  org_id: string;
  total_visits: number;
  total_spend: number;
  ltv: number;
  avg_session_duration: string | null;
  top_pro_topics: { topic: string; count: number }[];
  top_personal_topics: { topic: string; count: number }[];
  recurring_themes: { theme: string; frequency: number; sample: string }[];
  trend_analysis: { emerging_topics?: string[]; declining_topics?: string[] };
  last_calculated_at: string;
}

interface CustomerInsightCardProps {
  customerId: string;
}

export function CustomerInsightCard({ customerId }: CustomerInsightCardProps) {
  const { t } = useI18n();
  const organization = useAuthStore((s) => s.organization);
  const [insight, setInsight] = useState<CustomerInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchInsight = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customer-insights/${customerId}`);
      const json = await res.json();
      setInsight(json.insight ?? null);
    } catch {
      setInsight(null);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, organization]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch(`/api/customer-insights/${customerId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.insight) {
        setInsight(json.insight);
        toast.success(t("insights.updatedSuccess"));
      } else {
        toast.info(t("insights.insufficientData"));
      }
    } catch {
      toast.error(t("insights.updateFailed"));
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("insights.loading")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" />
            {t("insights.title")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {isRecalculating ? t("insights.calculating") : t("insights.recalculate")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insight ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <BarChart3 className="size-8 opacity-30" />
            <p className="text-sm">{t("insights.noInsight")}</p>
            <p className="text-xs">
              {t("insights.noInsightHint")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isRecalculating}
            >
              {isRecalculating ? t("insights.calculating") : t("insights.calculateNow")}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold tabular-nums">{insight.total_visits}</p>
                <p className="text-[10px] text-muted-foreground">{t("insights.visits")}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold tabular-nums">¥{(insight.total_spend ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{t("insights.totalSpend")}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold tabular-nums">¥{(insight.ltv ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">LTV</p>
              </div>
            </div>

            {insight.top_pro_topics && insight.top_pro_topics.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="size-3" />
                  {t("insights.topProfessionalTopics")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {insight.top_pro_topics.slice(0, 6).map((item) => (
                    <Badge key={item.topic} variant="secondary" className="text-[10px]">
                      <TranslatedText text={item.topic} as="span" /> ({item.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {insight.top_personal_topics && insight.top_personal_topics.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  {t("insights.topPersonalTopics")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {insight.top_personal_topics.slice(0, 6).map((item) => (
                    <Badge key={item.topic} variant="outline" className="text-[10px]">
                      <TranslatedText text={item.topic} as="span" /> ({item.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {insight.recurring_themes && insight.recurring_themes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3" />
                  {t("insights.recurringThemes")}
                </p>
                <ul className="space-y-1 text-xs">
                  {insight.recurring_themes.slice(0, 3).map((r) => (
                    <li key={r.theme} className="text-muted-foreground">
                      <span className="font-medium"><TranslatedText text={r.theme} as="span" /></span> — {r.frequency}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insight.trend_analysis?.emerging_topics?.length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  {t("insights.emergingTopics")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {insight.trend_analysis.emerging_topics.map((topic) => (
                    <Badge key={topic} variant="default" className="text-[10px]">
                      <TranslatedText text={topic} as="span" />
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-[10px] text-muted-foreground/70">
              {t("insights.lastUpdated")}: {new Date(insight.last_calculated_at).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
