import { parse } from "csv-parse/sync";
import * as iconv from "iconv-lite";

import type {
  DataConnector,
  ConnectorResult,
  NormalizedRecord,
  FieldMapping,
  TargetTable,
} from "../types";
import { detectFieldMappings } from "../importer/schema-detector";

function detectEncoding(buffer: Buffer): string {
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf-16le";
  }

  let sjisScore = 0;
  let utf8Score = 0;

  for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
    const b = buffer[i];
    if (b >= 0x80) {
      if (
        b >= 0x81 &&
        b <= 0x9f &&
        i + 1 < buffer.length &&
        ((buffer[i + 1] >= 0x40 && buffer[i + 1] <= 0x7e) ||
          (buffer[i + 1] >= 0x80 && buffer[i + 1] <= 0xfc))
      ) {
        sjisScore += 2;
        i++;
      } else if (
        b >= 0xe0 &&
        b <= 0xef &&
        i + 2 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf
      ) {
        utf8Score += 3;
        i += 2;
      } else if (
        b >= 0xc0 &&
        b <= 0xdf &&
        i + 1 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf
      ) {
        utf8Score += 2;
        i++;
      }
    }
  }

  return sjisScore > utf8Score ? "Shift_JIS" : "utf-8";
}

function decodeBuffer(buffer: Buffer): string {
  const encoding = detectEncoding(buffer);
  if (encoding === "utf-8") {
    const str = buffer.toString("utf-8");
    return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
  }
  return iconv.decode(buffer, encoding);
}

export class CsvParserConnector implements DataConnector {
  readonly providerId = "csv";
  readonly providerLabel = "CSV ファイル";

  private detectedEncoding = "utf-8";

  async parseFile(
    buffer: Buffer,
    _fileName: string
  ): Promise<ConnectorResult> {
    this.detectedEncoding = detectEncoding(buffer);
    const content = decodeBuffer(buffer);

    const records: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    const normalized: NormalizedRecord[] = records.map((row, index) => ({
      _targetTable: "customers" as TargetTable,
      _sourceIndex: index,
      _raw: row,
      fields: { ...row },
    }));

    return {
      records: normalized,
      totalCount: normalized.length,
      sourceMetadata: {
        encoding: this.detectedEncoding,
        columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
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
