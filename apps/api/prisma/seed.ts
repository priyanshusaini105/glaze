/**
 * Seed Script for Cell Enrichment Testing
 * 
 * Creates sample data:
 * - 1 table with 5 columns
 * - 10 rows with partial data
 * - Ready for enrichment testing
 * 
 * Run with: bun run seed
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Load environment variables from the api directory
config({ path: resolve(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting seed...\n");

  // Clean up existing test data
  console.log("Cleaning up existing test data...");
  await prisma.cellEnrichmentTask.deleteMany({});
  await prisma.enrichmentJob.deleteMany({});
  await prisma.row.deleteMany({});
  await prisma.column.deleteMany({});
  await prisma.table.deleteMany({});

  // Create a sample table
  console.log("Creating sample table...");
  const table = await prisma.table.create({
    data: {
      name: "Leads",
      description: "Sample leads table for enrichment testing",
    },
  });
  console.log(`  ✓ Created table: ${table.name} (${table.id})`);

  // Create columns
  console.log("\nCreating columns...");
  const columnDefs = [
    { key: "name", label: "Full Name", dataType: "text", order: 0 },
    { key: "email", label: "Email", dataType: "text", order: 1 },
    { key: "company", label: "Company", dataType: "text", order: 2 },
    { key: "title", label: "Job Title", dataType: "text", order: 3 },
    { key: "linkedin", label: "LinkedIn URL", dataType: "url", order: 4 },
    { key: "location", label: "Location", dataType: "text", order: 5 },
    { key: "industry", label: "Industry", dataType: "text", order: 6 },
    { key: "employee_count", label: "Employee Count", dataType: "number", order: 7 },
  ];

  const columns = await Promise.all(
    columnDefs.map((col) =>
      prisma.column.create({
        data: {
          tableId: table.id,
          ...col,
        },
      })
    )
  );

  for (const col of columns) {
    console.log(`  ✓ Created column: ${col.label} (${col.id})`);
  }

  // Create rows with partial data (simulating imported leads)
  console.log("\nCreating rows...");
  const rowData = [
    { name: "John Doe", email: null, company: null, title: null },
    { name: "Jane Smith", email: "jane@example.com", company: null, title: null },
    { name: "Bob Wilson", email: null, company: "Acme Corp", title: null },
    { name: "Alice Brown", email: null, company: null, title: "Engineer" },
    { name: "Charlie Davis", email: null, company: null, title: null },
    { name: "Eve Johnson", email: "eve@test.com", company: "Tech Inc", title: null },
    { name: "Frank Miller", email: null, company: null, title: "CEO" },
    { name: "Grace Lee", email: null, company: "StartupXYZ", title: "CTO" },
    { name: "Henry Chen", email: null, company: null, title: null },
    { name: "Ivy Wang", email: null, company: null, title: null },
  ];

  const rows = await Promise.all(
    rowData.map((data) =>
      prisma.row.create({
        data: {
          tableId: table.id,
          data,
          status: "idle",
        },
      })
    )
  );

  for (const row of rows) {
    const name = (row.data as Record<string, unknown>).name;
    console.log(`  ✓ Created row: ${name} (${row.id})`);
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ Seed completed successfully!\n");

  console.log("Summary:");
  console.log(`  Table ID: ${table.id}`);
  console.log(`  Columns: ${columns.length}`);
  console.log(`  Rows: ${rows.length}`);

  console.log("\nColumn IDs for testing:");
  for (const col of columns) {
    console.log(`  ${col.key}: ${col.id}`);
  }

  console.log("\nRow IDs for testing:");
  for (const row of rows) {
    const name = (row.data as Record<string, unknown>).name;
    console.log(`  ${name}: ${row.id}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n📝 Example API calls:\n");

  // Grid mode example
  console.log("1. Enrich email and company for first 3 rows (Grid Mode):");
  console.log(`   POST /tables/${table.id}/enrich`);
  console.log("   Body:", JSON.stringify({
    columnIds: [columns[1].id, columns[2].id], // email, company
    rowIds: rows.slice(0, 3).map(r => r.id),
  }, null, 2));

  // Explicit mode example
  console.log("\n2. Enrich specific cells (Explicit Mode):");
  console.log(`   POST /tables/${table.id}/enrich`);
  console.log("   Body:", JSON.stringify({
    cellIds: [
      { rowId: rows[0].id, columnId: columns[1].id }, // John's email
      { rowId: rows[3].id, columnId: columns[2].id }, // Alice's company
    ],
  }, null, 2));

  console.log("\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
