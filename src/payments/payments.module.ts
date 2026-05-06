import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { ActivitiesModule } from '../activities/activities.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PlansModule,
    MikrotikModule,
    ActivitiesModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
