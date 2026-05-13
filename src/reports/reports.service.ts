import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TenantReportsDto,
  BillingReportDto,
  ActivityReportDto,
  TenantReportOverviewDto,
  TimelinePointDto,
  ReportMetricDto,
} from './dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async getTenantReports(tenantId: string, period: 'today' | 'week' | 'month' | 'all' = 'month'): Promise<TenantReportsDto> {
    this.logger.log(`📊 Generating tenant reports for ${tenantId}, period: ${period}`);

    const { startDate, endDate } = this.getPeriodDates(period);

    // Fetch data in parallel
    const [
      payments,
      users,
      sessions,
      activities,
      plans,
      routers,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.user.findMany({
        where: { tenantId },
        include: { plan: true, sessions: true },
      }),
      this.prisma.session.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          user: { tenantId },
        },
        include: { user: true },
      }),
      this.prisma.activity.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.plan.findMany({
        where: { tenantId },
        include: { users: true },
      }),
      this.prisma.router.findMany({
        where: { tenantId },
      }),
    ]);

    // Calculate metrics
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const successfulPayments = payments.filter(p => p.status === 'SUCCESSFUL').length;
    const failedPayments = payments.filter(p => p.status === 'FAILED').length;
    const totalPayments = payments.length;
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    const activeUsers = users.filter(u => u.isActive).length;
    const totalUsers = users.length;
    const newUsers = users.filter(
      u => new Date(u.createdAt) >= startDate && new Date(u.createdAt) <= endDate,
    ).length;

    const totalSessions = sessions.length;
    const successfulSessions = sessions.filter(s => s.isActive).length;
    const failedSessions = totalSessions - successfulSessions;
    const sessionSuccessRate = totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0;

    // Build timelines
    const revenueTimeline = this.buildTimeline(payments, 'payment', period);
    const sessionTimeline = this.buildTimeline(sessions, 'session', period);

    // Calculate plan distribution
    const planDistribution = plans.map(plan => ({
      planId: plan.id,
      planName: plan.name,
      count: plan.users.length,
      percentage: totalUsers > 0 ? (plan.users.length / totalUsers) * 100 : 0,
    }));

    const mostPopularPlan = planDistribution.length > 0
      ? planDistribution.reduce((prev, current) => (prev.count > current.count ? prev : current))
      : null;

    // Router utilization
    const routerLoadDistribution = routers.map(router => {
      const activeRouterUsers = sessions.filter(
        s => s.routerId === router.id && s.isActive,
      ).length;
      return {
        routerId: router.id,
        routerName: router.name,
        activeUsers: activeRouterUsers,
        capacity: 100, // Placeholder
        utilizationPercentage: (activeRouterUsers / 100) * 100,
      };
    });

    // Top spending users
    const userSpending = new Map<string, { spent: number; sessions: number }>();
    payments.forEach(payment => {
      if (payment.userId) {
        const current = userSpending.get(payment.userId) || { spent: 0, sessions: 0 };
        current.spent += Number(payment.amount);
        userSpending.set(payment.userId, current);
      }
    });

    const topSpendingUsers = Array.from(userSpending.entries())
      .map(([userId, data]) => {
        const user = users.find(u => u.id === userId);
        return {
          userId,
          username: user?.username || 'Unknown',
          email: user?.email || 'N/A',
          totalSpent: data.spent,
          sessionCount: data.sessions,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Calculate metrics
    const metrics: ReportMetricDto[] = [
      {
        label: 'Total Revenue',
        value: totalRevenue,
        color: '#10b981',
      },
      {
        label: 'Active Users',
        value: activeUsers,
        color: '#3b82f6',
      },
      {
        label: 'Success Rate',
        value: Math.round(successRate),
        color: '#f59e0b',
      },
      {
        label: 'Total Sessions',
        value: totalSessions,
        color: '#8b5cf6',
      },
    ];

    return {
      period,
      startDate,
      endDate,
      totalRevenue,
      averageRevenuePerDay: totalRevenue / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      revenueGrowth: 0, // Calculate based on previous period
      revenueTimeline,
      totalUsers,
      activeUsers,
      newUsers,
      userGrowth: 0,
      churnRate: 0,
      mostPopularPlan: mostPopularPlan ? {
        id: mostPopularPlan.planId,
        name: mostPopularPlan.planName,
        subscriptions: mostPopularPlan.count,
      } : null,
      planDistribution,
      totalSessions,
      successfulSessions,
      failedSessions,
      successRate: Math.round(sessionSuccessRate),
      averageSessionDuration: 2, // Placeholder
      sessionTimeline,
      totalRouters: routers.length,
      activeRouters: routers.filter(r => r.isActive).length,
      routerLoadDistribution,
      topSpendingUsers,
      topRouters: routers
        .map(r => ({
          routerId: r.id,
          routerName: r.name,
          activeUsers: sessions.filter(s => s.routerId === r.id && s.isActive).length,
          totalTraffic: 0,
        }))
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 5),
      metrics,
    };
  }

  async getBillingReport(tenantId: string, period: 'today' | 'week' | 'month' | 'all' = 'month'): Promise<BillingReportDto> {
    this.logger.log(`💳 Generating billing report for ${tenantId}, period: ${period}`);

    const { startDate, endDate } = this.getPeriodDates(period);

    const [payments, plans] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { plan: true },
      }),
      this.prisma.plan.findMany({
        where: { tenantId },
      }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const successfulTransactions = payments.filter(p => p.status === 'SUCCESSFUL').length;
    const failedTransactions = payments.filter(p => p.status === 'FAILED').length;
    const totalTransactions = payments.length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    const directPayments = payments.filter(p => p.paymentModel === 'DIRECT').length;
    const escrowPayments = payments.filter(p => p.paymentModel === 'ESCROW').length;

    const revenueByDay = this.buildTimeline(payments, 'payment', period);
    const transactionsByDay = this.buildTransactionTimeline(payments, period);

    // Top plans by revenue
    const planStats = new Map<string, { count: number; revenue: number }>();
    payments.forEach(payment => {
      if (payment.planId && payment.plan) {
        const current = planStats.get(payment.planId) || { count: 0, revenue: 0 };
        current.count += 1;
        current.revenue += Number(payment.amount);
        planStats.set(payment.planId, current);
      }
    });

    const topPlans = Array.from(planStats.entries())
      .map(([planId, stats]) => {
        const plan = plans.find(p => p.id === planId);
        return {
          planId,
          planName: plan?.name || 'Unknown',
          count: stats.count,
          revenue: stats.revenue,
          percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentStatus = {
      created: payments.filter(p => p.status === 'created').length,
      pending: payments.filter(p => p.status === 'pending').length,
      successful: successfulTransactions,
      failed: failedTransactions,
      expired: payments.filter(p => p.status === 'EXPIRED').length,
    };

    return {
      period,
      startDate,
      endDate,
      totalRevenue,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate: Math.round(successRate),
      directPayments,
      escrowPayments,
      revenueByDay,
      transactionsByDay,
      topPlans,
      paymentStatus,
    };
  }

  async getActivityReport(tenantId: string, period: 'today' | 'week' | 'month' | 'all' = 'month'): Promise<ActivityReportDto> {
    this.logger.log(`🎯 Generating activity report for ${tenantId}, period: ${period}`);

    const { startDate, endDate } = this.getPeriodDates(period);

    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalActivities = activities.length;

    // Group by type
    const activitiesByType = new Map<string, number>();
    activities.forEach(activity => {
      const type = activity.category || 'unknown';
      activitiesByType.set(type, (activitiesByType.get(type) || 0) + 1);
    });

    const activitiesByTypeArray = Array.from(activitiesByType.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalActivities > 0 ? (count / totalActivities) * 100 : 0,
    }));

    const activityTimeline = this.buildTimeline(activities, 'activity', period);

    // Peak hours
    const peakHours = this.calculatePeakHours(activities);

    return {
      period,
      startDate,
      endDate,
      totalActivities,
      activitiesByType: activitiesByTypeArray,
      peakHours,
      activityTimeline,
      paymentActivities: activitiesByType.get('PAYMENT') || 0,
      sessionActivities: activitiesByType.get('SESSION') || 0,
      connectionActivities: activitiesByType.get('CONNECTION') || 0,
      accountActivities: activitiesByType.get('ACCOUNT') || 0,
    };
  }

  async getTenantReportOverview(tenantId: string): Promise<TenantReportOverviewDto> {
    this.logger.log(`📈 Generating report overview for ${tenantId}`);

    const { startDate, endDate } = this.getPeriodDates('month');

    const [payments, users, sessions] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
          status: 'SUCCESSFUL',
        },
      }),
      this.prisma.user.findMany({
        where: { tenantId, isActive: true },
      }),
      this.prisma.session.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          user: { tenantId },
          isActive: true,
        },
      }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const activeUsers = users.length;
    const totalSessions = sessions.length;
    const successRate = sessions.length > 0 ? 95 : 0; // Placeholder

    const revenueChart = this.buildTimeline(payments, 'payment', 'month');
    const activityChart = this.buildTimeline(sessions, 'session', 'month');
    const userGrowthChart = this.buildTimeline(users, 'user', 'month');

    return {
      totalRevenue,
      activeUsers,
      totalSessions,
      successRate,
      revenueChart,
      activityChart,
      userGrowthChart,
      period: 'month',
      generatedAt: new Date(),
    };
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
    }

    return { startDate, endDate };
  }

  private buildTimeline(
    items: any[],
    type: 'payment' | 'session' | 'activity' | 'user',
    period: string,
  ): TimelinePointDto[] {
    const timeline = new Map<string, number>();
    const { startDate, endDate } = this.getPeriodDates(period);

    // Initialize all days/hours with 0
    const dateFormat = period === 'today' ? 'hour' : 'day';
    this.initializeTimeline(timeline, startDate, endDate, dateFormat);

    // Aggregate items
    items.forEach(item => {
      let dateField = item.createdAt;
      if (!dateField) return;

      const date = new Date(dateField);
      let key: string;

      if (dateFormat === 'hour') {
        key = `${date.getHours()}:00`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      timeline.set(key, (timeline.get(key) || 0) + 1);

      // For payments, add the amount instead of count
      if (type === 'payment' && item.amount) {
        timeline.set(key, (timeline.get(key) || 0) + Number(item.amount) - 1);
      }
    });

    return Array.from(timeline.entries()).map(([label, value]) => ({ label, value }));
  }

  private buildTransactionTimeline(items: any[], period: string): TimelinePointDto[] {
    const timeline = new Map<string, number>();
    const { startDate, endDate } = this.getPeriodDates(period);

    this.initializeTimeline(timeline, startDate, endDate, 'day');

    items.forEach(item => {
      const date = new Date(item.createdAt);
      const key = date.toISOString().split('T')[0];
      timeline.set(key, (timeline.get(key) || 0) + 1);
    });

    return Array.from(timeline.entries()).map(([label, value]) => ({ label, value }));
  }

  private initializeTimeline(timeline: Map<string, number>, startDate: Date, endDate: Date, format: 'day' | 'hour'): void {
    if (format === 'day') {
      const current = new Date(startDate);
      while (current <= endDate) {
        const key = current.toISOString().split('T')[0];
        if (!timeline.has(key)) {
          timeline.set(key, 0);
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      for (let i = 0; i < 24; i++) {
        timeline.set(`${i}:00`, 0);
      }
    }
  }

  private calculatePeakHours(activities: any[]): { hour: number; count: number }[] {
    const hourCounts = new Map<number, number>();

    for (let i = 0; i < 24; i++) {
      hourCounts.set(i, 0);
    }

    activities.forEach(activity => {
      const hour = new Date(activity.createdAt).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}
