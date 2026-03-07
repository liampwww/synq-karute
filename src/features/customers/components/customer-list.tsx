"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { getCustomers, createCustomer } from "@/features/customers/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerForm } from "./customer-form";

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

export function CustomerList() {
  const { t } = useI18n();
  const router = useRouter();
  const { organization } = useAuthStore();

  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!organization) return;

    try {
      const data = await getCustomers(
        organization.id,
        search.trim() || undefined
      );
      setCustomers(data);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [organization, search, t]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers, search]);

  const handleCreate = useCallback(
    async (formData: {
      name: string;
      name_kana: string;
      phone: string;
      email: string;
      notes: string;
      tags: string[];
    }) => {
      if (!organization) return;

      try {
        await createCustomer({
          org_id: organization.id,
          name: formData.name,
          name_kana: formData.name_kana || null,
          phone: formData.phone || null,
          email: formData.email || null,
          notes: formData.notes || null,
          tags: formData.tags,
        });
        toast.success(t("common.success"));
        setDialogOpen(false);
        await fetchCustomers();
      } catch {
        toast.error(t("common.error"));
      }
    },
    [organization, fetchCustomers, t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("customers.search")}
            className="pl-9"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" data-icon="inline-start" />
                {t("customers.addCustomer")}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("customers.addCustomer")}</DialogTitle>
            </DialogHeader>
            <CustomerForm
              onSubmit={handleCreate}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl bg-muted/50"
            />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground"
        >
          <Users className="size-10 opacity-40" />
          <p className="text-sm">{t("customers.noCustomers")}</p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {customers.map((customer) => (
            <motion.div key={customer.id} variants={itemVariants}>
              <Card
                className="cursor-pointer p-4 transition-all hover:shadow-md hover:border-foreground/15 active:scale-[0.98]"
                onClick={() => router.push(`/customers/${customer.id}`)}
              >
                <div className="space-y-3">
                  <div>
                    <p className="font-medium leading-tight">{customer.name}</p>
                    {customer.name_kana && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {customer.name_kana}
                      </p>
                    )}
                  </div>

                  {customer.phone && (
                    <p className="text-sm text-muted-foreground">
                      {customer.phone}
                    </p>
                  )}

                  {customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[0.65rem]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
