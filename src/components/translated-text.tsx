"use client";

import { useTranslatedText } from "@/lib/hooks/use-translate";

interface TranslatedTextProps {
  text: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
}

export function TranslatedText({
  text,
  className,
  as: Tag = "span",
}: TranslatedTextProps) {
  const { translated, isLoading } = useTranslatedText(text);

  if (!text) return null;

  const display = translated ?? text;
  return (
    <Tag className={className}>
      {display}
      {isLoading && (
        <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-muted-foreground/30" />
      )}
    </Tag>
  );
}
