import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { TenantsModule } from '../tenants/tenants.module';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { TenantAuthController } from './tenant-auth.controller';

@Module({
  imports: [
    UsersModule,
    PaymentsModule,
    MikrotikModule,
    TenantsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController, TenantAuthController],
})
export class AuthModule {}
