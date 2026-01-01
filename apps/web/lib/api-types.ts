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
export type EnrichmentField = 
  | 'company_name'
  | 'company_description'
  | 'company_website'
  | 'company_hq_location'
  | 'company_employee_count'
  | 'company_industry'
  | 'company_founded_year'
  | 'company_revenue'
  | 'company_funding'
  | 'company_linkedin'
  | 'company_twitter'
  | 'company_email'
  | 'company_phone'
  | 'person_name'
  | 'person_email'
  | 'person_phone'
  | 'person_title'
  | 'person_linkedin'
  | 'person_location'
  | 'person_company';

export type EnrichmentSource = 
  | 'website_scrape'
  | 'linkedin_scrape'
  | 'search_result'
  | 'contactout'
  | 'cache'
  | 'ai_inference';

export type EnrichmentDataType = 'cell' | 'array' | 'column' | 'row';

export interface EnrichedValue {
  value: string | number | null;
  confidence: number;
  source: EnrichmentSource;
  timestamp: string;
}

export type EnrichmentData = Partial<Record<EnrichmentField, EnrichedValue>>;

export interface EnrichCellRequest {
  dataType: 'cell';
  cellValue?: string;
  url?: string;
  requiredFields: EnrichmentField[];
  mock?: boolean;
  simulateDelay?: boolean;
  budgetCents?: number;
}

export interface EnrichArrayRequest {
  dataType: 'array';
  arrayValues: string[];
  requiredFields: EnrichmentField[];
  mock?: boolean;
  simulateDelay?: boolean;
  budgetCents?: number;
}

export interface EnrichColumnRequest {
  dataType: 'column';
  columnId: string;
  requiredFields: EnrichmentField[];
  mock?: boolean;
  simulateDelay?: boolean;
  budgetCents?: number;
}

export interface EnrichRowRequest {
  dataType: 'row';
  rowId: string;
  requiredFields: EnrichmentField[];
  mock?: boolean;
  simulateDelay?: boolean;
  budgetCents?: number;
}

export type EnrichmentRequest = 
  | EnrichCellRequest 
  | EnrichArrayRequest 
  | EnrichColumnRequest 
  | EnrichRowRequest;

export interface EnrichmentCellResult {
  simulation: boolean;
  dataType: 'cell';
  result: {
    dataType: 'cell';
    input: string;
    enrichedData: EnrichmentData;
  };
  meta: {
    fieldsRequested: EnrichmentField[];
    itemsEnriched: number;
    durationMs: number;
    costCents: number;
    costPerItem: number;
  };
}

export interface EnrichmentArrayResult {
  simulation: boolean;
  dataType: 'array';
  result: {
    dataType: 'array';
    itemCount: number;
    results: Array<{
      index: number;
      value: string;
      data: EnrichmentData;
    }>;
  };
  meta: {
    fieldsRequested: EnrichmentField[];
    itemsEnriched: number;
    durationMs: number;
    costCents: number;
    costPerItem: number;
  };
}

export interface EnrichmentColumnResult {
  simulation: boolean;
  dataType: 'column';
  result: {
    columnId: string;
    rowCount: number;
    sampleData: EnrichmentData[];
  };
  meta: {
    fieldsRequested: EnrichmentField[];
    itemsEnriched: number;
    durationMs: number;
    costCents: number;
    costPerItem: number;
  };
}

export interface EnrichmentRowResult {
  simulation: boolean;
  dataType: 'row';
  result: {
    rowId: string;
    data: EnrichmentData;
  };
  meta: {
    fieldsRequested: EnrichmentField[];
    itemsEnriched: number;
    durationMs: number;
    costCents: number;
    costPerItem: number;
  };
}

export type EnrichmentResponse = 
  | EnrichmentCellResult 
  | EnrichmentArrayResult 
  | EnrichmentColumnResult 
  | EnrichmentRowResult;

export interface EnrichmentFields {
  all: EnrichmentField[];
  company: EnrichmentField[];
  person: EnrichmentField[];
}

export interface EnrichmentServices {
  search: {
    configured: boolean;
    provider: string;
    costPerQuery: number;
  };
  contactOut: {
    configured: boolean;
    costPerLookup: number;
  };
  cache: {
    available: boolean;
    ttlDays: number;
  };
}

export interface EnrichmentQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface EnrichmentCacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
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
