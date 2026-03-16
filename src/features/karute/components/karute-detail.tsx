"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Eye,
  Heart,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { KarteCategory } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import {
  getKaruteRecord,
  updateKaruteRecord,
  updateKaruteEntry,
  deleteKaruteEntry,
  addKaruteEntry,
  exportKaruteAsText,
  type KaruteRecordDetail,
  type KaruteEntry,
} from "@/features/karute/api";
import {
  CategoryBadge,
  CATEGORY_CONFIG,
} from "@/features/karute/components/category-badge";
import { getBusinessType } from "@/lib/business-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const entryVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

const STATUS_ICON: Record<string, typeof Clock> = {
  draft: Clock,
  review: Eye,
  approved: CheckCircle2,
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
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

const CATEGORY_ORDER: KarteCategory[] = [
  "symptom",
  "treatment",
  "preference",
  "lifestyle",
  "next_appointment",
  "product",
  "other",
];

const PROFESSIONAL_ENTRY_CONFIG = {
  icon: Briefcase,
  labelKey: "",
  bg: "bg-sky-50 dark:bg-sky-950/30",
  text: "text-sky-600 dark:text-sky-400",
  dot: "bg-sky-500",
  border: "border-sky-200 dark:border-sky-800",
};

const PERSONAL_ENTRY_CONFIG = {
  icon: Heart,
  labelKey: "",
  bg: "bg-orange-50 dark:bg-orange-950/30",
  text: "text-orange-600 dark:text-orange-400",
  dot: "bg-orange-500",
  border: "border-orange-200 dark:border-orange-800",
};

interface KaruteDetailProps {
  karuteId: string;
}

export function KaruteDetail({ karuteId }: KaruteDetailProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [karute, setKarute] = useState<KaruteRecordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [newEntryCategory, setNewEntryCategory] =
    useState<KarteCategory>("symptom");
  const [newEntryContent, setNewEntryContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchKarute = useCallback(async () => {
    try {
      const data = await getKaruteRecord(karuteId);
      setKarute(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [karuteId, t]);

  useEffect(() => {
    fetchKarute();
  }, [fetchKarute]);

  const { oldCategoryEntries, newCategoryGroups } = useMemo(() => {
    if (!karute) {
      return {
        oldCategoryEntries: new Map<KarteCategory, KaruteEntry[]>(),
        newCategoryGroups: null as null | {
          professional: Map<string, KaruteEntry[]>;
          personal: Map<string, KaruteEntry[]>;
        },
      };
    }

    const oldMap = new Map<KarteCategory, KaruteEntry[]>();
    const proMap = new Map<string, KaruteEntry[]>();
    const personalMap = new Map<string, KaruteEntry[]>();
    let hasNew = false;

    for (const entry of karute.karute_entries) {
      if (
        entry.subcategory &&
        (entry.category === "professional" || entry.category === "personal")
      ) {
        hasNew = true;
        const map = entry.category === "professional" ? proMap : personalMap;
        const existing = map.get(entry.subcategory) ?? [];
        existing.push(entry);
        map.set(entry.subcategory, existing);
      } else {
        const category = entry.category as KarteCategory;
        const existing = oldMap.get(category) ?? [];
        existing.push(entry);
        oldMap.set(category, existing);
      }
    }

    return {
      oldCategoryEntries: oldMap,
      newCategoryGroups: hasNew
        ? { professional: proMap, personal: personalMap }
        : null,
    };
  }, [karute]);

  const businessTypeConfig = useMemo(
    () => getBusinessType(karute?.business_type ?? "other"),
    [karute]
  );

  const sortedEntries = useMemo(() => {
    if (!karute) return [];
    return [...karute.karute_entries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [karute]);

  const handleApprove = useCallback(async () => {
    if (!karute) return;
    try {
      await updateKaruteRecord(karute.id, { status: "approved" });
      setKarute((prev) => (prev ? { ...prev, status: "approved" } : null));
      toast.success(t("karute.approved"));
    } catch {
      toast.error(t("common.error"));
    }
  }, [karute, t]);

  const handleExport = useCallback(async () => {
    try {
      const text = await exportKaruteAsText(karuteId);
      await navigator.clipboard.writeText(text);
      toast.success(t("karute.copiedToClipboard"));
    } catch {
      toast.error(t("common.error"));
    }
  }, [karuteId, t]);

  const handleStartEdit = useCallback((entry: KaruteEntry) => {
    setEditingEntryId(entry.id);
    setEditContent(entry.content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingEntryId(null);
    setEditContent("");
  }, []);

  const handleSaveEdit = useCallback(
    async (entryId: string) => {
      if (!editContent.trim()) return;
      try {
        await updateKaruteEntry(entryId, { content: editContent.trim() });
        setKarute((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            karute_entries: prev.karute_entries.map((e) =>
              e.id === entryId ? { ...e, content: editContent.trim() } : e
            ),
          };
        });
        setEditingEntryId(null);
        setEditContent("");
        toast.success(t("common.success"));
      } catch {
        toast.error(t("common.error"));
      }
    },
    [editContent, t]
  );

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      try {
        await deleteKaruteEntry(entryId);
        setKarute((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            karute_entries: prev.karute_entries.filter((e) => e.id !== entryId),
          };
        });
        toast.success(t("common.success"));
      } catch {
        toast.error(t("common.error"));
      }
    },
    [t]
  );

  const handleAddEntry = useCallback(async () => {
    if (!newEntryContent.trim() || !karute) return;
    setIsSubmitting(true);
    try {
      const created = await addKaruteEntry({
        karute_id: karute.id,
        category: newEntryCategory,
        content: newEntryContent.trim(),
        confidence: 1.0,
      });
      setKarute((prev) => {
        if (!prev) return null;
        const newEntry: KaruteEntry = {
          id: created.id,
          karute_id: karute.id,
          category: newEntryCategory,
          subcategory: null,
          content: newEntryContent.trim(),
          original_quote: null,
          confidence: 1.0,
          metadata: null,
          created_at: created.created_at,
        };
        return {
          ...prev,
          karute_entries: [...prev.karute_entries, newEntry],
        };
      });
      setAddEntryOpen(false);
      setNewEntryContent("");
      setNewEntryCategory("symptom");
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [karute, newEntryCategory, newEntryContent, t]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (!karute) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <p className="text-sm">{t("common.noData")}</p>
        <Button variant="outline" onClick={() => router.push("/karute")}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const StatusIcon = STATUS_ICON[karute.status] ?? Clock;
  const statusStyle = STATUS_STYLES[karute.status] ?? STATUS_STYLES.draft;

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/karute")}
          >
            <ArrowLeft className="size-4" data-icon="inline-start" />
            {t("common.back")}
          </Button>

          <div className="h-6 w-px bg-border" />

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold">{karute.customer.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                  statusStyle.bg,
                  statusStyle.text
                )}
              >
                <StatusIcon className="size-3" />
                {t(`karute.status.${karute.status}`)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(karute.created_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <ClipboardCopy className="size-3.5" data-icon="inline-start" />
            {t("karute.export")}
          </Button>
          {karute.status !== "approved" && (
            <Button size="sm" onClick={handleApprove}>
              <CheckCircle2 className="size-3.5" data-icon="inline-start" />
              {t("karute.approve")}
            </Button>
          )}
        </div>
      </div>

      {karute.ai_summary && (
        <Card className="border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-violet-500" />
              {t("karute.aiSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/80">
              {karute.ai_summary}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddEntryOpen(true)}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          {t("karute.addEntry")}
        </Button>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">{t("karute.categoriesView")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("karute.timelineView")}</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {newCategoryGroups && (
              <>
                {newCategoryGroups.professional.size > 0 && (
                  <motion.div variants={entryVariants}>
                    <Card
                      className="overflow-hidden border"
                      style={{ borderColor: `${businessTypeConfig.color}30` }}
                    >
                      <div
                        className="flex items-center gap-2.5 px-4 py-3 border-b"
                        style={{
                          backgroundColor: `${businessTypeConfig.color}0a`,
                          borderColor: `${businessTypeConfig.color}30`,
                        }}
                      >
                        <Briefcase
                          className="size-4"
                          style={{ color: businessTypeConfig.color }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: businessTypeConfig.color }}
                        >
                          職種関連
                        </span>
                        <span
                          className="ml-1 text-xs opacity-60"
                          style={{ color: businessTypeConfig.color }}
                        >
                          {businessTypeConfig.label}
                        </span>
                        <span
                          className="ml-auto inline-flex size-5 items-center justify-center rounded-full text-[0.6rem] font-bold"
                          style={{
                            backgroundColor: `${businessTypeConfig.color}15`,
                            color: businessTypeConfig.color,
                          }}
                        >
                          {[...newCategoryGroups.professional.values()].reduce(
                            (n, e) => n + e.length,
                            0
                          )}
                        </span>
                      </div>

                      <div>
                        {[...newCategoryGroups.professional.entries()].map(
                          ([subcat, entries]) => (
                            <div key={subcat}>
                              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/30">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {subcat}
                                </span>
                                <span className="text-[0.6rem] text-muted-foreground/60">
                                  ({entries.length})
                                </span>
                              </div>
                              <div className="divide-y divide-border/50">
                                {entries.map((entry) => (
                                  <EntryRow
                                    key={entry.id}
                                    entry={entry}
                                    isEditing={editingEntryId === entry.id}
                                    editContent={editContent}
                                    onEditContentChange={setEditContent}
                                    onStartEdit={() => handleStartEdit(entry)}
                                    onCancelEdit={handleCancelEdit}
                                    onSaveEdit={() =>
                                      handleSaveEdit(entry.id)
                                    }
                                    onDelete={() =>
                                      handleDeleteEntry(entry.id)
                                    }
                                    config={PROFESSIONAL_ENTRY_CONFIG}
                                    t={t}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {newCategoryGroups.personal.size > 0 && (
                  <motion.div variants={entryVariants}>
                    <Card
                      className={cn(
                        "overflow-hidden border",
                        PERSONAL_ENTRY_CONFIG.border
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-3 border-b",
                          PERSONAL_ENTRY_CONFIG.bg,
                          PERSONAL_ENTRY_CONFIG.border
                        )}
                      >
                        <Heart
                          className={cn(
                            "size-4",
                            PERSONAL_ENTRY_CONFIG.text
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            PERSONAL_ENTRY_CONFIG.text
                          )}
                        >
                          個人的な話題
                        </span>
                        <span
                          className={cn(
                            "ml-auto inline-flex size-5 items-center justify-center rounded-full text-[0.6rem] font-bold",
                            PERSONAL_ENTRY_CONFIG.bg,
                            PERSONAL_ENTRY_CONFIG.text
                          )}
                        >
                          {[...newCategoryGroups.personal.values()].reduce(
                            (n, e) => n + e.length,
                            0
                          )}
                        </span>
                      </div>

                      <div>
                        {[...newCategoryGroups.personal.entries()].map(
                          ([subcat, entries]) => (
                            <div key={subcat}>
                              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/30">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {subcat}
                                </span>
                                <span className="text-[0.6rem] text-muted-foreground/60">
                                  ({entries.length})
                                </span>
                              </div>
                              <div className="divide-y divide-border/50">
                                {entries.map((entry) => (
                                  <EntryRow
                                    key={entry.id}
                                    entry={entry}
                                    isEditing={editingEntryId === entry.id}
                                    editContent={editContent}
                                    onEditContentChange={setEditContent}
                                    onStartEdit={() => handleStartEdit(entry)}
                                    onCancelEdit={handleCancelEdit}
                                    onSaveEdit={() =>
                                      handleSaveEdit(entry.id)
                                    }
                                    onDelete={() =>
                                      handleDeleteEntry(entry.id)
                                    }
                                    config={PERSONAL_ENTRY_CONFIG}
                                    t={t}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </>
            )}

            {CATEGORY_ORDER.map((category) => {
              const entries = oldCategoryEntries.get(category);
              if (!entries?.length) return null;

              const config = CATEGORY_CONFIG[category];
              const Icon = config.icon;

              return (
                <motion.div key={category} variants={entryVariants}>
                  <Card
                    className={cn(
                      "overflow-hidden border",
                      config.border
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-3 border-b",
                        config.bg,
                        config.border
                      )}
                    >
                      <Icon className={cn("size-4", config.text)} />
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          config.text
                        )}
                      >
                        {t(config.labelKey)}
                      </span>
                      <span
                        className={cn(
                          "ml-auto inline-flex size-5 items-center justify-center rounded-full text-[0.6rem] font-bold",
                          config.bg,
                          config.text
                        )}
                      >
                        {entries.length}
                      </span>
                    </div>

                    <div className="divide-y divide-border/50">
                      {entries.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          isEditing={editingEntryId === entry.id}
                          editContent={editContent}
                          onEditContentChange={setEditContent}
                          onStartEdit={() => handleStartEdit(entry)}
                          onCancelEdit={handleCancelEdit}
                          onSaveEdit={() => handleSaveEdit(entry.id)}
                          onDelete={() => handleDeleteEntry(entry.id)}
                          config={config}
                          t={t}
                        />
                      ))}
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {karute.karute_entries.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
                <p className="text-sm">{t("karute.noEntries")}</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {sortedEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <p className="text-sm">{t("karute.noEntries")}</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-0 divide-y divide-border/30">
                    {sortedEntries.map((entry) => {
                      const category = entry.category as KarteCategory;
                      const config = CATEGORY_CONFIG[category];

                      return (
                        <div
                          key={entry.id}
                          className="relative flex gap-4 py-4 pl-4 pr-4"
                        >
                          <div className="relative z-10 flex shrink-0 items-start pt-0.5">
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full ring-4 ring-background",
                                config?.dot ?? "bg-gray-500"
                              )}
                            >
                              {config && (
                                <config.icon className="size-2.5 text-white" />
                              )}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <CategoryBadge category={category} size="sm" />
                              <span className="text-[0.6rem] text-muted-foreground">
                                {new Date(entry.created_at).toLocaleTimeString(
                                  "ja-JP",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>

                            <p className="text-sm">{entry.content}</p>

                            {entry.original_quote && (
                              <div className="border-l-2 border-muted-foreground/20 pl-3">
                                <p className="text-xs italic text-muted-foreground">
                                  「{entry.original_quote}」
                                </p>
                              </div>
                            )}

                            {entry.confidence != null && (
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      config?.dot ?? "bg-gray-500"
                                    )}
                                    style={{
                                      width: `${entry.confidence * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[0.6rem] text-muted-foreground">
                                  {Math.round(entry.confidence * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("karute.addEntry")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("karute.category")}
              </label>
              <Select
                value={newEntryCategory}
                onValueChange={(val) =>
                  setNewEntryCategory(val as KarteCategory)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const CatIcon = cfg.icon;
                    return (
                      <SelectItem key={cat} value={cat}>
                        <CatIcon className={cn("size-3.5", cfg.text)} />
                        {t(cfg.labelKey)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("karute.content")}
              </label>
              <Textarea
                value={newEntryContent}
                onChange={(e) => setNewEntryContent(e.target.value)}
                placeholder={t("karute.entryPlaceholder")}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddEntryOpen(false);
                  setNewEntryContent("");
                  setNewEntryCategory("symptom");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={!newEntryContent.trim() || isSubmitting}
              >
                <Plus className="size-3.5" data-icon="inline-start" />
                {t("common.add")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

interface EntryRowProps {
  entry: KaruteEntry;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  config: (typeof CATEGORY_CONFIG)[KarteCategory];
  t: (key: string) => string;
}

function EntryRow({
  entry,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  config,
  t,
}: EntryRowProps) {
  return (
    <div className="group px-4 py-3 transition-colors hover:bg-muted/30">
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <Textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                <X className="size-3.5" data-icon="inline-start" />
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={onSaveEdit}>
                <Check className="size-3.5" data-icon="inline-start" />
                {t("common.save")}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm">{entry.content}</p>

                {entry.original_quote && (
                  <div className="border-l-2 border-muted-foreground/20 pl-3">
                    <p className="text-xs italic text-muted-foreground">
                      「{entry.original_quote}」
                    </p>
                  </div>
                )}

                {entry.confidence != null && (
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          config.dot
                        )}
                        style={{
                          width: `${entry.confidence * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={onStartEdit}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
