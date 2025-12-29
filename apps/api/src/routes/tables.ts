import { Elysia, t } from 'elysia';
import { prisma } from '../db';
import { parseCSV, generateCSV, inferDataType } from '../utils/csv';

export const tablesRoutes = new Elysia({ prefix: '/tables' })
  // List all tables
  .get('/', async () => {
    return await prisma.table.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { rows: true, columns: true }
        }
      }
    });
  })

  // Create a new table
  .post('/', async ({ body }) => {
    const { name, description } = body;
    return await prisma.table.create({
      data: {
        name,
        description
      }
    });
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String())
    })
  })

  // Get table details (with columns)
  .get('/:id', async ({ params: { id }, error }) => {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: 'asc' }
        }
      }
    });
    if (!table) return error(404, 'Table not found');
    return table;
  })

  // Update table metadata
  .patch('/:id', async ({ params: { id }, body, error }) => {
    try {
      return await prisma.table.update({
        where: { id },
        data: body
      });
    } catch (e) {
      return error(404, 'Table not found');
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String())
    })
  })

  // Delete table
  .delete('/:id', async ({ params: { id }, error }) => {
    try {
      await prisma.table.delete({
        where: { id }
      });
      return { success: true };
    } catch (e) {
      return error(404, 'Table not found');
    }
  })

  // --- Columns ---

  // Add a column or bulk add columns
  .post('/:id/columns', async ({ params: { id }, body, error }) => {
    // Check if table exists
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) return error(404, 'Table not found');

    // Check if body is array (bulk) or single object
    const isArray = Array.isArray(body);
    const columnsToCreate = isArray ? body : [body];

    // Get max order
    const lastCol = await prisma.column.findFirst({
      where: { tableId: id },
      orderBy: { order: 'desc' }
    });
    let order = (lastCol?.order ?? -1) + 1;

    try {
      const createdColumns = [];
      for (const col of columnsToCreate) {
        const { key, label, dataType = 'text', config } = col;
        const created = await prisma.column.create({
          data: {
            tableId: id,
            key,
            label,
            dataType,
            order,
            config
          }
        });
        createdColumns.push(created);
        order++;
      }
      return isArray ? createdColumns : createdColumns[0];
    } catch (e) {
      return error(400, 'Column key already exists or invalid data');
    }
  }, {
    body: t.Union([
      // Single column
      t.Object({
        key: t.String(),
        label: t.String(),
        dataType: t.Optional(t.String({ default: 'text' })),
        config: t.Optional(t.Any())
      }),
      // Bulk columns (array)
      t.Array(
        t.Object({
          key: t.String(),
          label: t.String(),
          dataType: t.Optional(t.String({ default: 'text' })),
          order: t.Optional(t.Number()),
          config: t.Optional(t.Any())
        })
      )
    ])
  })

  // Update column
  .patch('/:id/columns/:columnId', async ({ params: { id, columnId }, body, error }) => {
    try {
      return await prisma.column.update({
        where: { id: columnId, tableId: id },
        data: body
      });
    } catch (e) {
      return error(404, 'Column not found');
    }
  }, {
    body: t.Object({
      label: t.Optional(t.String()),
      key: t.Optional(t.String()),
      dataType: t.Optional(t.String()),
      order: t.Optional(t.Number()),
      config: t.Optional(t.Any())
    })
  })

  // Delete column
  .delete('/:id/columns/:columnId', async ({ params: { id, columnId }, error }) => {
    try {
      await prisma.column.delete({
        where: { id: columnId, tableId: id }
      });
      return { success: true };
    } catch (e) {
      return error(404, 'Column not found');
    }
  })

  // --- Rows ---

  // List rows (with pagination)
  .get('/:id/rows', async ({ params: { id }, query, error }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.row.findMany({
        where: { tableId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.row.count({ where: { tableId: id } })
    ]);

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String())
    })
  })

  // Add row
  .post('/:id/rows', async ({ params: { id }, body, error }) => {
    // Check if table exists
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) return error(404, 'Table not found');

    return await prisma.row.create({
      data: {
        tableId: id,
        data: body.data
      }
    });
  }, {
    body: t.Object({
      data: t.Object({}, { additionalProperties: true }) // Accept any JSON object
    })
  })

  // Update row
  .patch('/:id/rows/:rowId', async ({ params: { id, rowId }, body, error }) => {
    try {
      // We can choose to merge or replace. 
      // For simplicity, let's assume the client sends the full object or we merge at top level.
      // Prisma's Json update usually replaces the value.
      // If we want partial update of keys, we might need to fetch first or use raw query.
      // But for now, let's assume the client sends the patch and we merge it in code if needed, 
      // or just update the `data` field if the client sends the new state.
      
      // Better approach for "spreadsheet": Client sends { "company_name": "New Name" } and we want to update ONLY that key.
      // But Prisma `data: { data: body.data }` will replace the whole JSON.
      // To do deep merge, we need to fetch first.
      
      const row = await prisma.row.findUnique({ where: { id: rowId, tableId: id } });
      if (!row) return error(404, 'Row not found');

      const currentData = row.data as Record<string, any>;
      const newData = { ...currentData, ...body.data };

      return await prisma.row.update({
        where: { id: rowId },
        data: {
          data: newData
        }
      });
    } catch (e) {
      return error(404, 'Row not found');
    }
  }, {
    body: t.Object({
      data: t.Object({}, { additionalProperties: true })
    })
  })

  // Delete row
  .delete('/:id/rows/:rowId', async ({ params: { id, rowId }, error }) => {
    try {
      await prisma.row.delete({
        where: { id: rowId, tableId: id }
      });
      return { success: true };
    } catch (e) {
      return error(404, 'Row not found');
    }
  })

  // --- CSV Import/Export ---

  // Import CSV to create table with columns and rows
  .post('/import-csv', async ({ body, error }) => {
    try {
      const { name, description, csvContent } = body;
      
      // Parse CSV
      const { headers, rows } = parseCSV(csvContent);
      
      if (headers.length === 0) {
        return error(400, 'CSV must have headers');
      }

      // Create table
      const table = await prisma.table.create({
        data: {
          name,
          description: description || undefined
        }
      });

      // Infer data types from first few rows
      const columnsData = headers.map((header, index) => {
        const columnValues = rows.map(row => row[header]);
        const dataType = inferDataType(columnValues);
        
        // Create a stable key from the header
        const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        return {
          tableId: table.id,
          key,
          label: header,
          dataType,
          order: index
        };
      });

      // Create columns
      const createdColumns = await Promise.all(
        columnsData.map(col => prisma.column.create({ data: col }))
      );

      // Create rows with data keyed by column keys
      const rowsData = rows.map(row => {
        const data: Record<string, any> = {};
        headers.forEach((header, index) => {
          const key = columnsData[index].key;
          data[key] = row[header];
        });
        
        return {
          tableId: table.id,
          data
        };
      });

      await Promise.all(
        rowsData.map(row => prisma.row.create({ data: row }))
      );

      // Return the created table with columns
      const fullTable = await prisma.table.findUnique({
        where: { id: table.id },
        include: {
          columns: {
            orderBy: { order: 'asc' }
          },
          _count: {
            select: { rows: true }
          }
        }
      });

      return fullTable;
    } catch (e: any) {
      console.error('CSV import error:', e);
      return error(400, e.message || 'Failed to import CSV');
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      csvContent: t.String()
    })
  })

  // Export table to CSV
  .get('/:id/export-csv', async ({ params: { id }, error }) => {
    try {
      // Get table with columns
      const table = await prisma.table.findUnique({
        where: { id },
        include: {
          columns: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!table) {
        return error(404, 'Table not found');
      }

      // Get all rows
      const rows = await prisma.row.findMany({
        where: { tableId: id },
        orderBy: { createdAt: 'desc' }
      });

      // Extract headers from columns
      const headers = table.columns.map(col => col.label);
      const columnKeys = table.columns.map(col => col.key);

      // Map rows to CSV format
      const csvRows = rows.map(row => {
        const rowData = row.data as Record<string, any>;
        const csvRow: Record<string, any> = {};
        
        table.columns.forEach(col => {
          csvRow[col.label] = rowData[col.key] || '';
        });
        
        return csvRow;
      });

      // Generate CSV
      const csvContent = generateCSV(headers, csvRows);

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${table.name.replace(/[^a-z0-9]/gi, '_')}.csv"`
        }
      });
    } catch (e) {
      console.error('CSV export error:', e);
      return error(500, 'Failed to export CSV');
    }
  });
