"use client";

import { useState } from "react";
import {
  Database,
  Upload,
  History,
  Globe,
  FileSpreadsheet,
  FileJson,
  Plug,
  Monitor,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MigrationWizard } from "@/features/migration/components/migration-wizard";
import { ImportHistory } from "@/features/migration/components/import-history";

const CONNECTOR_SOURCE_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  csv: { labelKey: "csvLabel", descKey: "csvDesc" },
  hot_pepper: { labelKey: "hotpepperLabel", descKey: "hotpepperDesc" },
  square: { labelKey: "squareLabel", descKey: "squareDesc" },
  mindbody: { labelKey: "mindbodyLabel", descKey: "mindbodyDesc" },
  api_generic: { labelKey: "apiLabel", descKey: "apiDesc" },
  browser_assist: { labelKey: "browserLabel", descKey: "browserDesc" },
};

const CONNECTOR_SOURCES = [
  { id: "csv", icon: FileSpreadsheet, status: "available" as const },
  { id: "hot_pepper", icon: Globe, status: "file_only" as const },
  { id: "square", icon: Globe, status: "file_only" as const },
  { id: "mindbody", icon: Globe, status: "file_only" as const },
  { id: "api_generic", icon: Plug, status: "coming_soon" as const },
  { id: "browser_assist", icon: Monitor, status: "coming_soon" as const },
];

export default function MigrationPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("import");

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Database className="size-6" />
          {t("migration.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("migration.subtitle")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-1.5">
            <Upload className="size-3.5" />
            {t("migration.import")}
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-1.5">
            <Plug className="size-3.5" />
            {t("migration.dataSources")}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="size-3.5" />
            {t("migration.history")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4">
          <MigrationWizard />
        </TabsContent>

        <TabsContent value="sources" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("migration.supportedSources")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("migration.sourcesDesc")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {CONNECTOR_SOURCES.map((source) => {
                  const Icon = source.icon;
                  const keys = CONNECTOR_SOURCE_KEYS[source.id];
                  const statusLabelKey = source.status === "available" ? "available" : source.status === "file_only" ? "fileOnly" : "comingSoon";
                  const badgeVariant = source.status === "available" ? "default" : source.status === "file_only" ? "secondary" : "outline";
                  return (
                    <div
                      key={source.id}
                      className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${source.status === "coming_soon" ? "opacity-60" : "hover:border-primary/50 cursor-pointer"}`}
                      onClick={() => {
                        if (source.status !== "coming_soon") {
                          setActiveTab("import");
                        }
                      }}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{keys ? t(`migration.${keys.labelKey}`) : source.id}</p>
                          <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                            {t(`migration.${statusLabelKey}`)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {keys ? t(`migration.${keys.descKey}`) : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="size-4" />
                インポート対応フォーマット
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { format: "CSV", desc: "カンマ区切り / TSV", supported: true },
                  { format: "Excel", desc: ".xlsx / .xls", supported: true },
                  { format: "JSON", desc: "配列 / ネスト対応", supported: true },
                  { format: "ZIP", desc: "複数ファイルまとめて", supported: false },
                  { format: "API", desc: "RESTful API", supported: false },
                  { format: "ブラウザ", desc: "ガイド付き取込", supported: false },
                ].map((item) => (
                  <div
                    key={item.format}
                    className={`rounded-lg border p-3 text-center ${item.supported ? "" : "opacity-50"}`}
                  >
                    <p className="text-sm font-medium">{item.format}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    <Badge
                      variant={item.supported ? "default" : "outline"}
                      className="text-[9px] mt-1 px-1 py-0"
                    >
                      {item.supported ? "対応済" : "準備中"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ImportHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
