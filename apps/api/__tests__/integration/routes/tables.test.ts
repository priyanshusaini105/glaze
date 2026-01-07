/**
 * Integration Tests for Tables API Routes
 * 
 * Tests the /tables endpoints including CRUD operations for tables, columns, and rows.
 * 
 * Prerequisites:
 * - PostgreSQL database running
 * - DATABASE_URL environment variable set (or uses default localhost)
 * - Run migrations: bunx prisma migrate deploy
 * 
 * These tests use the Elysia handle() method which doesn't require starting a server.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../../src/server';

describe('Tables API Routes', () => {
    let app: ReturnType<typeof buildApp>;
    // Track created table IDs for cleanup
    const createdTableIds: string[] = [];

    beforeAll(() => {
        app = buildApp();
    });

    afterAll(async () => {
        // Clean up created tables
        for (const tableId of createdTableIds) {
            try {
                await app.handle(
                    new Request(`http://localhost/tables/${tableId}`, {
                        method: 'DELETE'
                    })
                );
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        // Note: Don't call app.stop() since we never called app.listen()
    });

    // Helper to create a test table and track it for cleanup
    async function createTestTable(name: string = 'Test Table'): Promise<{ id: string; name: string }> {
        const response = await app.handle(
            new Request('http://localhost/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
        );
        const table = await response.json();
        if (table.id) {
            createdTableIds.push(table.id);
        }
        return table;
    }

    describe('GET /tables', () => {
        it('should return an array of tables', async () => {
            const response = await app.handle(
                new Request('http://localhost/tables')
            );

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
        });

        it('should include table count information when tables exist', async () => {
            // Create a test table first
            await createTestTable('Count Test Table');

            const response = await app.handle(
                new Request('http://localhost/tables')
            );

            const tables = await response.json();

            // Tables should have count info
            if (tables.length > 0) {
                expect(tables[0]).toHaveProperty('_count');
            }
        });
    });

    describe('POST /tables', () => {
        it('should create a new table with name and description', async () => {
            const response = await app.handle(
                new Request('http://localhost/tables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Test Table With Description',
                        description: 'A test table for integration tests'
                    })
                })
            );

            expect(response.status).toBe(200);

            const table = await response.json();
            expect(table).toHaveProperty('id');
            expect(table.name).toBe('Test Table With Description');
            expect(table.description).toBe('A test table for integration tests');

            createdTableIds.push(table.id);
        });

        it('should create a table with just a name', async () => {
            const response = await app.handle(
                new Request('http://localhost/tables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Minimal Table'
                    })
                })
            );

            expect(response.status).toBe(200);

            const table = await response.json();
            expect(table.name).toBe('Minimal Table');
            expect(table.description).toBeNull();

            createdTableIds.push(table.id);
        });

        it('should fail without a name', async () => {
            const response = await app.handle(
                new Request('http://localhost/tables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'No name provided'
                    })
                })
            );

            // Elysia returns 422 for validation errors
            expect(response.status).toBe(422);
        });
    });

    describe('GET /tables/:id', () => {
        it('should return table details with columns', async () => {
            const table = await createTestTable('Table for GET test');

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}`)
            );

            expect(response.status).toBe(200);

            const fetchedTable = await response.json();
            expect(fetchedTable.id).toBe(table.id);
            expect(fetchedTable).toHaveProperty('columns');
            expect(Array.isArray(fetchedTable.columns)).toBe(true);
        });

        it('should return 404 for non-existent table', async () => {
            const response = await app.handle(
                new Request('http://localhost/tables/00000000-0000-0000-0000-000000000000')
            );

            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /tables/:id', () => {
        it('should update table name', async () => {
            const table = await createTestTable('Table to Update');

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Updated Table Name'
                    })
                })
            );

            expect(response.status).toBe(200);

            const updatedTable = await response.json();
            expect(updatedTable.name).toBe('Updated Table Name');
        });

        it('should update table description', async () => {
            const table = await createTestTable('Table for description update');

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'New description'
                    })
                })
            );

            expect(response.status).toBe(200);

            const updatedTable = await response.json();
            expect(updatedTable.description).toBe('New description');
        });
    });

    describe('DELETE /tables/:id', () => {
        it('should delete an existing table', async () => {
            // Create a table to delete (don't track for cleanup since we're deleting)
            const createResponse = await app.handle(
                new Request('http://localhost/tables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Table to Delete' })
                })
            );
            const table = await createResponse.json();

            // Delete the table
            const deleteResponse = await app.handle(
                new Request(`http://localhost/tables/${table.id}`, {
                    method: 'DELETE'
                })
            );

            expect(deleteResponse.status).toBe(200);
            const result = await deleteResponse.json();
            expect(result.success).toBe(true);

            // Verify table is gone
            const getResponse = await app.handle(
                new Request(`http://localhost/tables/${table.id}`)
            );
            expect(getResponse.status).toBe(404);
        });

        it('should return 404 for non-existent table', async () => {
            const response = await app.handle(
                new Request('http://localhost/tables/00000000-0000-0000-0000-000000000000', {
                    method: 'DELETE'
                })
            );

            expect(response.status).toBe(404);
        });
    });

    describe('POST /tables/:id/columns', () => {
        it('should create a single column', async () => {
            const table = await createTestTable('Table for Column Tests');

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}/columns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: 'company_name',
                        label: 'Company Name',
                        dataType: 'text'
                    })
                })
            );

            expect(response.status).toBe(200);

            const column = await response.json();
            expect(column.key).toBe('company_name');
            expect(column.label).toBe('Company Name');
            expect(column.tableId).toBe(table.id);
        });

        it('should create multiple columns in bulk', async () => {
            const table = await createTestTable('Table for Bulk Columns');

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}/columns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'age', label: 'Age', dataType: 'number' }
                    ])
                })
            );

            expect(response.status).toBe(200);

            const columns = await response.json();
            expect(Array.isArray(columns)).toBe(true);
            expect(columns).toHaveLength(3);
        });
    });

    describe('POST /tables/:id/rows', () => {
        it('should create a row with data', async () => {
            const table = await createTestTable('Table for Row Tests');

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}/rows`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: {
                            name: 'John Doe',
                            email: 'john@example.com',
                            age: 30
                        }
                    })
                })
            );

            expect(response.status).toBe(200);

            const row = await response.json();
            expect(row).toHaveProperty('id');
            expect(row.data.name).toBe('John Doe');
            expect(row.data.email).toBe('john@example.com');
            expect(row.data.age).toBe(30);
        });
    });

    describe('GET /tables/:id/rows', () => {
        it('should return paginated rows', async () => {
            const table = await createTestTable('Table for Row Listing');

            // Add some rows
            for (let i = 0; i < 3; i++) {
                await app.handle(
                    new Request(`http://localhost/tables/${table.id}/rows`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            data: { name: `User ${i}`, index: i }
                        })
                    })
                );
            }

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}/rows`)
            );

            expect(response.status).toBe(200);

            const result = await response.json();
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
            expect(result.meta).toHaveProperty('total');
            expect(result.meta).toHaveProperty('page');
            expect(result.meta).toHaveProperty('limit');
            expect(result.data.length).toBe(3);
        });

        it('should support pagination parameters', async () => {
            const table = await createTestTable('Table for Pagination');

            // Add some rows
            for (let i = 0; i < 5; i++) {
                await app.handle(
                    new Request(`http://localhost/tables/${table.id}/rows`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            data: { name: `User ${i}` }
                        })
                    })
                );
            }

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}/rows?page=1&limit=2`)
            );

            expect(response.status).toBe(200);

            const result = await response.json();
            expect(result.data.length).toBe(2);
            expect(result.meta.limit).toBe(2);
        });
    });

    describe('CSV Import/Export', () => {
        it('should import CSV and create table with columns and rows', async () => {
            const csvContent = `name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25`;

            const response = await app.handle(
                new Request('http://localhost/tables/import-csv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Imported Table',
                        description: 'Table from CSV import',
                        csvContent
                    })
                })
            );

            expect(response.status).toBe(200);

            const table = await response.json();
            expect(table.name).toBe('Imported Table');
            expect(table.columns).toHaveLength(3);
            expect(table._count.rows).toBe(2);

            createdTableIds.push(table.id);
        });

        it('should export table to CSV', async () => {
            // First create a table with data
            const table = await createTestTable('Table for Export');

            // Add a column
            await app.handle(
                new Request(`http://localhost/tables/${table.id}/columns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'name', label: 'Name' })
                })
            );

            // Add a row
            await app.handle(
                new Request(`http://localhost/tables/${table.id}/rows`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: { name: 'Test User' } })
                })
            );

            const response = await app.handle(
                new Request(`http://localhost/tables/${table.id}/export-csv`)
            );

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('text/csv');

            const csvContent = await response.text();
            expect(csvContent).toContain('Name');
            expect(csvContent).toContain('Test User');
        });
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const response = await app.handle(
                new Request('http://localhost/health')
            );

            expect(response.status).toBe(200);

            const health = await response.json();
            expect(health.status).toBe('ok');
            expect(health.service).toBe('glaze-api');
        });
    });
});
