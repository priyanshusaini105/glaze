/**
 * Typed API Client for Glaze API
 * 
 * Provides a clean interface for API calls with proper error handling
 */

import type { Table, Column, Row, CreateRowRequest, UpdateRowRequest, GetRowsParams, PaginatedRowsResponse } from './api-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: string;
};

class TypedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`,
        };
      }

      // Handle empty responses (like DELETE)
      const text = await response.text();
      const data = text ? JSON.parse(text) as T : null as T;

      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      return { data: null, error };
    }
  }

  // ============= Tables =============
  async getTables() {
    return this.request<Table[]>('/tables');
  }

  async getTable(id: string) {
    return this.request<Table>(`/tables/${id}`);
  }

  // ============= Columns =============
  async createColumn(tableId: string, data: { key: string; label: string; dataType: string }) {
    return this.request<Column>(`/tables/${tableId}/columns`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteColumn(tableId: string, columnId: string) {
    return this.request<void>(`/tables/${tableId}/columns/${columnId}`, {
      method: 'DELETE',
    });
  }

  // ============= Rows =============
  async getRows(tableId: string, params?: GetRowsParams) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const queryString = searchParams.toString();
    
    return this.request<PaginatedRowsResponse>(
      `/tables/${tableId}/rows${queryString ? `?${queryString}` : ''}`
    );
  }

  async createRow(tableId: string, data: CreateRowRequest) {
    return this.request<Row>(`/tables/${tableId}/rows`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRow(tableId: string, rowId: string, data: UpdateRowRequest) {
    return this.request<Row>(`/tables/${tableId}/rows/${rowId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============= Enrichment =============
  async enrichData(request: any) {
    return this.request<any>('/enrich', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const typedApi = new TypedApiClient();
