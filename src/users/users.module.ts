import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, MikrotikModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
