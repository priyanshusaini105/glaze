/**
 * Glaze API Client
 * Handles all API communication with the backend
 */

import type {
  Table,
  CreateTableRequest,
  UpdateTableRequest,
  Column,
  CreateColumnRequest,
  CreateColumnsRequest,
  UpdateColumnRequest,
  Row,
  CreateRowRequest,
  UpdateRowRequest,
  GetRowsParams,
  PaginatedRowsResponse,
  ICP,
  ResolveICPRequest,
  EnrichRequest,
  EnrichResponse,
  SeatStatus,
} from './api-types';
import { getAccessToken } from './supabase-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get access token for authenticated requests
    const accessToken = await getAccessToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If parsing error response fails, use default message
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses (like DELETE)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return {} as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // ============= Health & Index =============
  async getHealth(): Promise<{ status: string }> {
    return this.request('/health');
  }

  async getIndex(): Promise<unknown> {
    return this.request('/');
  }

  // ============= Tables =============
  async getTables(): Promise<Table[]> {
    return this.request('/tables/');
  }

  async getTable(id: string): Promise<Table> {
    return this.request(`/tables/${id}`);
  }

  async createTable(data: CreateTableRequest): Promise<Table> {
    return this.request('/tables/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTable(id: string, data: UpdateTableRequest): Promise<Table> {
    return this.request(`/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTable(id: string): Promise<void> {
    return this.request(`/tables/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= Columns =============
  async createColumn(
    tableId: string,
    data: CreateColumnRequest
  ): Promise<Column> {
    return this.request(`/tables/${tableId}/columns`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createColumns(
    tableId: string,
    data: CreateColumnsRequest[]
  ): Promise<Column[]> {
    return this.request(`/tables/${tableId}/columns`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateColumn(
    tableId: string,
    columnId: string,
    data: UpdateColumnRequest
  ): Promise<Column> {
    return this.request(`/tables/${tableId}/columns/${columnId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteColumn(tableId: string, columnId: string): Promise<void> {
    return this.request(`/tables/${tableId}/columns/${columnId}`, {
      method: 'DELETE',
    });
  }

  // ============= Rows =============
  async getRows(
    tableId: string,
    params?: GetRowsParams
  ): Promise<PaginatedRowsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/tables/${tableId}/rows?${query}` : `/tables/${tableId}/rows`;

    const response = await this.request<{ data: Row[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(endpoint);

    // Transform backend response format to match frontend expectations
    return {
      data: response.data,
      total: response.meta.total,
      page: response.meta.page,
      limit: response.meta.limit,
      totalPages: response.meta.totalPages,
    } as unknown as PaginatedRowsResponse;
  }

  async createRow(tableId: string, data: CreateRowRequest): Promise<Row> {
    return this.request(`/tables/${tableId}/rows`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRow(
    tableId: string,
    rowId: string,
    data: UpdateRowRequest
  ): Promise<Row> {
    return this.request(`/tables/${tableId}/rows/${rowId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRow(tableId: string, rowId: string): Promise<void> {
    return this.request(`/tables/${tableId}/rows/${rowId}`, {
      method: 'DELETE',
    });
  }

  // ============= ICPs =============
  async getIcps(): Promise<ICP[]> {
    return this.request('/icps');
  }

  async resolveIcp(data: ResolveICPRequest): Promise<unknown> {
    return this.request('/icps/resolve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============= Enrichment =============
  async enrichData(data: EnrichRequest): Promise<EnrichResponse> {
    return this.request('/enrich', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============= Cell Enrichment (Trigger.dev) =============
  /**
   * Start a cell enrichment job using Trigger.dev workflows
   * This is the preferred method for enrichment as it uses the waterfall provider strategy
   */
  async startCellEnrichment(
    tableId: string,
    params: { columnIds: string[]; rowIds: string[] }
  ): Promise<{
    jobId: string;
    tableId: string;
    status: string;
    totalTasks: number;
    message: string;
    /** Trigger.dev run ID for realtime subscription */
    runId?: string;
    /** Public access token for frontend realtime subscription */
    publicAccessToken?: string;
  }> {
    return this.request(`/tables/${tableId}/enrich`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get the status of an enrichment job
   */
  async getEnrichmentJobStatus(
    tableId: string,
    jobId: string
  ): Promise<{
    jobId: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    totalTasks: number;
    doneTasks: number;
    failedTasks: number;
    progress: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  }> {
    return this.request(`/tables/${tableId}/enrich/jobs/${jobId}`);
  }

  /**
   * Get all enrichment jobs for a table
   */
  async getEnrichmentJobs(
    tableId: string
  ): Promise<{
    data: Array<{
      jobId: string;
      status: string;
      totalTasks: number;
      doneTasks: number;
      failedTasks: number;
      createdAt: string;
    }>;
    meta: { total: number };
  }> {
    return this.request(`/tables/${tableId}/enrich/jobs`);
  }

  /**
   * Get seat status (public endpoint)
   */
  async getSeatStatus(): Promise<SeatStatus> {
    return this.request('/seats/status');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };
