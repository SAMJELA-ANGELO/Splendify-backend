import { Controller, Get, UseGuards, Request, Logger, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import {
  TenantReportsDto,
  BillingReportDto,
  ActivityReportDto,
  TenantReportOverviewDto,
} from './dto';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@Controller('tenant/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({
    summary: 'Get comprehensive tenant reports',
    description:
      'Generates comprehensive business reports including revenue, user metrics, plans, routers, and top performers',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'all'],
    description: 'Report period (default: month)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant reports retrieved successfully',
    type: TenantReportsDto,
  })
  @Get()
  async getTenantReports(
    @Request() req: any,
    @Query('period') period?: 'today' | 'week' | 'month' | 'all',
  ): Promise<TenantReportsDto> {
    const reportPeriod = (period as any) || 'month';
    this.logger.log(`📊 Generating tenant reports for ${req.tenantId}, period: ${reportPeriod}`);

    try {
      const reports = await this.reportsService.getTenantReports(req.tenantId, reportPeriod);
      this.logger.log(`✅ Tenant reports generated for ${req.tenantId}`);
      return reports;
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate tenant reports: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get billing report',
    description:
      'Generates billing report with revenue breakdown, payment methods, and top performing plans',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'all'],
    description: 'Report period (default: month)',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing report retrieved successfully',
    type: BillingReportDto,
  })
  @Get('billing')
  async getBillingReport(
    @Request() req: any,
    @Query('period') period?: 'today' | 'week' | 'month' | 'all',
  ): Promise<BillingReportDto> {
    const reportPeriod = (period as any) || 'month';
    this.logger.log(`💳 Generating billing report for ${req.tenantId}, period: ${reportPeriod}`);

    try {
      const report = await this.reportsService.getBillingReport(req.tenantId, reportPeriod);
      this.logger.log(`✅ Billing report generated for ${req.tenantId}`);
      return report;
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate billing report: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get activity report',
    description:
      'Generates activity report with activity types, peak hours, and usage patterns',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'all'],
    description: 'Report period (default: month)',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity report retrieved successfully',
    type: ActivityReportDto,
  })
  @Get('activities')
  async getActivityReport(
    @Request() req: any,
    @Query('period') period?: 'today' | 'week' | 'month' | 'all',
  ): Promise<ActivityReportDto> {
    const reportPeriod = (period as any) || 'month';
    this.logger.log(`🎯 Generating activity report for ${req.tenantId}, period: ${reportPeriod}`);

    try {
      const report = await this.reportsService.getActivityReport(req.tenantId, reportPeriod);
      this.logger.log(`✅ Activity report generated for ${req.tenantId}`);
      return report;
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate activity report: ${error.message}`,
      );
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get report overview',
    description:
      'Generates quick overview dashboard with key metrics and basic charts',
  })
  @ApiResponse({
    status: 200,
    description: 'Report overview retrieved successfully',
    type: TenantReportOverviewDto,
  })
  @Get('overview')
  async getReportOverview(@Request() req: any): Promise<TenantReportOverviewDto> {
    this.logger.log(`📈 Generating report overview for ${req.tenantId}`);

    try {
      const overview = await this.reportsService.getTenantReportOverview(req.tenantId);
      this.logger.log(`✅ Report overview generated for ${req.tenantId}`);
      return overview;
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate report overview: ${error.message}`,
      );
      throw error;
    }
  }
}
