import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceDto, BillingHistoryResponseDto, BillingStatsDto } from './dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private prisma: PrismaService) {}

  async getBillingHistory(userId: string): Promise<BillingHistoryResponseDto> {
    this.logger.log(`📋 Fetching billing history for user: ${userId}`);

    try {
      // Fetch all payments for this user, sorted by most recent first
      const payments = await this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!payments || payments.length === 0) {
        this.logger.log(`ℹ️ No payment history found for user: ${userId}`);
        return {
          totalInvoices: 0,
          totalAmountSpent: 0,
          invoices: [],
        };
      }

      // Fetch all plans for reference
      const plans = await this.prisma.plan.findMany();
      const plansMap = new Map<string, (typeof plans)[number]>();
      plans.forEach((plan) => {
        plansMap.set(plan.id, plan);
      });

      // Transform payments to invoice DTOs
      const invoices: InvoiceDto[] = payments.map((payment) => {
        const plan = plansMap.get(payment.planId || '');

        return {
          id: payment.id,
          planName: plan?.name || 'Unknown Plan',
          amount: Number(payment.amount),
          duration: plan?.duration || 0,
          purchaseDate: payment.createdAt,
          status: payment.status,
          transactionId: payment.fapshiTransactionId,
          email: payment.email || undefined,
          phone: payment.phone || undefined,
          isGift: payment.isGift || false,
          recipientUsername: payment.recipientUsername || undefined,
          activeRouter: payment.activeRouter ?? undefined,
        };
      });

      // Calculate totals and date ranges
      const totalAmountSpent = invoices.reduce(
        (sum, invoice) => sum + invoice.amount,
        0,
      );
      const sortedByDate = [...invoices].sort(
        (a, b) =>
          new Date(a.purchaseDate).getTime() -
          new Date(b.purchaseDate).getTime(),
      );

      const response: BillingHistoryResponseDto = {
        totalInvoices: invoices.length,
        totalAmountSpent,
        invoices,
        startDate:
          sortedByDate.length > 0 ? sortedByDate[0].purchaseDate : undefined,
        endDate:
          sortedByDate.length > 0
            ? sortedByDate[sortedByDate.length - 1].purchaseDate
            : undefined,
      };

      this.logger.log(
        `✅ Billing history retrieved for user: ${userId}, Total: ${response.totalInvoices} invoices, ${response.totalAmountSpent} CFA`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch billing history for user: ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getBillingStats(userId: string): Promise<BillingStatsDto> {
    this.logger.log(`📊 Fetching billing stats for user: ${userId}`);

    try {
      const payments = await this.prisma.payment.findMany({
        where: { userId },
      });

      if (!payments || payments.length === 0) {
        return {
          totalPurchases: 0,
          totalSpent: 0,
          totalHoursPurchased: 0,
          successfulPayments: 0,
          failedPayments: 0,
          giftsReceived: 0,
          startDate: null,
          endDate: null,
        };
      }

      const plans = await this.prisma.plan.findMany();
      const plansMap = new Map<string, (typeof plans)[number]>();
      plans.forEach((plan) => {
        plansMap.set(plan.id, plan);
      });

      const successfulPayments = payments.filter(
        (p) => p.status === 'SUCCESSFUL',
      );
      const failedPayments = payments.filter((p) => p.status === 'FAILED');
      const giftsReceived = payments.filter(
        (p) => p.isGift && p.recipientUsername === userId,
      );

      let totalHoursPurchased = 0;
      successfulPayments.forEach((payment) => {
        const plan = plansMap.get(payment.planId || '');
        if (plan) {
          totalHoursPurchased += plan.duration;
        }
      });

      const totalSpent = successfulPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const sortedByDate = [...payments].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      return {
        totalPurchases: payments.length,
        totalSpent,
        totalHoursPurchased,
        successfulPayments: successfulPayments.length,
        failedPayments: failedPayments.length,
        giftsReceived: giftsReceived.length,
        startDate: sortedByDate[0]?.createdAt,
        endDate: sortedByDate[sortedByDate.length - 1]?.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch billing stats for user: ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
