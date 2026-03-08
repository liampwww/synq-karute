import type { FieldMapping, TargetTable } from "../types";

interface FieldPattern {
  patterns: RegExp[];
  target: { table: TargetTable; field: string };
  transform: FieldMapping["transform"];
}

const FIELD_PATTERNS: FieldPattern[] = [
  {
    patterns: [/^(名前|氏名|name|顧客名|お名前|customer.?name|full.?name)$/i],
    target: { table: "customers", field: "name" },
    transform: "none",
  },
  {
    patterns: [/^(姓|last.?name|family.?name|苗字|名字)$/i],
    target: { table: "customers", field: "name" },
    transform: "name_split",
  },
  {
    patterns: [/^(名|first.?name|given.?name)$/i],
    target: { table: "customers", field: "name" },
    transform: "name_split",
  },
  {
    patterns: [/^(フリガナ|カナ|kana|ふりがな|name.?kana|読み)$/i],
    target: { table: "customers", field: "name_kana" },
    transform: "none",
  },
  {
    patterns: [/^(電話|TEL|phone|携帯|連絡先|mobile|tel.?number)$/i],
    target: { table: "customers", field: "phone" },
    transform: "phone_normalize",
  },
  {
    patterns: [/^(メール|email|mail|Eメール|e.?mail)$/i],
    target: { table: "customers", field: "email" },
    transform: "none",
  },
  {
    patterns: [/^(生年月日|誕生日|birthday|birth.?date|dob)$/i],
    target: { table: "customers", field: "date_of_birth" },
    transform: "date_parse",
  },
  {
    patterns: [/^(性別|gender|sex)$/i],
    target: { table: "customers", field: "gender" },
    transform: "none",
  },
  {
    patterns: [/^(住所|address|addr|所在地)$/i],
    target: { table: "customers", field: "address" },
    transform: "none",
  },
  {
    patterns: [/^(来店日|予約日|日時|date|visit.?date|appointment.?date|施術日)$/i],
    target: { table: "timeline_events", field: "event_date" },
    transform: "date_parse",
  },
  {
    patterns: [/^(メニュー|施術|service|コース|施術内容|treatment|menu)$/i],
    target: { table: "timeline_events", field: "title" },
    transform: "none",
  },
  {
    patterns: [/^(メモ|備考|notes|ノート|コメント|memo|remark|特記)$/i],
    target: { table: "customers", field: "notes" },
    transform: "none",
  },
  {
    patterns: [/^(タグ|分類|category|種別|tags|ラベル|label)$/i],
    target: { table: "customers", field: "tags" },
    transform: "tags_split",
  },
  {
    patterns: [/^(担当|スタッフ|staff|担当者|technician|stylist|trainer)$/i],
    target: { table: "timeline_events", field: "staff_name" },
    transform: "none",
  },
  {
    patterns: [/^(金額|料金|price|amount|売上|単価|合計)$/i],
    target: { table: "timeline_events", field: "amount" },
    transform: "none",
  },
  {
    patterns: [/^(来店回数|回数|visit.?count|visits)$/i],
    target: { table: "customers", field: "visit_count" },
    transform: "none",
  },
  {
    patterns: [/^(最終来店|last.?visit|最終来店日)$/i],
    target: { table: "customers", field: "last_visit" },
    transform: "date_parse",
  },
  {
    patterns: [/^(登録日|created|registered|初回来店|初来店)$/i],
    target: { table: "customers", field: "first_visit" },
    transform: "date_parse",
  },
];

export function detectFieldMappings(columns: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  for (const column of columns) {
    const trimmed = column.trim();
    let matched = false;

    for (const pattern of FIELD_PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmed)) {
          mappings.push({
            sourceField: column,
            targetTable: pattern.target.table,
            targetField: pattern.target.field,
            transform: pattern.transform,
            confidence: 0.9,
            confirmed: false,
          });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      for (const pattern of FIELD_PATTERNS) {
        for (const regex of pattern.patterns) {
          const fuzzySource = regex.source.replace(/\^|\$/g, "");
          const fuzzyRegex = new RegExp(fuzzySource, "i");
          if (fuzzyRegex.test(trimmed)) {
            mappings.push({
              sourceField: column,
              targetTable: pattern.target.table,
              targetField: pattern.target.field,
              transform: pattern.transform,
              confidence: 0.6,
              confirmed: false,
            });
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    if (!matched) {
      mappings.push({
        sourceField: column,
        targetTable: "customers",
        targetField: "",
        transform: "none",
        confidence: 0,
        confirmed: false,
      });
    }
  }

  return mappings;
}

export async function detectFieldMappingsWithAI(
  columns: string[],
  sampleRows: Record<string, unknown>[]
): Promise<FieldMapping[]> {
  const heuristicMappings = detectFieldMappings(columns);

  const unmappedColumns = heuristicMappings.filter(
    (m) => m.confidence < 0.5
  );

  if (unmappedColumns.length === 0) {
    return heuristicMappings;
  }

  try {
    const response = await fetch("/api/migration/analyze-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unmappedColumns: unmappedColumns.map((m) => m.sourceField),
        sampleData: sampleRows.slice(0, 5),
        existingMappings: heuristicMappings
          .filter((m) => m.confidence >= 0.5)
          .map((m) => ({
            source: m.sourceField,
            target: `${m.targetTable}.${m.targetField}`,
          })),
      }),
    });

    if (!response.ok) return heuristicMappings;

    const aiMappings: Array<{
      sourceField: string;
      targetTable: TargetTable;
      targetField: string;
      transform: FieldMapping["transform"];
      confidence: number;
    }> = await response.json();

    for (const aiMapping of aiMappings) {
      const idx = heuristicMappings.findIndex(
        (m) => m.sourceField === aiMapping.sourceField
      );
      if (idx >= 0) {
        heuristicMappings[idx] = {
          ...aiMapping,
          confirmed: false,
        };
      }
    }
  } catch {
    // AI detection failed; fall back to heuristic mappings
  }

  return heuristicMappings;
}
