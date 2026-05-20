import { Module } from '@nestjs/common';
import { RadiusService } from './radius.service';
import { RadiusController } from './radius.controller';
import { RadiusHealthController } from './radius-health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RouterModule } from '../router/router.module';

@Module({
  imports: [PrismaModule, RouterModule],
  controllers: [RadiusController, RadiusHealthController],
  providers: [RadiusService],
  exports: [RadiusService],
})
export class RadiusModule {}