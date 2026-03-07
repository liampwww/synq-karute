"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Mail,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import type { Tables } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerForm } from "./customer-form";

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
        <CardHeader>
          <div className="space-y-1">
            <CardTitle className="text-xl">{customer.name}</CardTitle>
            {customer.name_kana && (
              <p className="text-sm text-muted-foreground">
                {customer.name_kana}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(customer.phone || customer.email) && (
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
            </div>
          )}

          {customer.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("customers.tags")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {customer.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("customers.notes")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                            ? "承認済"
                            : karute.status === "review"
                              ? "レビュー中"
                              : "下書き"}
                        </Badge>
                      </div>

                      {karute.ai_summary && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {karute.ai_summary}
                        </p>
                      )}

                      {proEntries.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            職種関連
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
                                      {entry.subcategory}:{" "}
                                    </span>
                                  )}
                                  {entry.content}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {personalEntries.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            個人的な話題
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
                                      {entry.subcategory}:{" "}
                                    </span>
                                  )}
                                  {entry.content}
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
                          onClick={() => router.push(`/karute/${karute.id}`)}
                        >
                          <FileText className="size-3" data-icon="inline-start" />
                          詳細を見る
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
