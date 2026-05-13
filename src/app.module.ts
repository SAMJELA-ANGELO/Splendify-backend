import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { PaymentsModule } from './payments/payments.module';
import { MikrotikModule } from './mikrotik/mikrotik.module';
import { SessionCleanupModule } from './session-cleanup/session-cleanup.module';
import { SessionsModule } from './sessions/sessions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BillingModule } from './billing/billing.module';
import { MetricsModule } from './metrics/metrics.module';
import { ActivitiesModule } from './activities/activities.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantSubscriptionsModule } from './tenant-subscriptions/tenant-subscriptions.module';
import { RouterModule } from './router/router.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantInterceptor } from './tenants/tenant.interceptor';
import { AdminSeederService } from './auth/admin-seeder.service';
import { RadiusModule } from './radius/radius.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 900000, // 15 minutes
        limit: 3,
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PlansModule,
    PaymentsModule,
    TenantSubscriptionsModule,
    MikrotikModule,
    SessionCleanupModule,
    SessionsModule,
    NotificationsModule,
    BillingModule,
    MetricsModule,
    ActivitiesModule,
    TenantsModule,
    RouterModule,
    DashboardModule,
    RadiusModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AdminSeederService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
