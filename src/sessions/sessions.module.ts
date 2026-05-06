import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RouterModule } from '../router/router.module';

@Module({
  imports: [UsersModule, PlansModule, PrismaModule, RouterModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
