import type {
  DataConnector,
  ConnectorResult,
  NormalizedRecord,
  FieldMapping,
  TargetTable,
} from "../types";
import { detectFieldMappings } from "../importer/schema-detector";

const ARRAY_KEY_CANDIDATES = [
  "data",
  "records",
  "customers",
  "items",
  "results",
  "rows",
  "entries",
  "list",
];

function extractArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => item != null && typeof item === "object" && !Array.isArray(item));
  }
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    for (const key of ARRAY_KEY_CANDIDATES) {
      const val = obj[key];
      if (Array.isArray(val)) {
        return val.filter((item): item is Record<string, unknown> => item != null && typeof item === "object" && !Array.isArray(item));
      }
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) {
        return val.filter((item): item is Record<string, unknown> => item != null && typeof item === "object" && !Array.isArray(item));
      }
    }
  }
  return [];
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function flattenRow(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = stringifyValue(value);
  }
  return result;
}

export class JsonParserConnector implements DataConnector {
  readonly providerId = "json";
  readonly providerLabel = "JSON";

  async parseFile(
    buffer: Buffer,
    _fileName: string
  ): Promise<ConnectorResult> {
    const content = buffer.toString("utf-8");
    const parsed: unknown = JSON.parse(content);
    const rows = extractArray(parsed);

    const normalized: NormalizedRecord[] = rows.map((row, index) => {
      const stringified = flattenRow(row);
      return {
        _targetTable: "customers" as TargetTable,
        _sourceIndex: index,
        _raw: row,
        fields: stringified,
      };
    });

    const columns =
      rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      records: normalized,
      totalCount: normalized.length,
      sourceMetadata: {
        columns,
        columnCount: columns.length,
      },
    };
  }

  suggestMappings(sample: NormalizedRecord[]): FieldMapping[] {
    if (sample.length === 0) return [];
    const columns = Object.keys(sample[0]._raw);
    return detectFieldMappings(columns);
  }
}
