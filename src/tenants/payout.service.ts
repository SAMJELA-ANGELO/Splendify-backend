import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Payout } from '@prisma/client';
import { RequestPayoutDto, PayoutResponseDto } from '../tenants/dto';

@Injectable()
export class PayoutService {
  constructor(private prisma: PrismaService) {}

  /**
   * Request a payout for a tenant's escrow balance
   */
  async requestPayout(
    tenantId: string,
    request: RequestPayoutDto,
  ): Promise<PayoutResponseDto> {
    // Fetch tenant and their current balance
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Validate that tenant is in ESCROW mode
    if (tenant.paymentModel !== 'ESCROW') {
      throw new BadRequestException(
        'Payouts are only available for tenants in ESCROW payment mode',
      );
    }

    // Validate payout amount
    const balance = Number(tenant.escrowBalance) || 0;
    if (request.amount > balance) {
      throw new BadRequestException(
        `Payout amount (${request.amount}) exceeds available balance (${balance})`,
      );
    }

    const payoutMinimum = Number(tenant.payoutMinimumThreshold) || 10000;
    if (request.amount < payoutMinimum) {
      throw new BadRequestException(
        `Payout amount must be at least ${payoutMinimum}`,
      );
    }

    // Determine mobile money number
    const mobileMoney = request.mobileMoney || tenant.payoutMobileMoney;
    if (!mobileMoney) {
      throw new BadRequestException(
        'Mobile money number is required for payout. Please provide one or set it in billing config.',
      );
    }

    // Create payout record
    const payout = await this.prisma.payout.create({
      data: {
        tenantId,
        amount: request.amount,
        status: 'PENDING',
        mobileMoney,
        requestedAt: new Date(),
      },
    });

    // Deduct from tenant balance
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        escrowBalance: balance - request.amount,
        escrowLastUpdated: new Date(),
      },
    });

    const prismaAny = this.prisma as any;
    await prismaAny.balanceTransaction.create({
      data: {
        tenantId,
        payoutRequestId: payout.id,
        amount: request.amount,
        fee: 0,
        netAmount: -request.amount,
        transactionType: 'PAYOUT_REQUEST',
        description: `Payout request deducted from escrow for payout ${payout.id}`,
      },
    });

    return this.formatPayoutResponse(payout);
  }

  /**
   * Get all payouts for a tenant
   */
  async getTenantPayouts(
    tenantId: string,
    filters?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ payouts: PayoutResponseDto[]; total: number }> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      payouts: payouts.map((p) => this.formatPayoutResponse(p)),
      total,
    };
  }

  /**
   * Get a specific payout
   */
  async getPayout(payoutId: string): Promise<PayoutResponseDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new BadRequestException('Payout not found');
    }

    return this.formatPayoutResponse(payout);
  }

  /**
   * Mark a payout as processed (simulating payment gateway call)
   */
  async processPayout(payoutId: string): Promise<PayoutResponseDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new BadRequestException('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot process payout with status: ${payout.status}`,
      );
    }

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return this.formatPayoutResponse(updated);
  }

  /**
   * Mark a payout as failed
   */
  async failPayout(
    payoutId: string,
    reason?: string,
  ): Promise<PayoutResponseDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new BadRequestException('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot fail payout with status: ${payout.status}`,
      );
    }

    // Restore balance to tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payout.tenantId },
    });

    if (tenant) {
      await this.prisma.tenant.update({
        where: { id: payout.tenantId },
        data: {
          escrowBalance:
            Number(tenant.escrowBalance || 0) + Number(payout.amount),
          escrowLastUpdated: new Date(),
        },
      });

      const prismaAny = this.prisma as any;
      await prismaAny.balanceTransaction.create({
        data: {
          tenantId: payout.tenantId,
          payoutRequestId: payout.id,
          amount: payout.amount,
          fee: 0,
          netAmount: Number(payout.amount),
          transactionType: 'PAYOUT_FAILED',
          description: `Payout failure reversal for payout ${payout.id}`,
        },
      });
    }

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
      },
    });

    return this.formatPayoutResponse(updated);
  }

  /**
   * Get pending payouts
   */
  async getPendingPayouts(limit = 100): Promise<PayoutResponseDto[]> {
    const payouts = await this.prisma.payout.findMany({
      where: { status: 'PENDING' },
      orderBy: { requestedAt: 'asc' },
      take: limit,
    });

    return payouts.map((p) => this.formatPayoutResponse(p));
  }

  /**
   * Get pending payouts for admin (with tenant info)
   */
  async getPendingPayoutsAdmin(
    limit = 50,
    offset = 0,
  ): Promise<{ payouts: any[]; total: number }> {
    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { status: 'PENDING' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { requestedAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.payout.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      payouts: payouts.map((p) => this.formatAdminPayoutResponse(p)),
      total,
    };
  }

  /**
   * Process payout as admin (mark as completed)
   */
  async processPayoutAdmin(payoutId: string): Promise<any> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!payout) {
      throw new BadRequestException('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot process payout with status: ${payout.status}`,
      );
    }

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        completedAt: new Date(),
      },
      include: { tenant: { select: { id: true, name: true } } },
    });

    const prismaAny = this.prisma as any;
    await prismaAny.balanceTransaction.create({
      data: {
        tenantId: updated.tenantId,
        payoutRequestId: updated.id,
        amount: updated.amount,
        fee: 0,
        netAmount: 0,
        transactionType: 'PAYOUT_COMPLETED',
        description: `Payout ${updated.id} marked completed`,
      },
    });

    return this.formatAdminPayoutResponse(updated);
  }

  /**
   * Fail payout as admin
   */
  async failPayoutAdmin(payoutId: string, reason?: string): Promise<any> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!payout) {
      throw new BadRequestException('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot fail payout with status: ${payout.status}`,
      );
    }

    // Restore balance to tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payout.tenantId },
    });

    if (tenant) {
      await this.prisma.tenant.update({
        where: { id: payout.tenantId },
        data: {
          escrowBalance:
            Number(tenant.escrowBalance || 0) + Number(payout.amount),
          escrowLastUpdated: new Date(),
        },
      });

      const prismaAny = this.prisma as any;
      await prismaAny.balanceTransaction.create({
        data: {
          tenantId: payout.tenantId,
          payoutRequestId: payout.id,
          amount: payout.amount,
          fee: 0,
          netAmount: Number(payout.amount),
          transactionType: 'PAYOUT_FAILED',
          description: `Payout failure reversal for payout ${payout.id}`,
        },
      });
    }

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
      },
      include: { tenant: { select: { id: true, name: true } } },
    });

    return this.formatAdminPayoutResponse(updated);
  }

  private formatPayoutResponse(payout: Payout): PayoutResponseDto {
    return {
      id: payout.id,
      tenantId: payout.tenantId,
      amount: Number(payout.amount),
      status: payout.status,
      mobileMoney: payout.mobileMoney,
      requestedAt: payout.requestedAt,
      processedAt: payout.processedAt || undefined,
      completedAt: payout.completedAt || undefined,
    };
  }

  private formatAdminPayoutResponse(payout: any): any {
    return {
      id: payout.id,
      tenantId: payout.tenantId,
      tenantName: payout.tenant.name,
      amount: Number(payout.amount),
      status: payout.status,
      mobileMoney: payout.mobileMoney,
      requestedAt: payout.requestedAt,
      processedAt: payout.processedAt || undefined,
      completedAt: payout.completedAt || undefined,
    };
  }
}
