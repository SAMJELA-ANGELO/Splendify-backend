import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';
import {
  BillingConfigDto,
  BillingConfigResponseDto,
  EscrowBalanceDto,
  LedgerHistoryDto,
  LedgerFiltersDto,
  BalanceTransactionDto,
} from './dto';
import { encryptSecret, tryDecryptSecret } from '../common/encryption.util';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
    });
  }

  async create(tenantData: Partial<Tenant>): Promise<Tenant> {
    const data = { ...tenantData } as any;
    if (data.fapshiApiKey) {
      data.fapshiApiKey = encryptSecret(data.fapshiApiKey);
    }
    if (data.fapshiServiceId) {
      data.fapshiServiceId = encryptSecret(data.fapshiServiceId);
    }
    return this.prisma.tenant.create({
      data,
    });
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      where: { isActive: true },
    });
  }

  async update(
    id: string,
    updateData: Partial<Tenant>,
  ): Promise<Tenant | null> {
    // Filter out id and createdAt from updateData to avoid update conflicts
    const { id: _, createdAt: __, ...safeUpdateData } = updateData as any;
    return this.prisma.tenant.update({
      where: { id },
      data: safeUpdateData,
    });
  }

  /**
   * Get the billing configuration for a tenant
   */
  async getBillingConfig(tenantId: string): Promise<BillingConfigResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        billingTransactions: true,
        payouts: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    return {
      tenantId: tenant.id,
      paymentModel: tenant.paymentModel,
      hasFapshiKeys: !!tenant.fapshiApiKey && !!tenant.fapshiServiceId,
      payoutMobileMoney: tenant.payoutMobileMoney,
      payoutMinimumThreshold: Number(tenant.payoutMinimumThreshold) || 10000,
      escrowBalance: Number(tenant.escrowBalance) || 0,
      totalCommissionEarned: Number(tenant.totalCommissionEarned) || 0,
      totalPayoutsProcessed: Number(tenant.totalPayoutsProcessed) || 0,
    };
  }

  /**
   * Get the escrow balance for a tenant
   */
  async getEscrowBalance(tenantId: string): Promise<EscrowBalanceDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const payoutMinimum = Number(tenant.payoutMinimumThreshold) || 10000;
    const balance = Number(tenant.escrowBalance) || 0;
    const canRequestPayout = balance >= payoutMinimum;

    return {
      tenantId: tenant.id,
      balance,
      availableForPayout: canRequestPayout ? balance : 0,
      payoutMinimumThreshold: payoutMinimum,
      canRequestPayout,
      payoutMobileMoney: tenant.payoutMobileMoney,
      lastUpdated: tenant.escrowLastUpdated || new Date(),
    };
  }

  /**
   * Update billing configuration for a tenant
   */
  async updateBillingConfig(
    tenantId: string,
    billingConfig: BillingConfigDto,
  ): Promise<BillingConfigResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // If switching to DIRECT mode, validate that API keys are provided
    if (
      billingConfig.paymentModel === 'DIRECT' &&
      (!billingConfig.fapshiApiKey || !billingConfig.fapshiServiceId)
    ) {
      throw new BadRequestException(
        'DIRECT payment mode requires fapshiApiKey and fapshiServiceId',
      );
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        paymentModel: billingConfig.paymentModel,
        ...(billingConfig.fapshiApiKey && {
          fapshiApiKey: encryptSecret(billingConfig.fapshiApiKey),
        }),
        ...(billingConfig.fapshiServiceId && {
          fapshiServiceId: encryptSecret(billingConfig.fapshiServiceId),
        }),
        ...(billingConfig.payoutMobileMoney && {
          payoutMobileMoney: billingConfig.payoutMobileMoney,
        }),
        ...(billingConfig.payoutMinimumThreshold && {
          payoutMinimumThreshold: billingConfig.payoutMinimumThreshold,
        }),
      },
      include: {
        billingTransactions: true,
        payouts: true,
      },
    });

    return {
      tenantId: updatedTenant.id,
      paymentModel: updatedTenant.paymentModel,
      hasFapshiKeys:
        !!updatedTenant.fapshiApiKey && !!updatedTenant.fapshiServiceId,
      payoutMobileMoney: updatedTenant.payoutMobileMoney,
      payoutMinimumThreshold:
        Number(updatedTenant.payoutMinimumThreshold) || 10000,
      escrowBalance: Number(updatedTenant.escrowBalance) || 0,
      totalCommissionEarned: Number(updatedTenant.totalCommissionEarned) || 0,
      totalPayoutsProcessed: Number(updatedTenant.totalPayoutsProcessed) || 0,
    };
  }

  /**
   * Get ledger history for a tenant
   */
  async getLedgerHistory(
    tenantId: string,
    filters?: LedgerFiltersDto,
  ): Promise<LedgerHistoryDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const where: any = { tenantId };
    if (filters?.transactionType) {
      where.transactionType = filters.transactionType;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.balanceTransaction.count({ where }),
    ]);

    return {
      total,
      currentBalance: Number(tenant.escrowBalance) || 0,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        tenantId: tx.tenantId,
        paymentId: tx.paymentId || undefined,
        payoutRequestId: tx.payoutRequestId || undefined,
        amount: Number(tx.amount),
        fee: Number(tx.fee),
        netAmount: Number(tx.netAmount),
        transactionType: tx.transactionType,
        description: tx.description || undefined,
        createdAt: tx.createdAt,
      })),
    };
  }
}
