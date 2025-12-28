-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "columns" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'text',
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rows" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "columns_tableId_key_key" ON "columns"("tableId", "key");

-- AddForeignKey
ALTER TABLE "columns" ADD CONSTRAINT "columns_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rows" ADD CONSTRAINT "rows_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
