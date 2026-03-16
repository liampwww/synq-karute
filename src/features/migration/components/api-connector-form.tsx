"use client";

import { useState } from "react";
import { Plug, Loader2 } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchFromApi } from "@/features/migration/api";
import type { AnalysisResult } from "@/lib/migration/types";
import { useAuthStore } from "@/stores/auth-store";

interface ApiConnectorFormProps {
  onSuccess: (jobId: string, analysis: AnalysisResult) => void;
}

export function ApiConnectorForm({ onSuccess }: ApiConnectorFormProps) {
  const { t } = useI18n();
  const organization = useAuthStore((s) => s.organization);
  const activeStaff = useAuthStore((s) => s.staff);

  const [url, setUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [authValue, setAuthValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !activeStaff) return;

    setError(null);
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authHeader && authValue) {
        headers[authHeader.trim()] = authValue.trim();
      }
      const result = await fetchFromApi(
        url.trim(),
        organization.id,
        activeStaff.id,
        Object.keys(headers).length ? headers : undefined
      );
      onSuccess(result.jobId, result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "API fetch failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="size-5" />
          {t("migration.apiLabel")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("migration.apiDesc")}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">{t("migration.apiUrlLabel")}</Label>
            <Input
              id="api-url"
              type="url"
              placeholder="https://api.example.com/customers"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isLoading}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="auth-header">{t("migration.apiAuthHeader")}</Label>
              <Input
                id="auth-header"
                placeholder="Authorization"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-value">{t("migration.apiAuthValue")}</Label>
              <Input
                id="auth-value"
                type="password"
                placeholder="Bearer xxx"
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("migration.apiFetching")}
              </>
            ) : (
              t("migration.apiFetch")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
