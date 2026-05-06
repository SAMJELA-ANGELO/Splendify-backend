import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // No constructor logic needed for basic setup

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma 6 connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
