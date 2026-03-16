"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { uploadMigrationFile } from "@/features/migration/api";
import type { AnalysisResult } from "@/lib/migration/types";
import { useAuthStore } from "@/stores/auth-store";

interface BrowserAssistPasteProps {
  onSuccess: (jobId: string, analysis: AnalysisResult) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

export function BrowserAssistPaste({
  onSuccess,
  isUploading,
  setIsUploading,
}: BrowserAssistPasteProps) {
  const { t } = useI18n();
  const organization = useAuthStore((s) => s.organization);
  const activeStaff = useAuthStore((s) => s.staff);

  const [pastedText, setPastedText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [error, setError] = useState<string | null>(null);

  const detectFormat = (text: string): "csv" | "json" => {
    const trimmed = text.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      return "json";
    }
    return "csv";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !activeStaff || !pastedText.trim()) return;

    setError(null);
    setIsUploading(true);
    try {
      const detected = detectFormat(pastedText);
      const mimeType = detected === "json" ? "application/json" : "text/csv";
      const ext = detected === "json" ? "json" : "csv";
      const blob = new Blob([pastedText], { type: mimeType });
      const file = new File([blob], `browser-assist.${ext}`, {
        type: mimeType,
      });

      const result = await uploadMigrationFile(
        file,
        organization.id,
        activeStaff.id
      );
      onSuccess(result.jobId, result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = () => {
    setFormat(detectFormat(pastedText));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="size-5" />
          {t("migration.browserLabel")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("migration.browserDesc")}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("migration.browserPasteHint")}
            </p>
            <Textarea
              placeholder={t("migration.browserPastePlaceholder")}
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                setFormat(detectFormat(e.target.value));
              }}
              onPaste={handlePaste}
              disabled={isUploading}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {t("migration.browserFormatLabel")}: {format.toUpperCase()}
            </span>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={isUploading || !pastedText.trim()}>
            {isUploading ? t("migration.apiFetching") : t("migration.browserImport")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
