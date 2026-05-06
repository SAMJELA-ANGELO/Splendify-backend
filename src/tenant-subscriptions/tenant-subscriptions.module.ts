import { Module } from '@nestjs/common';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';
import { TenantSubscriptionsController } from './tenant-subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  providers: [TenantSubscriptionsService],
  controllers: [TenantSubscriptionsController],
})
export class TenantSubscriptionsModule {}
