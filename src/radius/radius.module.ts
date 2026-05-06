import { Module } from '@nestjs/common';
import { RadiusService } from './radius.service';
import { RadiusController } from './radius.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RadiusController],
  providers: [RadiusService],
  exports: [RadiusService],
})
export class RadiusModule {}