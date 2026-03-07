"use client";

import type { LucideIcon } from "lucide-react";
import {
  Heart,
  Stethoscope,
  Sparkles,
  Coffee,
  CalendarDays,
  ShoppingBag,
  MessageCircle,
  Briefcase,
  User,
} from "lucide-react";

import type { KarteCategory } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface CategoryConfig {
  icon: LucideIcon;
  labelKey: string;
  bg: string;
  text: string;
  dot: string;
  border: string;
}

export const CATEGORY_CONFIG: Record<KarteCategory, CategoryConfig> = {
  symptom: {
    icon: Heart,
    labelKey: "karute.symptom",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    border: "border-rose-200 dark:border-rose-800",
  },
  treatment: {
    icon: Stethoscope,
    labelKey: "karute.treatment",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-800",
  },
  preference: {
    icon: Sparkles,
    labelKey: "karute.preference",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
    border: "border-purple-200 dark:border-purple-800",
  },
  lifestyle: {
    icon: Coffee,
    labelKey: "karute.lifestyle",
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
    border: "border-green-200 dark:border-green-800",
  },
  next_appointment: {
    icon: CalendarDays,
    labelKey: "karute.next_appointment",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800",
  },
  product: {
    icon: ShoppingBag,
    labelKey: "karute.product",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
    border: "border-teal-200 dark:border-teal-800",
  },
  other: {
    icon: MessageCircle,
    labelKey: "karute.other",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-500",
    border: "border-gray-200 dark:border-gray-700",
  },
  professional: {
    icon: Briefcase,
    labelKey: "karute.professional",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    border: "border-sky-200 dark:border-sky-800",
  },
  personal: {
    icon: User,
    labelKey: "karute.personal",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    border: "border-orange-200 dark:border-orange-800",
  },
};

interface CategoryBadgeProps {
  category: KarteCategory;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const { t } = useI18n();
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bg,
        config.text,
        size === "sm" && "px-2 py-0.5 text-[0.65rem]",
        size === "md" && "px-2.5 py-1 text-xs"
      )}
    >
      <Icon className={cn(size === "sm" ? "size-3" : "size-3.5")} />
      {t(config.labelKey)}
    </span>
  );
}
