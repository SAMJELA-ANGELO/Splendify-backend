import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityDto,
  RecentActivityResponseDto,
  ActivityStatsDto,
} from './dto/activity.dto';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a user activity
   */
  async logActivity(
    tenantId: string,
    userId: string,
    action: string,
    category: string,
    description: string,
    status: string = 'success',
    details?: Record<string, any>,
    ipAddress?: string,
    routing?: { routerIdentity?: string; sessionId?: string },
  ) {
    try {
      const activity = await this.prisma.activity.create({
        data: {
          tenantId,
          userId: userId || null,
          action,
          category,
          description,
          status,
          details: details || {},
          ipAddress,
          routerIdentity: routing?.routerIdentity,
          sessionId: routing?.sessionId,
        },
      });

      this.logger.debug(`📝 Activity logged for user ${userId}: ${action}`);
      return activity;
    } catch (error) {
      this.logger.error(`❌ Failed to log activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent activities for a user
   */
  async getRecentActivities(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<RecentActivityResponseDto> {
    this.logger.log(
      `📋 Fetching recent activities for user: ${userId}, page: ${page}`,
    );

    try {
      const skip = (page - 1) * pageSize;

      // Get total count
      const total = await this.prisma.activity.count({
        where: { userId },
      });

      // Get paginated activities, sorted by most recent first
      const activities = await this.prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      });

      if (!activities || activities.length === 0) {
        this.logger.log(`ℹ️ No activities found for user: ${userId}`);
        return {
          activities: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        };
      }

      // Transform to DTOs
      const activityDtos: ActivityDto[] = activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        category: activity.category,
        description: activity.description || '',
        status: activity.status,
        details: activity.details,
        timestamp: activity.createdAt,
        routerIdentity: activity.routerIdentity || undefined,
      }));

      const totalPages = Math.ceil(total / pageSize);

      this.logger.log(
        `✅ Recent activities retrieved for user: ${userId}, Total: ${total}, Page: ${page}/${totalPages}`,
      );

      return {
        activities: activityDtos,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch recent activities for user: ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get activity statistics for current month
   */
  async getActivityStats(userId: string): Promise<ActivityStatsDto> {
    this.logger.log(`📊 Fetching activity stats for user: ${userId}`);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      // Get activities for this month
      const monthActivities = await this.prisma.activity.findMany({
        where: {
          userId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      });

      // Get successful and failed counts
      const successfulActionsThisMonth = monthActivities.filter(
        (a) => a.status === 'success',
      ).length;
      const failedActionsThisMonth = monthActivities.filter(
        (a) => a.status === 'failed',
      ).length;

      // Get payment count
      const paymentsThisMonth = monthActivities.filter(
        (a) => a.category === 'payment',
      ).length;

      // Calculate total hours from session-related activities
      let hoursServiceActiveThisMonth = 0;
      monthActivities.forEach((activity) => {
        if (
          activity.category === 'payment' &&
          (activity.details as any)?.duration
        ) {
          hoursServiceActiveThisMonth += (activity.details as any).duration;
        }
      });

      const stats: ActivityStatsDto = {
        successfulActionsThisMonth,
        failedActionsThisMonth,
        paymentsThisMonth,
        hoursServiceActiveThisMonth,
        monthStart,
        monthEnd,
      };

      this.logger.log(
        `✅ Activity stats retrieved for user: ${userId}, Successful: ${successfulActionsThisMonth}, Failed: ${failedActionsThisMonth}`,
      );
      return stats;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch activity stats for user: ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Search activities by category
   */
  async getActivitiesByCategory(
    userId: string,
    category: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<RecentActivityResponseDto> {
    this.logger.log(`🔍 Fetching ${category} activities for user: ${userId}`);

    try {
      const skip = (page - 1) * pageSize;

      const total = await this.prisma.activity.count({
        where: {
          userId,
          category,
        },
      });
      const activities = await this.prisma.activity.findMany({
        where: { userId, category },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      });

      const activityDtos: ActivityDto[] = activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        category: activity.category,
        description: activity.description || '',
        status: activity.status,
        details: activity.details,
        timestamp: activity.createdAt,
        routerIdentity: activity.routerIdentity || undefined,
      }));

      const totalPages = Math.ceil(total / pageSize);

      return {
        activities: activityDtos,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch ${category} activities for user: ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
