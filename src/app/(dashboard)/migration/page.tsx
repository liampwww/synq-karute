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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MigrationWizard } from "@/features/migration/components/migration-wizard";
import { ImportHistory } from "@/features/migration/components/import-history";

const CONNECTOR_SOURCES = [
  {
    id: "csv",
    label: "CSV / Excel / JSON",
    description: "ファイルをアップロードしてインポート",
    icon: FileSpreadsheet,
    status: "available" as const,
  },
  {
    id: "hot_pepper",
    label: "ホットペッパービューティー",
    description: "管理画面からエクスポートしたCSVをインポート",
    icon: Globe,
    status: "file_only" as const,
  },
  {
    id: "square",
    label: "Square Appointments",
    description: "Squareからエクスポートした顧客データをインポート",
    icon: Globe,
    status: "file_only" as const,
  },
  {
    id: "mindbody",
    label: "Mindbody",
    description: "Mindbodyからエクスポートした顧客データをインポート",
    icon: Globe,
    status: "file_only" as const,
  },
  {
    id: "api_generic",
    label: "API コネクター",
    description: "外部システムのAPIから直接データを取得",
    icon: Plug,
    status: "coming_soon" as const,
  },
  {
    id: "browser_assist",
    label: "ブラウザアシスト取込",
    description: "ブラウザ経由でガイド付きデータ取得",
    icon: Monitor,
    status: "coming_soon" as const,
  },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  available: { label: "利用可能", variant: "default" },
  file_only: { label: "ファイル対応", variant: "secondary" },
  coming_soon: { label: "準備中", variant: "outline" },
};

export default function MigrationPage() {
  const [activeTab, setActiveTab] = useState("import");

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Database className="size-6" />
          ユニバーサルインポーター
        </h1>
        <p className="text-muted-foreground mt-1">
          他のシステムからの顧客データを SYNQ Karute の統合レコードにインポート
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-1.5">
            <Upload className="size-3.5" />
            インポート
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-1.5">
            <Plug className="size-3.5" />
            データソース
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="size-3.5" />
            履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4">
          <MigrationWizard />
        </TabsContent>

        <TabsContent value="sources" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">対応データソース</CardTitle>
              <p className="text-sm text-muted-foreground">
                さまざまな予約システム・EMRからのデータインポートに対応しています。
                ファイルベースのインポートは今すぐ利用可能です。
                APIコネクターは順次対応予定です。
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {CONNECTOR_SOURCES.map((source) => {
                  const Icon = source.icon;
                  const statusConfig = STATUS_LABELS[source.status];
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
                          <p className="text-sm font-medium">{source.label}</p>
                          <Badge variant={statusConfig.variant} className="text-[10px] px-1.5 py-0">
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {source.description}
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
