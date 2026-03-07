"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { defaultLocale, type Locale } from "./config";

type NestedRecord = { [key: string]: string | NestedRecord };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  messages: NestedRecord;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: NestedRecord, path: string): string {
  const keys = path.split(".");
  let current: string | NestedRecord = obj;

  for (const key of keys) {
    if (typeof current !== "object" || current === null) return path;
    current = current[key];
  }

  return typeof current === "string" ? current : path;
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  messages: Record<Locale, NestedRecord>;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
  messages,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      if (typeof window !== "undefined") {
        localStorage.setItem("synq-karute-locale", newLocale);
        document.documentElement.lang = newLocale;
      }
    },
    []
  );

  const currentMessages = messages[locale];

  const t = useCallback(
    (key: string) => getNestedValue(currentMessages, key),
    [currentMessages]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, messages: currentMessages }),
    [locale, setLocale, t, currentMessages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
