"use client";

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/context";

const CACHE_KEY = "synq-karute-translations";
const MAX_CACHE = 300;

function loadCache(): Map<string, string> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as [string, string][];
    return new Map(arr.slice(-MAX_CACHE));
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, string>) {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(cache.entries()).slice(-MAX_CACHE);
    localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

const memoryCache = new Map<string, string>();

function getCached(text: string): string | null {
  const cached = memoryCache.get(text);
  if (cached) return cached;
  const stored = loadCache().get(text);
  if (stored) {
    memoryCache.set(text, stored);
    return stored;
  }
  return null;
}

function setCached(text: string, translated: string) {
  memoryCache.set(text, translated);
  const cache = loadCache();
  cache.set(text, translated);
  saveCache(cache);
}

function looksLikeJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

export function useTranslatedText(text: string | null | undefined): {
  translated: string | null;
  isLoading: boolean;
} {
  const { locale } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const needsTranslation =
    locale === "en" &&
    text &&
    text.trim().length > 0 &&
    looksLikeJapanese(text);

  useEffect(() => {
    if (!needsTranslation) {
      setTranslated(null);
      setIsLoading(false);
      return;
    }

    const trimmed = text!.trim();
    const cached = getCached(trimmed);
    if (cached) {
      setTranslated(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const result = data.translated ?? trimmed;
        setCached(trimmed, result);
        setTranslated(result);
      })
      .catch(() => {
        if (!cancelled) setTranslated(trimmed);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [needsTranslation, text]);

  if (!text) return { translated: null, isLoading: false };
  if (locale !== "en") return { translated: text, isLoading: false };
  if (translated) return { translated, isLoading: false };
  return { translated: isLoading ? null : text, isLoading };
}
