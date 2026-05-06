import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateTenantSubscriptionOptionDto, SubscribeTenantDto } from './dto';

@Injectable()
export class TenantSubscriptionsService {
  private readonly logger = new Logger(TenantSubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async getSubscriptionOptions() {
    const options = await this.prisma.tenantRentalOption.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return options;
  }

  async createSubscriptionOption(
    optionData: CreateTenantSubscriptionOptionDto,
  ) {
    return this.prisma.tenantRentalOption.create({
      data: {
        name: optionData.name,
        price: optionData.price,
        billingCycle: optionData.billingCycle || 'MONTHLY',
        description: optionData.description || null,
        isActive: optionData.isActive ?? true,
      },
    });
  }

  async getTenantSubscription(tenantId: string) {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { option: true, payment: true },
    });

    if (!subscription) {
      throw new BadRequestException('No tenant subscription found');
    }

    return subscription;
  }

  private calculateSubscriptionExpiry(
    startDate: Date,
    billingCycle: string,
  ): Date {
    const expiresAt = new Date(startDate);
    switch (billingCycle.toUpperCase()) {
      case 'MONTHLY':
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        break;
      case 'QUARTERLY':
        expiresAt.setMonth(expiresAt.getMonth() + 3);
        break;
      case 'YEARLY':
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        break;
      default:
        expiresAt.setDate(expiresAt.getDate() + 30);
        break;
    }
    return expiresAt;
  }

  async subscribeTenant(
    tenantId: string,
    subscriptionData: SubscribeTenantDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const option = await this.prisma.tenantRentalOption.findUnique({
      where: { id: subscriptionData.optionId },
    });
    if (!option || !option.isActive) {
      throw new BadRequestException('Invalid or inactive subscription option');
    }

    const now = new Date();
    const subscription = await this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        optionId: option.id,
        status: 'PENDING',
        amount: option.price,
        billingCycle: option.billingCycle,
        startDate: now,
        expiresAt: this.calculateSubscriptionExpiry(now, option.billingCycle),
      },
    });

    const result = await this.paymentsService.initiateTenantSubscriptionPayment(
      tenantId,
      option.id,
      Number(option.price),
      subscriptionData.phone,
      subscriptionData.email,
      subscriptionData.externalId,
      subscriptionData.name,
      subscriptionData.userIp,
      subscription.id,
    );

    return {
      ...result,
      option,
      tenantId,
      subscription,
    };
  }
}
