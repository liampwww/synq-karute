"use client";

import { type ReactNode, useEffect, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n/context";
import { type Locale, defaultLocale } from "@/lib/i18n/config";
import { useServiceWorker } from "@/lib/hooks/use-service-worker";

import jaMessages from "../../public/locales/ja/common.json";
import enMessages from "../../public/locales/en/common.json";

const messages = {
  ja: jaMessages,
  en: enMessages,
} as const;

function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("synq-karute-theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  if (!mounted) return <>{children}</>;
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [initialLocale, setInitialLocale] = useState<Locale>(defaultLocale);

  useServiceWorker();

  useEffect(() => {
    const stored = localStorage.getItem("synq-karute-locale") as Locale | null;
    if (stored && (stored === "ja" || stored === "en")) {
      setInitialLocale(stored);
    }
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider initialLocale={initialLocale} messages={messages}>
        <TooltipProvider>{children}</TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
