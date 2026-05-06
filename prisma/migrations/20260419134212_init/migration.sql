-- CreateEnum
CREATE TYPE "PaymentModel" AS ENUM ('DIRECT', 'ESCROW');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('USER_PLAN', 'TENANT_RENTAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "subdomain" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "brandColors" JSONB,
    "businessName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mikrotikHost" TEXT,
    "mikrotikPort" INTEGER,
    "mikrotikUsername" TEXT,
    "mikrotikPassword" TEXT,
    "mikrotikIdentity" TEXT,
    "mikrotikUseSsl" BOOLEAN DEFAULT false,
    "paymentModel" "PaymentModel" NOT NULL DEFAULT 'ESCROW',
    "fapshiApiKey" TEXT,
    "fapshiServiceId" TEXT,
    "escrowBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "escrowLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payoutMobileMoney" TEXT,
    "payoutMinimumThreshold" DECIMAL(15,2) NOT NULL DEFAULT 10000,
    "totalGrossRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCommissionEarned" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalPayoutsProcessed" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "planId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sessionExpiry" TIMESTAMP(3),
    "mikrotikCreated" BOOLEAN NOT NULL DEFAULT false,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "routerIdentity" TEXT,
    "notification30minSent" TIMESTAMP(3),
    "notification10minSent" TIMESTAMP(3),
    "notificationExpiredSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL,
    "dataLimit" BIGINT,
    "downloadLimit" BIGINT,
    "uploadLimit" BIGINT,
    "sessionTimeout" INTEGER,
    "speedLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRentalOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRentalOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amount" DECIMAL(15,2) NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "planId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "grossAmount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "paymentModel" "PaymentModel" NOT NULL DEFAULT 'ESCROW',
    "paymentPurpose" "PaymentPurpose" NOT NULL DEFAULT 'USER_PLAN',
    "tenantSubscriptionId" TEXT,
    "fapshiTransactionId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "externalId" TEXT,
    "fapshiResponse" JSONB,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "recipientUsername" TEXT,
    "macAddress" TEXT,
    "routerIdentity" TEXT,
    "userIp" TEXT,
    "password" TEXT,
    "activeRouter" TEXT,
    "escrowCredited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationInitiatedSent" TIMESTAMP(3),
    "notificationSuccessSent" TIMESTAMP(3),
    "notificationFailedSent" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "mobileMoney" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "originalAmount" DECIMAL(15,2) NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "commissionAmount" DECIMAL(15,2) NOT NULL,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "mobileMoney" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT,
    "payoutRequestId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "fee" DECIMAL(15,2) NOT NULL,
    "netAmount" DECIMAL(15,2) NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'CREDIT',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Router" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "identity" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Router_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routerId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "dataUsed" BIGINT NOT NULL DEFAULT 0,
    "dataUsedDownload" BIGINT NOT NULL DEFAULT 0,
    "dataUsedUpload" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "remainingTime" INTEGER NOT NULL DEFAULT 0,
    "sessionTimeout" INTEGER,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "nasIdentifier" TEXT,
    "nasIpAddress" TEXT,
    "framedIpAddress" TEXT,
    "callingStationId" TEXT,
    "calledStationId" TEXT,
    "acctSessionId" TEXT,
    "acctTerminateCause" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'success',
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "routerIdentity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE INDEX "Tenant_subdomain_idx" ON "Tenant"("subdomain");

-- CreateIndex
CREATE INDEX "Tenant_domain_idx" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "Tenant_paymentModel_idx" ON "Tenant"("paymentModel");

-- CreateIndex
CREATE INDEX "Tenant_escrowBalance_idx" ON "Tenant"("escrowBalance");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_planId_idx" ON "User"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- CreateIndex
CREATE INDEX "Plan_tenantId_idx" ON "Plan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tenantId_name_key" ON "Plan"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_lastPaymentId_key" ON "TenantSubscription"("lastPaymentId");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_optionId_idx" ON "TenantSubscription"("optionId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paymentModel_idx" ON "Payment"("paymentModel");

-- CreateIndex
CREATE INDEX "Payment_paymentPurpose_idx" ON "Payment"("paymentPurpose");

-- CreateIndex
CREATE INDEX "Payment_fapshiTransactionId_idx" ON "Payment"("fapshiTransactionId");

-- CreateIndex
CREATE INDEX "Payout_tenantId_idx" ON "Payout"("tenantId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_requestedAt_idx" ON "Payout"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingTransaction_paymentId_key" ON "BillingTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "BillingTransaction_tenantId_idx" ON "BillingTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "BillingTransaction_transactionType_idx" ON "BillingTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "BillingTransaction_createdAt_idx" ON "BillingTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "PayoutRequest_tenantId_idx" ON "PayoutRequest"("tenantId");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

-- CreateIndex
CREATE INDEX "PayoutRequest_requestedAt_idx" ON "PayoutRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "BalanceTransaction_tenantId_idx" ON "BalanceTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_paymentId_idx" ON "BalanceTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_payoutRequestId_idx" ON "BalanceTransaction"("payoutRequestId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_transactionType_idx" ON "BalanceTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "BalanceTransaction_createdAt_idx" ON "BalanceTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Router_tenantId_idx" ON "Router"("tenantId");

-- CreateIndex
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");

-- CreateIndex
CREATE INDEX "Session_isActive_idx" ON "Session"("isActive");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_macAddress_idx" ON "Session"("macAddress");

-- CreateIndex
CREATE INDEX "Activity_tenantId_idx" ON "Activity"("tenantId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "TenantRentalOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_lastPaymentId_fkey" FOREIGN KEY ("lastPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Router" ADD CONSTRAINT "Router_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
