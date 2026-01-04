/**
 * Generated TypeScript types from Glaze API OpenAPI specification
 * Base URL: http://localhost:3001
 */

// ============= Tables =============
export interface Table {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTableRequest {
  name: string;
  description?: string;
}

export interface UpdateTableRequest {
  name?: string;
  description?: string;
}

// ============= Columns =============
export type DataType = 'text' | 'number' | 'boolean' | 'date' | 'url' | 'email';

export interface Column {
  id: string;
  key: string;
  label: string;
  dataType: DataType;
  order?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
  tableId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateColumnRequest {
  key: string;
  label: string;
  dataType?: DataType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
}

export interface CreateColumnsRequest {
  key: string;
  label: string;
  dataType?: DataType;
  order?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
}

export interface UpdateColumnRequest {
  label?: string;
  key?: string;
  dataType?: DataType;
  order?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any>;
}

// ============= Rows =============
export interface Row {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  tableId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRowRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export interface UpdateRowRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export interface GetRowsParams {
  page?: number;
  limit?: number;
}

export interface PaginatedRowsResponse {
  rows: Row[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============= Enrichment =============
export interface CellSelection {
  rowId: string;
  columnId: string;
}

export type EnrichTarget = 
  | { type: 'cells'; selections: CellSelection[] }
  | { type: 'rows'; rowIds: string[] }
  | { type: 'columns'; columnIds: string[] };

export interface EnrichRequest {
  tableId: string;
  targets: EnrichTarget[];
}

export interface EnrichResult {
  rowId: string;
  columnId: string;
  originalValue: unknown;
  enrichedValue: unknown;
  status: 'success' | 'error';
  error?: string;
}

export interface EnrichResponse {
  tableId: string;
  results: EnrichResult[];
  metadata: {
    processed: number;
    failed: number;
    cost?: number;
  };
}


// ============= ICPs =============
export interface ICP {
  id: string;
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  criteria?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResolveICPRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ============= API Response Types =============
export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}
