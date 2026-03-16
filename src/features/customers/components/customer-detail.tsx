"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Mail,
  Pencil,
  Phone,
  Trash2,
  Camera,
  AlertTriangle,
  Activity,
  User,
} from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { TranslatedText } from "@/components/translated-text";
import { createClient } from "@/lib/supabase/client";
import { getBusinessType } from "@/lib/business-types";
import { useAuthStore } from "@/stores/auth-store";
import {
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/features/customers/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerForm } from "./customer-form";
import { CustomerTimeline } from "@/features/timeline/components/customer-timeline";
import { InsightCards } from "@/features/insights/components/insight-cards";
import { CustomerInsightCard } from "@/features/insights/components/customer-insight-card";
import { PhotoGallery } from "@/features/photos/components/photo-gallery";

type KaruteRecord = Tables<"karute_records">;
type KaruteEntry = Tables<"karute_entries">;

interface KaruteWithEntries extends KaruteRecord {
  entries: KaruteEntry[];
}

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

interface CustomerDetailProps {
  customerId: string;
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { t } = useI18n();
  const router = useRouter();
  const organization = useAuthStore((s) => s.organization);

  const [customer, setCustomer] = useState<Tables<"customers"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [karutes, setKarutes] = useState<KaruteWithEntries[]>([]);
  const [karutesLoading, setKarutesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");

  const fetchCustomer = useCallback(async () => {
    try {
      const data = await getCustomer(customerId);
      setCustomer(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  useEffect(() => {
    async function fetchKarutes() {
      if (!organization) return;
      setKarutesLoading(true);
      try {
        const supabase = createClient();
        const { data: records, error: recError } = await supabase
          .from("karute_records")
          .select("*")
          .eq("customer_id", customerId)
          .eq("org_id", organization.id)
          .order("created_at", { ascending: false });

        if (recError) throw recError;
        const typed = (records ?? []) as KaruteRecord[];

        if (typed.length === 0) {
          setKarutes([]);
          return;
        }

        const ids = typed.map((r) => r.id);
        const { data: entries, error: entError } = await supabase
          .from("karute_entries")
          .select("*")
          .in("karute_id", ids);

        if (entError) throw entError;
        const typedEntries = (entries ?? []) as KaruteEntry[];

        const entriesByKarute = new Map<string, KaruteEntry[]>();
        for (const e of typedEntries) {
          const list = entriesByKarute.get(e.karute_id) ?? [];
          list.push(e);
          entriesByKarute.set(e.karute_id, list);
        }

        setKarutes(
          typed.map((r) => ({
            ...r,
            entries: entriesByKarute.get(r.id) ?? [],
          }))
        );
      } catch {
        toast.error(t("common.error"));
      } finally {
        setKarutesLoading(false);
      }
    }
    fetchKarutes();
  }, [customerId, organization, t]);

  const handleUpdate = useCallback(
    async (formData: {
      name: string;
      name_kana: string;
      phone: string;
      email: string;
      notes: string;
      tags: string[];
    }) => {
      try {
        const updated = await updateCustomer(customerId, {
          name: formData.name,
          name_kana: formData.name_kana || null,
          phone: formData.phone || null,
          email: formData.email || null,
          notes: formData.notes || null,
          tags: formData.tags,
        });
        setCustomer(updated);
        toast.success(t("common.success"));
        setEditOpen(false);
      } catch {
        toast.error(t("common.error"));
      }
    },
    [customerId, t]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteCustomer(customerId);
      toast.success(t("common.success"));
      router.push("/customers");
    } catch {
      toast.error(t("common.error"));
    }
  }, [customerId, router, t]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <p className="text-sm">{t("common.noData")}</p>
        <Button variant="outline" onClick={() => router.push("/customers")}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const daysSinceLastVisit = customer.last_visit_at
    ? differenceInDays(new Date(), new Date(customer.last_visit_at))
    : null;

  const profile = customer.profile as Record<string, unknown> | null;
  const hasAiSummary = !!(profile?.ai_summary && typeof profile.ai_summary === "string");

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/customers")}
        >
          <ArrowLeft className="size-4" data-icon="inline-start" />
          {t("common.back")}
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" data-icon="inline-start" />
            {t("common.edit")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" data-icon="inline-start" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-bold">{customer.name}</h2>
                {customer.name_kana && (
                  <p className="text-sm text-muted-foreground">
                    {customer.name_kana}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.first_visit_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-4" />
                    <span>{t("profile.firstVisitShort")}: {format(new Date(customer.first_visit_at), "yyyy/MM/dd")}</span>
                  </div>
                )}
              </div>

              {customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              {customer.visit_count > 0 && (
                <div className="rounded-lg border bg-card px-3 py-2 text-center min-w-[80px]">
                  <p className="text-lg font-bold tabular-nums">{customer.visit_count}</p>
                  <p className="text-[10px] text-muted-foreground">{t("customer.visits")}</p>
                </div>
              )}
              {daysSinceLastVisit != null && (
                <div className={`rounded-lg border px-3 py-2 text-center min-w-[80px] ${daysSinceLastVisit > 90 ? "border-red-500/30 bg-red-500/5" : daysSinceLastVisit > 60 ? "border-orange-500/30 bg-orange-500/5" : "bg-card"}`}>
                  <p className={`text-lg font-bold tabular-nums ${daysSinceLastVisit > 90 ? "text-red-500" : daysSinceLastVisit > 60 ? "text-orange-500" : ""}`}>
                    {daysSinceLastVisit}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("customer.daysAgo")}</p>
                </div>
              )}
            </div>
          </div>

          {customer.notes && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("customer.notes")}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {daysSinceLastVisit != null && daysSinceLastVisit > 90 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="size-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {t("customer.churnRisk")}: {daysSinceLastVisit} {t("customer.churnRiskDesc")}
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
              {t("customer.churnRiskHint")}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <InsightCards customerId={customerId} />
        </CardContent>
      </Card>

      <CustomerInsightCard customerId={customerId} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline" className="flex items-center gap-1.5">
            <Activity className="size-3.5" />
            {t("tabs.timeline")}
          </TabsTrigger>
          <TabsTrigger value="karute" className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            {t("tabs.karute")}
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-1.5">
            <Camera className="size-3.5" />
            {t("tabs.photos")}
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {t("tabs.details")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <CustomerTimeline
                customerId={customerId}
                onNavigateToKarute={(karuteId) =>
                  router.push(`/karute/${karuteId}`)
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karute" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                {t("customers.karteHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {karutesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-lg bg-muted/50"
                    />
                  ))}
                </div>
              ) : karutes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <FileText className="size-8 opacity-40" />
                  <p className="text-sm">{t("common.noData")}</p>
                  <p className="text-xs text-muted-foreground/70">
                    録音を開始するとAIが自動的にカルテを生成します
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {karutes.map((karute) => {
                    const biz = getBusinessType(karute.business_type);
                    const proEntries = karute.entries.filter(
                      (e) => e.category === "professional"
                    );
                    const personalEntries = karute.entries.filter(
                      (e) => e.category === "personal"
                    );

                    return (
                      <Card key={karute.id} className="border-border/60">
                        <CardContent className="space-y-3 pt-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {format(
                                  new Date(karute.created_at),
                                  "yyyy/MM/dd HH:mm"
                                )}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {biz.icon} {biz.label}
                              </Badge>
                            </div>
                            <Badge
                              variant={
                                karute.status === "approved"
                                  ? "default"
                                  : karute.status === "review"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {karute.status === "approved"
                                ? t("karute.statusApproved")
                                : karute.status === "review"
                                  ? t("karute.statusReview")
                                  : t("karute.statusDraft")}
                            </Badge>
                          </div>

                          {karute.ai_summary && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              <TranslatedText text={karute.ai_summary} as="span" />
                            </p>
                          )}

                          {proEntries.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("karute.professional")}
                              </p>
                              <ul className="space-y-1 pl-1">
                                {proEntries.map((entry) => (
                                  <li
                                    key={entry.id}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                                    <span>
                                      {entry.subcategory && (
                                        <span className="font-medium text-foreground/70">
                                          <TranslatedText text={entry.subcategory} as="span" />:{" "}
                                        </span>
                                      )}
                                      <TranslatedText text={entry.content} as="span" />
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {personalEntries.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("karute.personal")}
                              </p>
                              <ul className="space-y-1 pl-1">
                                {personalEntries.map((entry) => (
                                  <li
                                    key={entry.id}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                                    <span>
                                      {entry.subcategory && (
                                        <span className="font-medium text-foreground/70">
                                          <TranslatedText text={entry.subcategory} as="span" />:{" "}
                                        </span>
                                      )}
                                      <TranslatedText text={entry.content} as="span" />
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                router.push(`/karute/${karute.id}`)
                              }
                            >
                              <FileText
                                className="size-3"
                                data-icon="inline-start"
                              />
                              {t("karute.viewDetails")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <PhotoGallery customerId={customerId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" />
                {t("profile.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("profile.registeredDate")}</p>
                  <p className="text-sm">{format(new Date(customer.created_at), "yyyy/MM/dd")}</p>
                </div>
                {customer.first_visit_at && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("profile.firstVisit")}</p>
                    <p className="text-sm">{format(new Date(customer.first_visit_at), "yyyy/MM/dd")}</p>
                  </div>
                )}
                {customer.last_visit_at && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("profile.lastVisit")}</p>
                    <p className="text-sm">{format(new Date(customer.last_visit_at), "yyyy/MM/dd")}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("profile.totalVisits")}</p>
                  <p className="text-sm">{customer.visit_count ?? 0}</p>
                </div>
              </div>

              {hasAiSummary && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("karute.aiSummary")}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      <TranslatedText text={profile!.ai_summary as string} as="span" />
                    </p>
                  </div>
                </>
              )}

              {customer.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("profile.staffNotes")}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("common.edit")}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={customer}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.confirm")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("customers.deleteConfirm")}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
