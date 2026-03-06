// SchemaShift — Shared Type Contract
// This file is the AUTHORITATIVE source of truth for all API types.
// Python backend returns snake_case; the API client transforms to camelCase.

export interface Session {
  sessionId: string;
  scanCount: number;
  sourcesCount: number;
  plan: 'free' | 'pro' | 'team';
  createdAt: string;
  lastSeenAt: string;
}

export interface Source {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  fingerprint: string;
  baselineSchema: ColumnSchema[];
  formatInfo: FormatInfo;
  columnCount: number;
  scanCount: number;
  driftScore: number;
  qualityScore: number;
  firstSeenAt: string;
  lastSeenAt: string;
  tags: string[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnSchema {
  name: string;
  inferredType: ColumnType;
  confidence: number;
  nullRate: number;
  cardinality: number;
  sampleValues: string[];
  stats: ColumnStats | null;
}

export type ColumnType =
  | 'integer' | 'float' | 'date' | 'datetime' | 'boolean'
  | 'email' | 'url' | 'phone' | 'zip_code' | 'uuid'
  | 'categorical' | 'free_text' | 'currency' | 'percentage';

export interface ColumnStats {
  mean: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  q25: number | null;
  q50: number | null;
  q75: number | null;
}

export interface FormatInfo {
  delimiter: string;
  encoding: string;
  quoteChar: string;
  hasHeader: boolean;
  lineEnding: string;
  rowCount: number;
}

export interface Scan {
  id: string;
  sourceId: string;
  sessionId: string;
  filename: string;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  schemaSnapshot: ColumnSchema[];
  formatInfo: FormatInfo;
  driftReport: DriftReport | null;
  anomalyReport: AnomalyReport | null;
  qualityScore: number;
  recipesApplied: string[];
  isNewSource: boolean;
  createdAt: string;
}

export interface DriftReport {
  hasChanges: boolean;
  addedColumns: string[];
  removedColumns: string[];
  renamedColumns: RenamedColumn[];
  typeChanges: TypeChange[];
  distributionShifts: DistributionShift[];
  summary: string;
}

export interface RenamedColumn {
  oldName: string;
  newName: string;
  confidence: number;
}

export interface TypeChange {
  column: string;
  oldType: ColumnType;
  newType: ColumnType;
}

export interface DistributionShift {
  column: string;
  metric: string;
  oldValue: number;
  newValue: number;
  severity: 'low' | 'medium' | 'high';
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  overallScore: number;
}

export interface Anomaly {
  column: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  currentValue: number;
  baselineValue: number;
}

export interface Recipe {
  id: string;
  sourceId: string;
  name: string;
  description: string | null;
  operations: RecipeOperation[];
  isActive: boolean;
  executionOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type RecipeOperationType =
  | 'rename_column' | 'drop_column' | 'fill_null'
  | 'convert_type' | 'strip_whitespace' | 'replace_value'
  | 'parse_date' | 'filter_rows' | 'deduplicate'
  | 'standardize_case' | 'remove_leading_zeros'
  | 'extract_pattern' | 'custom_transform';

export interface RecipeOperation {
  type: RecipeOperationType;
  column: string | null;
  params: Record<string, string>;
}

export interface DriftEvent {
  id: string;
  sourceId: string;
  scanId: string;
  eventType: 'column_added' | 'column_removed' | 'column_renamed' | 'type_changed' | 'distribution_shift' | 'anomaly_detected';
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Plan tier limits
export const PLAN_LIMITS = {
  free: { maxSources: 5, maxScansPerHour: 10, maxFileSizeMb: 10 },
  pro: { maxSources: 50, maxScansPerHour: 100, maxFileSizeMb: 50 },
  team: { maxSources: 200, maxScansPerHour: 500, maxFileSizeMb: 100 },
} as const;
