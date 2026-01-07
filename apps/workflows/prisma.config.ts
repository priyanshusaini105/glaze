/**
 * Prisma configuration for workflows package
 * Points to the API package's Prisma schema for shared database access
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { join } from "path";

export default defineConfig({
  schema: join(__dirname, "../api/prisma/schema.prisma"),
  datasource: {
    url: process.env["DATABASE_URL"] || 'postgresql://postgres:postgres@postgres:5432/glaze_db'
  }
});
