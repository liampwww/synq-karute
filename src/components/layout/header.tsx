"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  LogOut,
  User,
  Mic,
  Menu,
  Users,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useRecordingStore } from "@/stores/recording-store";
import { useAuthStore } from "@/stores/auth-store";
import { logout } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS } from "@/components/layout/sidebar";

interface HeaderProps {
  children?: ReactNode;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const PAGE_TITLE_MAP: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/customers": "nav.customers",
  "/appointments": "nav.appointments",
  "/karute": "nav.karute",
  "/recording": "nav.recording",
  "/ask-ai": "nav.askAi",
  "/settings": "nav.settings",
};

export function Header({ children }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [allStaff, setAllStaff] = useState<Tables<"staff">[]>([]);
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const isRecording = useRecordingStore((s) => s.isRecording);
  const elapsedSeconds = useRecordingStore((s) => s.elapsedSeconds);
  const staff = useAuthStore((s) => s.staff);
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    if (!organization?.id) return;
    const supabase = createClient();
    supabase
      .from("staff")
      .select("*")
      .eq("org_id", organization.id)
      .then(({ data }) => {
        if (data) setAllStaff(data as Tables<"staff">[]);
      });
  }, [organization?.id]);

  const switchStaff = useCallback(
    (s: Tables<"staff">) => {
      useAuthStore.getState().setStaff(s);
    },
    []
  );

  const titleKey =
    Object.entries(PAGE_TITLE_MAP).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ?? "nav.dashboard";

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");
    html.classList.toggle("dark");
    localStorage.setItem("synq-karute-theme", isDark ? "light" : "dark");
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "ja" ? "en" : "ja");
  }, [locale, setLocale]);

  const initials = staff?.name
    ? staff.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden" />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="flex h-16 items-center gap-2.5 px-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                S
              </div>
              <SheetTitle className="text-base font-semibold tracking-tight">
                SYNQ カルテ
              </SheetTitle>
            </div>
            <Separator />
            <nav className="px-3 py-3">
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={key}>
                      <Link
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                          "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Icon className="size-5" />
                        <span>{t(`nav.${key}`)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>

        {children || (
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {t(titleKey)}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 mr-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </span>
            <Mic className="size-3.5 text-red-500" />
            <span className="text-xs font-medium text-red-500 tabular-nums">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleLocale}
          className="text-muted-foreground hover:text-foreground"
        >
          <span className="text-xs font-semibold">
            {locale === "ja" ? "EN" : "JP"}
          </span>
          <span className="sr-only">Toggle language</span>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {allStaff.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <Users className="size-4" />
              <span className="text-xs font-medium max-w-[80px] truncate">
                {staff?.name}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel>スタッフ切替</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allStaff.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => switchStaff(s)}
                  className="gap-2"
                >
                  {s.id === staff?.id && <Check className="size-3.5" />}
                  {s.id !== staff?.id && <span className="w-3.5" />}
                  <span>{s.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.role}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full ml-1"
              />
            }
          >
            <Avatar size="sm">
              {staff?.avatar_url && <AvatarImage src={staff.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5 py-1">
                <span className="text-sm font-medium">
                  {staff?.name ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {staff?.email ?? ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="size-4" />
              <span>{t("auth.profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut className="size-4" />
              <span>{t("auth.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
