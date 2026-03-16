"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Lightbulb,
  RefreshCw,
  Check,
  X,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Heart,
  TrendingUp,
  MessageCircle,
  Camera,
  Clock,
  Star,
  UserCheck,
} from "lucide-react";

import type { Tables, InsightType } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
import {
  getInsights,
  generateInsights,
  updateInsightStatus,
} from "@/features/insights/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const INSIGHT_TYPE_CONFIG: Record<
  InsightType,
  { icon: typeof Lightbulb; label: string; color: string }
> = {
  next_treatment: { icon: ArrowRight, label: "次回施術", color: "text-blue-500" },
  follow_up: { icon: Clock, label: "フォローアップ", color: "text-green-500" },
  reactivation: { icon: UserCheck, label: "再来店促進", color: "text-orange-500" },
  churn_risk: { icon: AlertTriangle, label: "離脱リスク", color: "text-red-500" },
  unresolved_issue: { icon: AlertTriangle, label: "未解決課題", color: "text-yellow-500" },
  talking_point: { icon: MessageCircle, label: "話題", color: "text-purple-500" },
  upsell: { icon: TrendingUp, label: "アップセル", color: "text-emerald-500" },
  photo_request: { icon: Camera, label: "写真撮影", color: "text-pink-500" },
  plan_incomplete: { icon: Clock, label: "計画未完了", color: "text-amber-500" },
  high_value: { icon: Star, label: "VIP", color: "text-yellow-500" },
  general: { icon: Lightbulb, label: "一般", color: "text-gray-500" },
};

type InsightWithCustomer = Tables<"customer_ai_insights"> & {
  customers?: { name: string };
};

interface InsightCardsProps {
  customerId?: string;
  showCustomerName?: boolean;
  limit?: number;
  onNavigateToCustomer?: (customerId: string) => void;
}

export function InsightCards({
  customerId,
  showCustomerName = false,
  limit = 10,
  onNavigateToCustomer,
}: InsightCardsProps) {
  const organization = useAuthStore((s) => s.organization);

  const [insights, setInsights] = useState<InsightWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const data = await getInsights({
        customerId,
        orgId: organization.id,
        status: "active",
        limit,
      });
      setInsights(data);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [customerId, organization, limit]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerate = async () => {
    if (!organization || !customerId) return;
    setIsGenerating(true);
    try {
      const result = await generateInsights(
        customerId,
        organization.id,
        organization.type || "hair"
      );
      toast.success(`${result.generated} 件のインサイトを生成しました`);
      fetchInsights();
    } catch {
      toast.error("インサイトの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await updateInsightStatus(id, "dismissed");
      setInsights((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleAction = async (id: string) => {
    try {
      await updateInsightStatus(id, "actioned");
      setInsights((prev) => prev.filter((i) => i.id !== id));
      toast.success("アクション完了としてマーク");
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {customerId && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-500" />
            <span className="text-sm font-medium">AI推奨アクション</span>
            {insights.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {insights.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
          </Button>
        </div>
      )}

      {insights.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Heart className="size-6 opacity-40" />
          <p className="text-xs">
            {customerId
              ? "インサイトはまだありません"
              : "アクティブなインサイトはありません"}
          </p>
          {customerId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "生成中..." : "AI分析を実行"}
            </Button>
          )}
        </div>
      ) : (
        insights.map((insight) => {
          const config =
            INSIGHT_TYPE_CONFIG[insight.insight_type as InsightType] ??
            INSIGHT_TYPE_CONFIG.general;
          const Icon = config.icon;

          return (
            <Card
              key={insight.id}
              className="border-border/60 hover:border-border transition-colors"
            >
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background border ${config.color}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          {insight.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {config.label}
                        </Badge>
                      </div>
                      {showCustomerName && insight.customers && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() =>
                            onNavigateToCustomer?.(insight.customer_id)
                          }
                        >
                          {insight.customers.name}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleAction(insight.id)}
                      title="完了"
                    >
                      <Check className="size-3.5 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleDismiss(insight.id)}
                      title="非表示"
                    >
                      <X className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                  {insight.description}
                </p>

                {insight.priority_score >= 0.8 && (
                  <div className="pl-9">
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0"
                    >
                      優先度高
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
