/*
  Warnings:

  - A unique constraint covering the columns `[voucherCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ipAddress" TEXT;

-- AlterTable
ALTER TABLE "Router" ADD COLUMN     "radiusSecret" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "voucherCode" TEXT;

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_value_key" ON "Blacklist"("value");

-- CreateIndex
CREATE UNIQUE INDEX "User_voucherCode_key" ON "User"("voucherCode");

-- CreateIndex
CREATE INDEX "User_voucherCode_idx" ON "User"("voucherCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
