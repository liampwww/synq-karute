export type TargetTable = "customers" | "timeline_events" | "customer_photos";

export interface NormalizedRecord {
  _targetTable: TargetTable;
  _sourceIndex: number;
  _raw: Record<string, unknown>;
  fields: Record<string, unknown>;
}

export interface FieldMapping {
  sourceField: string;
  targetTable: TargetTable;
  targetField: string;
  transform:
    | "none"
    | "date_parse"
    | "phone_normalize"
    | "name_split"
    | "kana_convert"
    | "tags_split"
    | "custom";
  confidence: number;
  confirmed: boolean;
}

export interface ConnectorResult {
  records: NormalizedRecord[];
  totalCount: number;
  sourceMetadata: Record<string, unknown>;
}

export interface DataConnector {
  readonly providerId: string;
  readonly providerLabel: string;
  parseFile?(buffer: Buffer, fileName: string): Promise<ConnectorResult>;
  connect?(credentials: Record<string, string>): Promise<void>;
  fetchData?(cursor?: string): Promise<ConnectorResult>;
  suggestMappings(sample: NormalizedRecord[]): FieldMapping[];
}

export interface MigrationProgress {
  jobId: string;
  status: string;
  totalRecords: number;
  importedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  errorLog: Array<{ row: number; error: string }>;
}

export interface AnalysisResult {
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
  suggestedMappings: FieldMapping[];
  encoding: string;
  detectedFormat: string;
}

export type DedupStrategy = "skip" | "merge" | "create_new";

export interface ImportOptions {
  dedupStrategy: DedupStrategy;
  mappings: FieldMapping[];
  sourceType: string;
  sourceName: string;
}
