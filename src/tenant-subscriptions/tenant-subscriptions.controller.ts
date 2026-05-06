import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';
import { CreateTenantSubscriptionOptionDto, SubscribeTenantDto } from './dto';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Tenant Subscriptions')
@Controller('tenant-subscriptions')
export class TenantSubscriptionsController {
  private readonly logger = new Logger(TenantSubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: TenantSubscriptionsService,
  ) {}

  @ApiOperation({ summary: 'List active tenant subscription options' })
  @ApiResponse({
    status: 200,
    description: 'Available tenant rental options retrieved',
  })
  @Get('options')
  async getOptions() {
    this.logger.log(`📋 Fetching tenant subscription options`);
    return this.subscriptionsService.getSubscriptionOptions();
  }

  @ApiOperation({ summary: 'Create a tenant subscription option (Admin)' })
  @ApiBody({ type: CreateTenantSubscriptionOptionDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription option created successfully',
  })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('options')
  async createOption(@Body() body: CreateTenantSubscriptionOptionDto) {
    this.logger.log(`➕ Creating tenant subscription option: ${body.name}`);
    return this.subscriptionsService.createSubscriptionOption(body);
  }

  @ApiOperation({ summary: 'Subscribe tenant to a rental option' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiBody({ type: SubscribeTenantDto })
  @ApiResponse({
    status: 201,
    description: 'Tenant subscription payment initiated successfully',
  })
  @Post(':tenantId/subscribe')
  async subscribe(
    @Param('tenantId') tenantId: string,
    @Body() body: SubscribeTenantDto,
  ) {
    this.logger.log(`💳 Initiating tenant subscription for ${tenantId}`);
    return this.subscriptionsService.subscribeTenant(tenantId, body);
  }

  @ApiOperation({ summary: 'Get tenant subscription status' })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant subscription status retrieved',
  })
  @Get(':tenantId')
  async getSubscription(@Param('tenantId') tenantId: string) {
    this.logger.log(`🔍 Fetching tenant subscription status for ${tenantId}`);
    return this.subscriptionsService.getTenantSubscription(tenantId);
  }
}
