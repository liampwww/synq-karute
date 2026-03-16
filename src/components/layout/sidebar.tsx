"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Mic,
  MessageSquare,
  Database,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useRecordingStore } from "@/stores/recording-store";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;

export const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "customers", href: "/customers", icon: Users },
  { key: "appointments", href: "/appointments", icon: Calendar },
  { key: "karute", href: "/karute", icon: FileText },
  { key: "recording", href: "/recording", icon: Mic },
  { key: "askAi", href: "/ask-ai", icon: MessageSquare },
  { key: "migration", href: "/migration", icon: Database },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();
  const isRecording = useRecordingStore((s) => s.isRecording);

  return (
    <motion.aside
      className="flex h-screen flex-col border-r border-sidebar-border bg-sidebar"
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex h-16 items-center gap-2.5 overflow-hidden px-4 shrink-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
          S
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              className="text-base font-semibold tracking-tight text-sidebar-foreground whitespace-nowrap"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              SYNQ カルテ
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            const showRecordingDot = key === "recording" && isRecording;

            const linkElement = (
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                  collapsed && "justify-center px-2"
                )}
              >
                <div className="relative shrink-0">
                  <Icon className="size-5" />
                  {showRecordingDot && (
                    <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-sidebar" />
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      className="truncate whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {t(`nav.${key}`)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (collapsed) {
              return (
                <li key={key}>
                  <Tooltip>
                    <TooltipTrigger render={<div />}>
                      {linkElement}
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {t(`nav.${key}`)}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={key}>{linkElement}</li>;
          })}
        </ul>
      </nav>

      <Separator />

      <div className="flex items-center overflow-hidden p-3 shrink-0">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-sidebar-foreground/50 hover:text-sidebar-foreground",
            !collapsed && "w-full justify-start gap-2"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
