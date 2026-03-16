"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Search,
  FileText,
  Clock,
  CheckCircle2,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import type { KarteCategory, KarteStatus } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { TranslatedText } from "@/components/translated-text";
import { useAuthStore } from "@/stores/auth-store";
import {
  getKaruteRecords,
  type KaruteRecordSummary,
} from "@/features/karute/api";
import { CATEGORY_CONFIG } from "@/features/karute/components/category-badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const STATUS_FILTERS: Array<{ value: KarteStatus | "all"; icon: typeof Clock }> = [
  { value: "all", icon: FileText },
  { value: "draft", icon: Clock },
  { value: "review", icon: Eye },
  { value: "approved", icon: CheckCircle2 },
];

const STATUS_STYLES: Record<KarteStatus, { bg: string; text: string }> = {
  draft: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
  },
  review: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  approved: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

function getCategoryCounts(
  entries: Array<{ id: string; category: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }
  return counts;
}

export function KaruteList() {
  const { t } = useI18n();
  const router = useRouter();
  const { organization } = useAuthStore();

  const [records, setRecords] = useState<KaruteRecordSummary[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KarteStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!organization) return;

    try {
      const data = await getKaruteRecords(organization.id);
      setRecords(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [organization, t]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    let result = records;

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.customer.name.toLowerCase().includes(q) ||
          (r.customer.name_kana?.toLowerCase().includes(q) ?? false)
      );
    }

    return result;
  }, [records, statusFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("karute.searchCustomer")}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {STATUS_FILTERS.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(value)}
              className={cn(
                "h-7 gap-1.5 px-2.5 text-xs font-medium transition-all",
                statusFilter === value &&
                  "bg-background shadow-sm text-foreground hover:bg-background"
              )}
            >
              <Icon className="size-3.5" />
              {t(`karute.status.${value}`)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl bg-muted/50"
            />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground"
        >
          <FileText className="size-10 opacity-40" />
          <p className="text-sm">{t("karute.noRecords")}</p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredRecords.map((record) => {
            const categoryCounts = getCategoryCounts(record.karute_entries);
            const statusStyle =
              STATUS_STYLES[record.status as KarteStatus] ?? STATUS_STYLES.draft;

            return (
              <motion.div key={record.id} variants={itemVariants}>
                <Card
                  className="cursor-pointer p-4 transition-all hover:shadow-md hover:border-foreground/15 active:scale-[0.98]"
                  onClick={() => router.push(`/karute/${record.id}`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight truncate">
                          {record.customer.name}
                        </p>
                        {record.customer.name_kana && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {record.customer.name_kana}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                          statusStyle.bg,
                          statusStyle.text
                        )}
                      >
                        {t(`karute.status.${record.status}`)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>

                    {record.ai_summary && (
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="size-3 mt-0.5 shrink-0 text-violet-500" />
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          <TranslatedText text={record.ai_summary} as="span" />
                        </p>
                      </div>
                    )}

                    {categoryCounts.size > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {Array.from(categoryCounts.entries()).map(
                          ([category, count]) => {
                            const config =
                              CATEGORY_CONFIG[category as KarteCategory];
                            if (!config) return null;
                            return (
                              <span
                                key={category}
                                className="inline-flex items-center gap-1"
                              >
                                <span
                                  className={cn(
                                    "size-2 rounded-full",
                                    config.dot
                                  )}
                                />
                                <span className="text-[0.6rem] text-muted-foreground">
                                  {count}
                                </span>
                              </span>
                            );
                          }
                        )}
                        <span className="text-[0.6rem] text-muted-foreground/60 ml-auto">
                          {record.karute_entries.length} {t("karute.entries")}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
