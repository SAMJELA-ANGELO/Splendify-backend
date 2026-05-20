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
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';

@ApiTags('Tenant Auth')
@Controller('tenant/auth')
export class TenantAuthController {
  private readonly logger = new Logger(TenantAuthController.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private paymentsService: PaymentsService,
    private mikrotikService: MikrotikService,
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
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Tenant portal user successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  @Post('register')
  async register(@Body() body: SignupDto, @Request() req: any) {
    this.logger.log(`📝 Tenant registration attempt: ${body.username} (Tenant: ${body.tenantId})`);
    if (body.macAddress) {
      this.logger.log(`   📌 Device MAC: ${body.macAddress}`);
    }

    const user = await this.usersService.create(
      body.tenantId,
      body.username,
      body.password,
      body.email,
      body.macAddress,
      body.ipAddress,
      body.routerIdentity,
    );

    this.logger.log(`✅ Tenant user registered: ${user.username} (ID: ${user.id})`);
    const loginResult = await this.authService.login(user);
    this.logger.log(`✅ Tenant user auto-logged in: ${user.username}`);
    return loginResult;
  }
}
