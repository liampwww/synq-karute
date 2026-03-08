import * as XLSX from "xlsx";

import type {
  DataConnector,
  ConnectorResult,
  NormalizedRecord,
  FieldMapping,
  TargetTable,
} from "../types";
import { detectFieldMappings } from "../importer/schema-detector";

export class ExcelParserConnector implements DataConnector {
  readonly providerId = "excel";
  readonly providerLabel = "Excel ファイル";

  async parseFile(
    buffer: Buffer,
    _fileName: string
  ): Promise<ConnectorResult> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    const normalized: NormalizedRecord[] = records.map((row, index) => {
      const stringified: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        stringified[key] = value != null ? String(value) : null;
      }
      return {
        _targetTable: "customers" as TargetTable,
        _sourceIndex: index,
        _raw: row,
        fields: stringified,
      };
    });

    return {
      records: normalized,
      totalCount: normalized.length,
      sourceMetadata: {
        sheetName,
        sheetCount: workbook.SheetNames.length,
        columns: records.length > 0 ? Object.keys(records[0]) : [],
      },
    };
  }

  suggestMappings(sample: NormalizedRecord[]): FieldMapping[] {
    if (sample.length === 0) return [];
    const columns = Object.keys(sample[0]._raw);
    return detectFieldMappings(columns);
  }
}
