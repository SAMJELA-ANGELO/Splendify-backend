/*
  Warnings:

  - You are about to drop the column `domain` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mikrotikHost` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mikrotikIdentity` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mikrotikPassword` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mikrotikPort` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mikrotikUseSsl` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `mikrotikUsername` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `subdomain` on the `Tenant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Tenant_domain_idx";

-- DropIndex
DROP INDEX "Tenant_domain_key";

-- DropIndex
DROP INDEX "Tenant_subdomain_idx";

-- DropIndex
DROP INDEX "Tenant_subdomain_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "domain",
DROP COLUMN "mikrotikHost",
DROP COLUMN "mikrotikIdentity",
DROP COLUMN "mikrotikPassword",
DROP COLUMN "mikrotikPort",
DROP COLUMN "mikrotikUseSsl",
DROP COLUMN "mikrotikUsername",
DROP COLUMN "subdomain";
