import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseInterceptors,
  Logger,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { PayoutService } from './payout.service';
import { TenantInterceptor } from '../common/tenant.interceptor';
import { AdminGuard } from '../auth/admin.guard';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  BillingConfigDto,
  BillingConfigResponseDto,
  EscrowBalanceDto,
  RequestPayoutDto,
  PayoutResponseDto,
  PayoutListResponseDto,
  ProcessPayoutDto,
  AdminPayoutResponseDto,
  AdminPayoutsListDto,
  LedgerHistoryDto,
  LedgerFiltersDto,
} from './dto';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  private readonly logger = new Logger(TenantsController.name);

  constructor(
    private readonly tenantsService: TenantsService,
    private readonly payoutService: PayoutService,
  ) {}

  @ApiOperation({
    summary: 'Create a new tenant organization',
    description:
      'Create a new tenant with domain, subdomain, and business information.',
  })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Post()
  async create(@Body() createTenantDto: CreateTenantDto) {
    this.logger.log(
      `➕ Creating new tenant: ${createTenantDto.name}`,
    );
    try {
      const tenant = await this.tenantsService.create(createTenantDto);
      this.logger.log(`✅ Tenant created successfully with ID: ${tenant.id}`);
      return tenant;
    } catch (error: any) {
      this.logger.error(`❌ Failed to create tenant: ${error.message}`);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'List all active tenants',
    description: 'Retrieve all active tenant organizations.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active tenants',
    type: [TenantResponseDto],
  })
  @Get()
  async findAll() {
    this.logger.log(`📋 Fetching all active tenants`);
    try {
      const tenants = await this.tenantsService.findAll();
      this.logger.log(`✅ Retrieved ${tenants.length} active tenants`);
      return tenants;
    } catch (error: any) {
      this.logger.error(`❌ Failed to fetch tenants: ${error.message}`);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get tenant details by ID',
    description: 'Retrieve detailed information about a specific tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant details retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`🔍 Fetching tenant with ID: ${id}`);
    try {
      const tenant = await this.tenantsService.findById(id);
      if (!tenant) {
        this.logger.warn(`⚠️ Tenant not found: ${id}`);
        return { message: `Tenant ${id} not found` };
      }
      this.logger.log(`✅ Tenant details retrieved for: ${tenant.name}`);
      return tenant;
    } catch (error: any) {
      this.logger.error(`❌ Failed to fetch tenant ${id}: ${error.message}`);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Update tenant information',
    description: 'Update domain, business name, logo, or other tenant details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID to update',
    example: 'tenant-123',
  })
  @ApiBody({ type: UpdateTenantDto })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    this.logger.log(`✏️ Updating tenant: ${id}`);
    try {
      const tenant = await this.tenantsService.update(id, updateTenantDto);
      this.logger.log(`✅ Tenant updated successfully: ${id}`);
      return tenant;
    } catch (error: any) {
      this.logger.error(`❌ Failed to update tenant ${id}: ${error.message}`);
      throw error;
    }
  }

  // ============== BILLING CONFIG ENDPOINTS ==============

  @ApiOperation({
    summary: 'Get billing configuration',
    description:
      'Retrieve the current billing configuration and stats for a tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing configuration retrieved',
    type: BillingConfigResponseDto,
  })
  @Get(':id/billing-config')
  async getBillingConfig(@Param('id') id: string) {
    this.logger.log(`🏦 Fetching billing config for tenant: ${id}`);
    try {
      const config = await this.tenantsService.getBillingConfig(id);
      this.logger.log(`✅ Billing config retrieved for tenant: ${id}`);
      return config;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to fetch billing config for ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Update billing configuration',
    description:
      'Update payment model (DIRECT/ESCROW), Fapshi API keys, and payout settings.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiBody({ type: BillingConfigDto })
  @ApiResponse({
    status: 200,
    description: 'Billing configuration updated',
    type: BillingConfigResponseDto,
  })
  @Put(':id/billing-config')
  async updateBillingConfig(
    @Param('id') id: string,
    @Body() billingConfig: BillingConfigDto,
  ) {
    this.logger.log(`⚙️ Updating billing config for tenant: ${id}`);
    try {
      const config = await this.tenantsService.updateBillingConfig(
        id,
        billingConfig,
      );
      this.logger.log(`✅ Billing config updated for tenant: ${id}`);
      return config;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to update billing config for ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get escrow balance',
    description:
      'Get the current escrow balance and payout eligibility for a tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Escrow balance retrieved',
    type: EscrowBalanceDto,
  })
  @Get(':id/escrow-balance')
  async getEscrowBalance(@Param('id') id: string) {
    this.logger.log(`💰 Fetching escrow balance for tenant: ${id}`);
    try {
      const balance = await this.tenantsService.getEscrowBalance(id);
      this.logger.log(`✅ Escrow balance retrieved for tenant: ${id}`);
      return balance;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to fetch escrow balance for ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get ledger history',
    description:
      "Retrieve the transaction ledger for a tenant's escrow account.",
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiQuery({
    name: 'transactionType',
    description: 'Filter by transaction type',
    enum: ['PAYMENT', 'PAYOUT_REQUEST', 'PAYOUT_FAILED', 'PAYOUT_COMPLETED'],
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of transactions to return',
    example: 20,
    required: false,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of transactions to skip',
    example: 0,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Ledger history retrieved',
    type: LedgerHistoryDto,
  })
  @Get(':id/ledger')
  async getLedgerHistory(
    @Param('id') id: string,
    @Query('transactionType') transactionType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(`📊 Fetching ledger history for tenant: ${id}`);
    try {
      const filters: LedgerFiltersDto = {};
      if (transactionType) filters.transactionType = transactionType;
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      const ledger = await this.tenantsService.getLedgerHistory(id, filters);
      this.logger.log(`✅ Ledger history retrieved for tenant: ${id}`);
      return ledger;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to fetch ledger for ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  // ============== PAYOUT ENDPOINTS ==============

  @ApiOperation({
    summary: 'Request a payout',
    description:
      'Request to withdraw funds from escrow balance to mobile money.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiBody({ type: RequestPayoutDto })
  @ApiResponse({
    status: 201,
    description: 'Payout request created',
    type: PayoutResponseDto,
  })
  @Post(':id/request-payout')
  async requestPayout(
    @Param('id') id: string,
    @Body() request: RequestPayoutDto,
  ) {
    this.logger.log(
      `📤 Processing payout request for tenant: ${id}, amount: ${request.amount}`,
    );
    try {
      const payout = await this.payoutService.requestPayout(id, request);
      this.logger.log(
        `✅ Payout requested for tenant ${id}: ${request.amount}`,
      );
      return payout;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to request payout for ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'List tenant payouts',
    description:
      'Retrieve all payouts for a tenant with optional filtering by status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by payout status: pending, completed, or failed',
    example: 'pending',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results to return',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of results to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Payouts retrieved',
    type: PayoutListResponseDto,
  })
  @Get(':id/payouts')
  async getTenantPayouts(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(`📋 Fetching payouts for tenant: ${id}`);
    try {
      const payouts = await this.payoutService.getTenantPayouts(id, {
        status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      this.logger.log(
        `✅ Retrieved ${payouts.payouts.length} payouts for tenant: ${id}`,
      );
      return payouts;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to fetch payouts for ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get specific payout',
    description: 'Retrieve details of a specific payout request.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 'tenant-123',
  })
  @ApiParam({
    name: 'payoutId',
    description: 'Payout ID',
    example: 'payout-456',
  })
  @ApiResponse({
    status: 200,
    description: 'Payout retrieved',
    type: PayoutResponseDto,
  })
  @Get(':id/payouts/:payoutId')
  async getPayout(
    @Param('id') id: string,
    @Param('payoutId') payoutId: string,
  ) {
    this.logger.log(`🔍 Fetching payout ${payoutId} for tenant: ${id}`);
    try {
      const payout = await this.payoutService.getPayout(payoutId);
      this.logger.log(`✅ Payout retrieved: ${payoutId}`);
      return payout;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to fetch payout ${payoutId}: ${error.message}`,
      );
      throw error;
    }
  }

  // ============== ADMIN PAYOUT PROCESSING ENDPOINTS ==============

  @ApiOperation({
    summary: 'Get all pending payouts (Admin)',
    description:
      'Retrieve all pending payout requests across all tenants for admin processing.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results to return',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of results to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Pending payouts retrieved',
    type: AdminPayoutsListDto,
  })
  @UseGuards(AdminGuard)
  @Get('admin/payouts/pending')
  async getPendingPayouts(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(`👑 Admin fetching pending payouts`);
    try {
      const payouts = await this.payoutService.getPendingPayoutsAdmin(
        limit ? parseInt(limit) : 50,
        offset ? parseInt(offset) : 0,
      );
      this.logger.log(
        `✅ Retrieved ${payouts.payouts.length} pending payouts for admin`,
      );
      return payouts;
    } catch (error: any) {
      this.logger.error(`❌ Failed to fetch pending payouts: ${error.message}`);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Process payout request (Admin)',
    description:
      'Complete or fail a pending payout request. Only admins can process payouts.',
  })
  @ApiParam({
    name: 'payoutId',
    description: 'Payout ID to process',
    example: 'payout-456',
  })
  @ApiBody({ type: ProcessPayoutDto })
  @ApiResponse({
    status: 200,
    description: 'Payout processed successfully',
    type: AdminPayoutResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 400, description: 'Invalid action or payout status' })
  @UseGuards(AdminGuard)
  @Post('admin/payouts/:payoutId/process')
  async processPayout(
    @Param('payoutId') payoutId: string,
    @Body() processData: ProcessPayoutDto,
  ) {
    this.logger.log(
      `👑 Admin processing payout ${payoutId} with action: ${processData.action}`,
    );
    try {
      let result: AdminPayoutResponseDto;

      if (processData.action === 'complete') {
        result = await this.payoutService.processPayoutAdmin(payoutId);
        this.logger.log(`✅ Payout ${payoutId} completed by admin`);
      } else if (processData.action === 'fail') {
        result = await this.payoutService.failPayoutAdmin(
          payoutId,
          processData.failureReason,
        );
        this.logger.log(
          `❌ Payout ${payoutId} failed by admin: ${processData.failureReason}`,
        );
      } else {
        throw new BadRequestException(
          'Invalid action. Must be "complete" or "fail"',
        );
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to process payout ${payoutId}: ${error.message}`,
      );
      throw error;
    }
  }
}
