"use client";

import { useState } from "react";
import { Check, AlertTriangle, X } from "lucide-react";

import type { FieldMapping, DedupStrategy, TargetTable } from "@/lib/migration/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TARGET_OPTIONS: { value: string; label: string; table: TargetTable }[] = [
  { value: "customers.name", label: "顧客名", table: "customers" },
  { value: "customers.name_kana", label: "フリガナ", table: "customers" },
  { value: "customers.phone", label: "電話番号", table: "customers" },
  { value: "customers.email", label: "メール", table: "customers" },
  { value: "customers.notes", label: "メモ", table: "customers" },
  { value: "customers.tags", label: "タグ", table: "customers" },
  { value: "timeline_events.event_date", label: "来店日", table: "timeline_events" },
  { value: "timeline_events.title", label: "施術/サービス", table: "timeline_events" },
  { value: "timeline_events.staff_name", label: "担当スタッフ", table: "timeline_events" },
  { value: "timeline_events.notes", label: "施術メモ", table: "timeline_events" },
  { value: "timeline_events.amount", label: "金額", table: "timeline_events" },
  { value: "__skip__", label: "スキップ（インポートしない）", table: "customers" },
];

interface MappingEditorProps {
  mappings: FieldMapping[];
  sampleRows: Record<string, unknown>[];
  onConfirm: (mappings: FieldMapping[], dedupStrategy: DedupStrategy) => void;
  onBack: () => void;
}

export function MappingEditor({
  mappings: initialMappings,
  sampleRows,
  onConfirm,
  onBack,
}: MappingEditorProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(
    initialMappings.map((m) => ({ ...m, confirmed: m.confidence >= 0.8 }))
  );
  const [dedupStrategy, setDedupStrategy] = useState<DedupStrategy>("skip");

  const updateMapping = (index: number, targetValue: string) => {
    setMappings((prev) => {
      const updated = [...prev];
      if (targetValue === "__skip__") {
        updated[index] = {
          ...updated[index],
          targetTable: "customers",
          targetField: "",
          confidence: 0,
          confirmed: true,
        };
      } else {
        const [table, field] = targetValue.split(".");
        updated[index] = {
          ...updated[index],
          targetTable: table as TargetTable,
          targetField: field,
          confirmed: true,
        };
      }
      return updated;
    });
  };

  const confirmedCount = mappings.filter(
    (m) => m.confirmed && m.targetField
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            カラムマッピング確認
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            各カラムの対応先を確認・修正してください
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {mappings.map((mapping, index) => {
            const sampleValue = sampleRows[0]?.[mapping.sourceField];
            const currentTarget = mapping.targetField
              ? `${mapping.targetTable}.${mapping.targetField}`
              : "__skip__";

            return (
              <div
                key={mapping.sourceField}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {mapping.sourceField}
                  </p>
                  {sampleValue != null && (
                    <p className="text-xs text-muted-foreground truncate">
                      例: {String(sampleValue)}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {mapping.confidence >= 0.8 ? (
                    <Check className="size-4 text-green-500" />
                  ) : mapping.confidence >= 0.5 ? (
                    <AlertTriangle className="size-4 text-yellow-500" />
                  ) : (
                    <X className="size-4 text-muted-foreground/30" />
                  )}
                </div>

                <Select
                  value={currentTarget}
                  onValueChange={(v) => updateMapping(index, v ?? currentTarget)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="マッピング先を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {sampleRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">サンプルデータプレビュー</CardTitle>
            <p className="text-sm text-muted-foreground">
              最初の{Math.min(sampleRows.length, 5)}行のデータ（マッピング確認用）
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {mappings.slice(0, 8).map((m) => (
                      <th
                        key={m.sourceField}
                        className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                      >
                        <div>{m.sourceField}</div>
                        {m.targetField && (
                          <div className="text-[10px] font-normal text-primary">
                            → {m.targetField}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.slice(0, 5).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b last:border-0">
                      {mappings.slice(0, 8).map((m) => (
                        <td
                          key={m.sourceField}
                          className="px-3 py-1.5 text-muted-foreground whitespace-nowrap max-w-[180px] truncate"
                        >
                          {row[m.sourceField] != null ? String(row[m.sourceField]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappings.length > 8 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                +{mappings.length - 8} 列（テーブルには最初の8列のみ表示）
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">重複処理</CardTitle>
          <p className="text-sm text-muted-foreground">
            既存の顧客と重複した場合の処理方法
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              {
                value: "skip" as const,
                label: "スキップ",
                desc: "既存データを保持",
              },
              {
                value: "merge" as const,
                label: "マージ",
                desc: "不足情報を補完",
              },
              {
                value: "create_new" as const,
                label: "新規作成",
                desc: "常に新規登録",
              },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={dedupStrategy === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDedupStrategy(opt.value)}
                className="flex-1"
              >
                <div className="text-center">
                  <span>{opt.label}</span>
                  <br />
                  <span className="text-[10px] opacity-70">{opt.desc}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          戻る
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {confirmedCount} / {mappings.length} カラム
          </Badge>
          <Button
            onClick={() =>
              onConfirm(
                mappings.filter((m) => m.confirmed && m.targetField),
                dedupStrategy
              )
            }
          >
            インポート開始
          </Button>
        </div>
      </div>
    </div>
  );
}
