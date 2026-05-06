/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `Router` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `localIpAddress` to the `Router` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Router" DROP COLUMN "ipAddress",
ADD COLUMN     "adminPassword" TEXT,
ADD COLUMN     "localIpAddress" TEXT NOT NULL,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
