"use client";

import { use } from "react";
import { motion } from "framer-motion";

import { KaruteDetail } from "@/features/karute/components/karute-detail";

export default function KaruteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <KaruteDetail karuteId={id} />
    </motion.div>
  );
}
