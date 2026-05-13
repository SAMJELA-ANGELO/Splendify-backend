import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Get tenant dashboard statistics',
    description:
      'Retrieves tenant-level dashboard metrics including revenue, active users, session counts and recent trend timelines.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid JWT token provided' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getDashboardStats(@Request() req: any): Promise<DashboardStatsDto> {
    this.logger.log(`📊 Dashboard stats requested for tenant: ${req.tenantId}`);
    const stats = await this.dashboardService.getTenantDashboardStats(
      req.tenantId,
    );
    this.logger.log(`✅ Dashboard stats retrieved for tenant: ${req.tenantId}`);
    return stats;
  }
}
