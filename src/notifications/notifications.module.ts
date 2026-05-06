import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { SessionNotificationService } from './session-notification.service';
import { PaymentNotificationsService } from './payment-notifications.service';
import { PaymentStatusNotificationService } from './payment-status-notification.service';
import { NotificationsController } from './notifications.controller';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, PlansModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    SessionNotificationService,
    PaymentNotificationsService,
    PaymentStatusNotificationService,
  ],
  exports: [
    NotificationsService,
    SessionNotificationService,
    PaymentNotificationsService,
    PaymentStatusNotificationService,
  ],
})
export class NotificationsModule {}
