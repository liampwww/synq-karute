"use client";

import { motion } from "framer-motion";

import { useI18n } from "@/lib/i18n/context";
import { CustomerList } from "@/features/customers/components/customer-list";

export default function CustomersPage() {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold tracking-tight">
        {t("customers.title")}
      </h1>
      <CustomerList />
    </motion.div>
  );
}
