import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { TenantSignupDto } from './dto/tenant-signup.dto';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { TenantsService } from '../tenants/tenants.service';

@ApiTags('Tenant Auth')
@Controller('tenant/auth')
export class TenantAuthController {
  private readonly logger = new Logger(TenantAuthController.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private paymentsService: PaymentsService,
    private mikrotikService: MikrotikService,
    private tenantsService: TenantsService,
  ) {}

  @ApiOperation({ summary: 'Tenant portal login with username/email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Tenant login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() body: LoginDto) {
    this.logger.log(`🔑 Tenant login attempt: ${body.username}`);
    const result = await this.authService.login(req.user);
    this.logger.log(`✅ Tenant login successful: ${body.username}`);
    return result;
  }

  @ApiOperation({ summary: 'Register a new tenant portal user account' })
  @ApiBody({ type: TenantSignupDto })
  @ApiResponse({ status: 201, description: 'Tenant portal user successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  @Post('register')
  async register(@Body() body: TenantSignupDto, @Request() req: any) {
    this.logger.log(`📝 Tenant registration attempt: ${body.username}`);
    // No captive portal fields needed for tenant registration

    // Create new tenant
    const tenant = await this.tenantsService.create({
      name: body.username, // Temporary name, will be updated later
      email: body.email,
      isActive: true,
    });
    const tenantId = tenant.id;
    const role = 'ISP_ADMIN';
    this.logger.log(`✅ New tenant created: ${tenant.name} (ID: ${tenant.id})`);

    const user = await this.usersService.create(
      tenantId,
      body.username,
      body.password,
      body.email,
      undefined, // No MAC address for tenant registration
      undefined, // No IP address for tenant registration
      undefined, // No router identity for tenant registration
      role,
    );

    this.logger.log(`✅ User registered: ${user.username} (ID: ${user.id}, Role: ${user.role})`);
    const loginResult = await this.authService.login(user);
    this.logger.log(`✅ User auto-logged in: ${user.username}`);
    return loginResult;
  }
}
