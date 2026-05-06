import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantsService } from './tenants.service';
import { PayoutService } from './payout.service';
import { TenantsController } from './tenants.controller';
import { TenantInterceptor } from './tenant.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, PayoutService, TenantInterceptor],
  exports: [TenantsService, PayoutService, TenantInterceptor],
})
export class TenantsModule {}
