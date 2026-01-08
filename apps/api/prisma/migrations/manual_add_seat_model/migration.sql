-- CreateTable - Add Seat model for MVP credit system
-- Max 10 seats, 25 credits per seat, 1 credit = 1 cell enrichment

CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 25,
    "totalCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seats_userId_key" ON "seats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seats_email_key" ON "seats"("email");
