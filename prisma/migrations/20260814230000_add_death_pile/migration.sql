-- CreateEnum
CREATE TYPE "DeathPileEntryKind" AS ENUM ('ADDED', 'LISTED');

-- CreateTable
CREATE TABLE "DeathPile" (
    "id" TEXT NOT NULL,
    "countRemaining" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeathPile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeathPileEntry" (
    "id" TEXT NOT NULL,
    "deathPileId" TEXT NOT NULL,
    "kind" "DeathPileEntryKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeathPileEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeathPileEntry_deathPileId_idx" ON "DeathPileEntry"("deathPileId");

-- AddForeignKey
ALTER TABLE "DeathPileEntry" ADD CONSTRAINT "DeathPileEntry_deathPileId_fkey" FOREIGN KEY ("deathPileId") REFERENCES "DeathPile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
