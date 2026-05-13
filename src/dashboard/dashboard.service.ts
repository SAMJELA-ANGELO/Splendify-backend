import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsDto, TimelinePointDto } from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTenantDashboardStats(
    tenantId: string,
  ): Promise<DashboardStatsDto> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, totalSessions, todaySessions, successCount, failedCount] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.session.count({ where: { tenantId } }),
        this.prisma.session.count({
          where: { tenantId, startTime: { gte: todayStart } },
        }),
        this.prisma.activity.count({
          where: {
            tenantId,
            status: 'success',
            createdAt: { gte: monthStart, lte: now },
          },
        }),
        this.prisma.activity.count({
          where: {
            tenantId,
            status: 'failed',
            createdAt: { gte: monthStart, lte: now },
          },
        }),
      ]);

    const activeUsersResult = await this.prisma.session.groupBy({
      by: ['userId'],
      where: { tenantId, isActive: true },
    });
    const activeUsers = activeUsersResult.length;

    const totalRevenue = Number(tenant.totalGrossRevenue || 0);
    const totalActivityCount = successCount + failedCount;
    const successRate = totalActivityCount
      ? Math.round((successCount / totalActivityCount) * 100)
      : 100;

    const revenueTimeline = await this.buildRevenueTimeline(tenantId, 7);
    const activityTimeline = await this.buildActivityTimeline(tenantId, 7);

    return {
      totalRevenue,
      activeUsers,
      totalUsers,
      todaySessions,
      totalSessions,
      successRate,
      revenueTimeline,
      activityTimeline,
    };
  }

  private async buildRevenueTimeline(
    tenantId: string,
    days: number,
  ): Promise<TimelinePointDto[]> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: 'SUCCESSFUL',
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.buildTimeline(startDate, days, payments, (payment) =>
      Number(payment.amount || 0),
    );
  }

  private async buildActivityTimeline(
    tenantId: string,
    days: number,
  ): Promise<TimelinePointDto[]> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.buildTimeline(startDate, days, activities, () => 1);
  }

  private buildTimeline<T extends { createdAt: Date }>(
    startDate: Date,
    days: number,
    records: T[],
    valueSelector: (record: T) => number,
  ): TimelinePointDto[] {
    const buckets: Record<string, number> = {};
    const timeline: TimelinePointDto[] = [];

    records.forEach((record) => {
      const key = record.createdAt.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] || 0) + valueSelector(record);
    });

    for (let day = 0; day < days; day++) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + day);
      const key = current.toISOString().slice(0, 10);
      timeline.push({
        label: current.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: buckets[key] || 0,
      });
    }

    return timeline;
  }
}
