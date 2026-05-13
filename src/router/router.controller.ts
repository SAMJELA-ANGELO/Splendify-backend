import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RouterService } from './router.service';
import { CreateRouterDto, UpdateRouterDto, RouterResponseDto } from './dto';
import * as TenantTypes from '../tenants/tenant.interceptor';
import { Request } from 'express';
import { MikrotikService } from '../mikrotik/mikrotik.service';

@ApiTags('Routers')
@Controller('routers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class RouterController {
  private readonly logger = new Logger(RouterController.name);

  constructor(
    private readonly routerService: RouterService,
    private readonly mikrotikService: MikrotikService,
  ) {}

  @ApiOperation({ summary: 'Create a router for the current tenant' })
  @ApiBody({ type: CreateRouterDto })
  @ApiResponse({ status: 201, type: RouterResponseDto })
  @Post()
  async create(
    @Req() request: TenantTypes.RequestWithTenant,
    @Body() createRouterDto: CreateRouterDto,
  ) {
    const tenantId = request.tenantId!;
    this.logger.log(
      `Creating router for tenant ${tenantId}: ${createRouterDto.name}`,
    );
    return this.routerService.create(tenantId, createRouterDto);
  }

  @ApiOperation({ summary: 'List routers for the current tenant' })
  @ApiResponse({ status: 200, type: [RouterResponseDto] })
  @Get()
  async findAll(@Req() request: TenantTypes.RequestWithTenant) {
    const tenantId = request.tenantId!;
    this.logger.log(`Listing routers for tenant ${tenantId}`);
    return this.routerService.findAll(tenantId);
  }

  @ApiOperation({ summary: 'Get a router by ID for the current tenant' })
  @ApiParam({ name: 'id', description: 'Router ID', example: 'router-123' })
  @ApiResponse({ status: 200, type: RouterResponseDto })
  @Get(':id')
  async findOne(
    @Req() request: TenantTypes.RequestWithTenant,
    @Param('id') id: string,
  ) {
    const tenantId = request.tenantId!;
    this.logger.log(`Fetching router ${id} for tenant ${tenantId}`);
    return this.routerService.findOne(tenantId, id);
  }

  @ApiOperation({ summary: 'Update a router for the current tenant' })
  @ApiParam({ name: 'id', description: 'Router ID', example: 'router-123' })
  @ApiBody({ type: UpdateRouterDto })
  @ApiResponse({ status: 200, type: RouterResponseDto })
  @Put(':id')
  async update(
    @Req() request: TenantTypes.RequestWithTenant,
    @Param('id') id: string,
    @Body() updateRouterDto: UpdateRouterDto,
  ) {
    const tenantId = request.tenantId!;
    this.logger.log(`Updating router ${id} for tenant ${tenantId}`);
    return this.routerService.update(tenantId, id, updateRouterDto);
  }

  @ApiOperation({ summary: 'Delete a router for the current tenant' })
  @ApiParam({ name: 'id', description: 'Router ID', example: 'router-123' })
  @ApiResponse({ status: 200, description: 'Router deleted successfully' })
  @Delete(':id')
  async remove(
    @Req() request: TenantTypes.RequestWithTenant,
    @Param('id') id: string,
  ) {
    const tenantId = request.tenantId!;
    this.logger.log(`Deleting router ${id} for tenant ${tenantId}`);
    return this.routerService.remove(tenantId, id);
  }

  @ApiOperation({ summary: 'Test MikroTik connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @Post('test-connection')
  async testConnection() {
    this.logger.log(`Testing MikroTik connection`);
    try {
      const result = await this.mikrotikService.testConnection();
      return { success: true, message: 'MikroTik connection successful', data: result };
    } catch (error) {
      this.logger.error(`MikroTik connection test failed: ${error.message}`);
      return { success: false, message: 'MikroTik connection failed', error: error.message };
    }
  }
}
