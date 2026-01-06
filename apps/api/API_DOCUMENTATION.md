# Glaze API Documentation

## Overview

The Glaze API is a high-performance data enrichment platform built with Elysia (Bun runtime) and PostgreSQL. It provides RESTful endpoints for managing tables, columns, rows, and cell-level enrichment workflows.

**Base URL**: `http://localhost:3001` (development)

**API Version**: 0.4.0

---

## Table of Contents

1. [Health & Info](#health--info)
2. [Tables](#tables)
3. [Columns](#columns)
4. [Rows](#rows)
5. [CSV Import/Export](#csv-importexport)
6. [Cell Enrichment](#cell-enrichment)
7. [LinkedIn Integration](#linkedin-integration)
8. [Error Handling](#error-handling)

---

## Health & Info

### GET /health

Check API health status.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-01-05T14:30:00.000Z",
  "service": "glaze-api",
  "uptime": 12345.67
}
```

### GET /

Get API information and available endpoints.

**Response** (200 OK):
```json
{
  "message": "Welcome to Glaze API",
  "version": "0.4.0",
  "endpoints": {
    "health": "/health",
    "tables": "/tables",
    "enrich": "/enrich",
    "cellEnrich": "/tables/:tableId/enrich",
    "linkedin": "/linkedin",
    "docs": "/docs"
  }
}
```

---

## Tables

### GET /tables

List all tables with metadata.

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Leads",
    "description": "Sales leads database",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-05T14:30:00.000Z",
    "_count": {
      "rows": 150,
      "columns": 8
    }
  }
]
```

---

### POST /tables

Create a new table.

**Request Body**:
```json
{
  "name": "Leads",
  "description": "Sales leads database" // optional
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Leads",
  "description": "Sales leads database",
  "createdAt": "2026-01-05T14:30:00.000Z",
  "updatedAt": "2026-01-05T14:30:00.000Z"
}
```

**Validation Errors** (422):
- Missing `name` field

---

### GET /tables/:id

Get table details including columns.

**Parameters**:
- `id` (path): Table UUID

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Leads",
  "description": "Sales leads database",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-05T14:30:00.000Z",
  "columns": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "tableId": "550e8400-e29b-41d4-a716-446655440000",
      "key": "company_name",
      "label": "Company Name",
      "dataType": "text",
      "order": 0,
      "config": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Errors**:
- 404: Table not found

---

### PATCH /tables/:id

Update table metadata (name and/or description).

**Parameters**:
- `id` (path): Table UUID

**Request Body**:
```json
{
  "name": "Updated Name", // optional
  "description": "Updated description" // optional
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Name",
  "description": "Updated description",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-05T14:35:00.000Z"
}
```

**Errors**:
- 404: Table not found

---

### DELETE /tables/:id

Delete a table and all its columns, rows, and enrichment data (cascade).

**Parameters**:
- `id` (path): Table UUID

**Response** (200 OK):
```json
{
  "success": true
}
```

**Errors**:
- 404: Table not found

---

## Columns

### POST /tables/:id/columns

Add one or more columns to a table.

**Parameters**:
- `id` (path): Table UUID

**Request Body** (Single Column):
```json
{
  "key": "company_name",
  "label": "Company Name",
  "dataType": "text", // optional, default: "text"
  "config": {} // optional
}
```

**Request Body** (Bulk Columns):
```json
[
  {
    "key": "name",
    "label": "Name",
    "dataType": "text"
  },
  {
    "key": "email",
    "label": "Email",
    "dataType": "text"
  },
  {
    "key": "age",
    "label": "Age",
    "dataType": "number"
  }
]
```

**Data Types**:
- `text` (default)
- `number`
- `boolean`
- `url`
- `json`

**Response** (200 OK):

Single column returns object:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "key": "company_name",
  "label": "Company Name",
  "dataType": "text",
  "order": 0,
  "config": null,
  "createdAt": "2026-01-05T14:30:00.000Z",
  "updatedAt": "2026-01-05T14:30:00.000Z"
}
```

Bulk columns return array of objects.

**Errors**:
- 404: Table not found
- 400: Column key already exists or invalid data

---

### PATCH /tables/:id/columns/:columnId

Update column metadata.

**Parameters**:
- `id` (path): Table UUID
- `columnId` (path): Column UUID

**Request Body**:
```json
{
  "label": "Updated Label", // optional
  "key": "updated_key", // optional
  "dataType": "number", // optional
  "order": 5, // optional
  "config": {} // optional
}
```

**Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "key": "updated_key",
  "label": "Updated Label",
  "dataType": "number",
  "order": 5,
  "config": {},
  "createdAt": "2026-01-05T14:30:00.000Z",
  "updatedAt": "2026-01-05T14:40:00.000Z"
}
```

**Errors**:
- 404: Column not found

---

### DELETE /tables/:id/columns/:columnId

Delete a column from a table.

**Parameters**:
- `id` (path): Table UUID
- `columnId` (path): Column UUID

**Response** (200 OK):
```json
{
  "success": true
}
```

**Errors**:
- 404: Column not found

---

## Rows

### GET /tables/:id/rows

List rows in a table with pagination.

**Parameters**:
- `id` (path): Table UUID

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response** (200 OK):
```json
{
  "rows": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "tableId": "550e8400-e29b-41d4-a716-446655440000",
      "data": {
        "company_name": "Acme Corp",
        "email": "contact@acme.com",
        "age": 5
      },
      "status": "done",
      "confidence": 0.95,
      "error": null,
      "lastRunAt": "2026-01-05T14:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-05T14:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

**Row Status Values**:
- `idle`: No enrichment performed
- `queued`: Enrichment queued
- `running`: Enrichment in progress
- `done`: Enrichment completed successfully
- `failed`: Enrichment failed
- `ambiguous`: Mixed success/failure across cells

---

### POST /tables/:id/rows

Add a new row to a table.

**Parameters**:
- `id` (path): Table UUID

**Request Body**:
```json
{
  "data": {
    "company_name": "Acme Corp",
    "email": "contact@acme.com",
    "age": 5
  }
}
```

**Response** (200 OK):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "company_name": "Acme Corp",
    "email": "contact@acme.com",
    "age": 5
  },
  "status": "idle",
  "confidence": null,
  "error": null,
  "lastRunAt": null,
  "createdAt": "2026-01-05T14:30:00.000Z",
  "updatedAt": "2026-01-05T14:30:00.000Z"
}
```

**Errors**:
- 404: Table not found

---

### PATCH /tables/:id/rows/:rowId

Update row data (partial update - merges with existing data).

**Parameters**:
- `id` (path): Table UUID
- `rowId` (path): Row UUID

**Request Body**:
```json
{
  "data": {
    "email": "newemail@acme.com"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "company_name": "Acme Corp",
    "email": "newemail@acme.com",
    "age": 5
  },
  "status": "idle",
  "confidence": null,
  "error": null,
  "lastRunAt": null,
  "createdAt": "2026-01-05T14:30:00.000Z",
  "updatedAt": "2026-01-05T14:35:00.000Z"
}
```

**Errors**:
- 404: Row not found

---

### DELETE /tables/:id/rows/:rowId

Delete a row from a table.

**Parameters**:
- `id` (path): Table UUID
- `rowId` (path): Row UUID

**Response** (200 OK):
```json
{
  "success": true
}
```

**Errors**:
- 404: Row not found

---

## CSV Import/Export

### POST /tables/import-csv

Create a new table from CSV content.

**Request Body**:
```json
{
  "name": "Imported Leads",
  "description": "Leads from CSV import", // optional
  "csvContent": "name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25"
}
```

**Features**:
- Automatically infers column data types
- Creates stable column keys from headers
- Handles quoted values and escaped quotes
- Parses numbers and booleans

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Imported Leads",
  "description": "Leads from CSV import",
  "createdAt": "2026-01-05T14:30:00.000Z",
  "updatedAt": "2026-01-05T14:30:00.000Z",
  "columns": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "key": "name",
      "label": "name",
      "dataType": "text",
      "order": 0
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "key": "email",
      "label": "email",
      "dataType": "text",
      "order": 1
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440003",
      "key": "age",
      "label": "age",
      "dataType": "number",
      "order": 2
    }
  ],
  "_count": {
    "rows": 2
  }
}
```

**Errors**:
- 400: CSV must have headers
- 400: Failed to parse CSV

---

### GET /tables/:id/export-csv

Export table data as CSV file.

**Parameters**:
- `id` (path): Table UUID

**Response** (200 OK):

Headers:
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="table_name.csv"`

Body:
```csv
name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
```

**Errors**:
- 404: Table not found
- 500: Failed to export CSV

---

## Cell Enrichment

The cell enrichment system allows you to enrich specific cells, entire rows, or column×row grids using Trigger.dev workflows.

### POST /tables/:id/enrich

Trigger cell-level enrichment for a table.

**Parameters**:
- `id` (path): Table UUID

**Request Body** (Grid Mode - enrich all combinations):
```json
{
  "columnIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "660e8400-e29b-41d4-a716-446655440002"
  ],
  "rowIds": [
    "770e8400-e29b-41d4-a716-446655440002",
    "770e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Request Body** (Explicit Mode - enrich specific cells):
```json
{
  "cellIds": [
    {
      "rowId": "770e8400-e29b-41d4-a716-446655440002",
      "columnId": "660e8400-e29b-41d4-a716-446655440001"
    },
    {
      "rowId": "770e8400-e29b-41d4-a716-446655440003",
      "columnId": "660e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "jobId": "880e8400-e29b-41d4-a716-446655440004",
  "tableId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "totalTasks": 4,
  "message": "Created 4 enrichment tasks"
}
```

**Errors**:
- 404: Table not found
- 400: Must provide either (columnIds + rowIds) or cellIds
- 400: No cells to enrich
- 400: Columns not found
- 400: Rows not found

---

### GET /tables/:id/enrich/jobs/:jobId

Get the status of an enrichment job.

**Parameters**:
- `id` (path): Table UUID
- `jobId` (path): Job UUID

**Response** (200 OK):
```json
{
  "jobId": "880e8400-e29b-41d4-a716-446655440004",
  "status": "running",
  "totalTasks": 4,
  "doneTasks": 2,
  "failedTasks": 0,
  "progress": 50,
  "createdAt": "2026-01-05T14:30:00.000Z",
  "startedAt": "2026-01-05T14:30:05.000Z",
  "completedAt": null
}
```

**Job Status Values**:
- `pending`: Job created, not started
- `running`: Job in progress
- `completed`: All tasks completed
- `failed`: Job failed
- `cancelled`: Job cancelled

**Errors**:
- 404: Job not found

---

### GET /tables/:id/enrich/jobs

List all enrichment jobs for a table.

**Parameters**:
- `id` (path): Table UUID

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response** (200 OK):
```json
{
  "data": [
    {
      "jobId": "880e8400-e29b-41d4-a716-446655440004",
      "status": "completed",
      "totalTasks": 4,
      "doneTasks": 4,
      "failedTasks": 0,
      "progress": 100,
      "createdAt": "2026-01-05T14:30:00.000Z",
      "startedAt": "2026-01-05T14:30:05.000Z",
      "completedAt": "2026-01-05T14:31:00.000Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Errors**:
- 404: Table not found

---

### GET /tables/:id/enrich/jobs/:jobId/tasks

Get tasks for a specific enrichment job.

**Parameters**:
- `id` (path): Table UUID
- `jobId` (path): Job UUID

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `status` (optional): Filter by task status (queued, running, done, failed)

**Response** (200 OK):
```json
{
  "data": [
    {
      "taskId": "990e8400-e29b-41d4-a716-446655440005",
      "rowId": "770e8400-e29b-41d4-a716-446655440002",
      "columnId": "660e8400-e29b-41d4-a716-446655440001",
      "columnKey": "company_name",
      "columnLabel": "Company Name",
      "status": "done",
      "result": {
        "value": "Acme Corporation",
        "source": "mock",
        "metadata": {}
      },
      "confidence": 0.95,
      "error": null,
      "attempts": 1,
      "createdAt": "2026-01-05T14:30:00.000Z",
      "startedAt": "2026-01-05T14:30:05.000Z",
      "completedAt": "2026-01-05T14:30:10.000Z"
    }
  ],
  "meta": {
    "total": 4,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

**Task Status Values**:
- `queued`: Task created, waiting to run
- `running`: Task in progress
- `done`: Task completed successfully
- `failed`: Task failed

**Errors**:
- 404: Job not found

---

## LinkedIn Integration

LinkedIn enrichment endpoints (requires RapidAPI key).

### GET /linkedin/profile

Get LinkedIn profile data.

**Query Parameters**:
- `url` (required): LinkedIn profile URL

**Example**: `/linkedin/profile?url=https://www.linkedin.com/in/williamhgates`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "full_name": "Bill Gates",
    "headline": "Co-chair, Bill & Melinda Gates Foundation",
    "location": {
      "city": "Seattle",
      "country": "United States"
    },
    "profile_url": "https://www.linkedin.com/in/williamhgates",
    "connections": "500+",
    "experience": [
      {
        "company": "Bill & Melinda Gates Foundation",
        "title": "Co-chair",
        "start_date": "2000",
        "end_date": null
      }
    ]
  },
  "timestamp": "2026-01-05T14:30:00.000Z"
}
```

**Errors**:
- 400: Missing required parameter: url
- 500: API call failed

---

### GET /linkedin/company

Get LinkedIn company data.

**Query Parameters**:
- `url` (required): LinkedIn company URL

**Example**: `/linkedin/company?url=https://www.linkedin.com/company/microsoft`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "name": "Microsoft",
    "about": "Every company has a mission...",
    "website": "https://www.microsoft.com",
    "industry": "Software Development",
    "company_size": "10,001+ employees",
    "headquarters": "Redmond, WA"
  },
  "timestamp": "2026-01-05T14:30:00.000Z"
}
```

**Errors**:
- 400: Missing required parameter: url
- 500: API call failed

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters or body
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error

### Common Error Scenarios

**Validation Errors** (422):
```json
{
  "error": "Validation failed",
  "details": {
    "field": "name",
    "message": "Required field missing"
  }
}
```

**Not Found** (404):
```json
{
  "error": "Table not found"
}
```

**Server Error** (500):
```json
{
  "error": "Internal server error"
}
```

---

## Interactive API Documentation

Visit `/docs` for interactive Swagger UI documentation where you can test all endpoints directly in your browser.

---

## Rate Limiting

Currently, there are no rate limits on the API. This may change in production deployments.

---

## Authentication

Currently, the API does not require authentication. This is suitable for development and internal deployments. For production use, implement authentication middleware.

---

## Changelog

### v0.4.0 (Current)
- Cell-level enrichment with Trigger.dev
- LinkedIn integration endpoints
- CSV import/export
- Comprehensive CRUD operations for tables, columns, and rows

---

## Support

For issues, questions, or contributions, please refer to the project repository.
