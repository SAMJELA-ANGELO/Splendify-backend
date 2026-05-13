export class TimelinePointDto {
  label: string;
  value: number;
}

export class ReportMetricDto {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  color?: string;
}

export class TenantReportsDto {
  // Period metadata
  period: string; // 'today' | 'week' | 'month' | 'all'
  startDate: Date;
  endDate: Date;

  // Revenue metrics
  totalRevenue: number;
  averageRevenuePerDay: number;
  revenueGrowth: number; // percentage
  revenueTimeline: TimelinePointDto[];

  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number; // in period
  userGrowth: number; // percentage
  churnRate: number; // percentage

  // Plan metrics
  mostPopularPlan: {
    id: string;
    name: string;
    subscriptions: number;
  } | null;
  planDistribution: {
    planId: string;
    planName: string;
    count: number;
    percentage: number;
  }[];

  // Session metrics
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  successRate: number; // percentage
  averageSessionDuration: number; // in hours
  sessionTimeline: TimelinePointDto[];

  // Router metrics
  totalRouters: number;
  activeRouters: number;
  routerLoadDistribution: {
    routerId: string;
    routerName: string;
    activeUsers: number;
    capacity: number;
    utilizationPercentage: number;
  }[];

  // Top performers
  topSpendingUsers: {
    userId: string;
    username: string;
    email: string;
    totalSpent: number;
    sessionCount: number;
  }[];

  topRouters: {
    routerId: string;
    routerName: string;
    activeUsers: number;
    totalTraffic: number; // in bytes
  }[];

  // Summary metrics
  metrics: ReportMetricDto[];
}

export class BillingReportDto {
  period: string;
  startDate: Date;
  endDate: Date;

  // Revenue breakdown
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;

  // By payment model
  directPayments: number;
  escrowPayments: number;

  // Time series
  revenueByDay: TimelinePointDto[];
  transactionsByDay: TimelinePointDto[];

  // Top plans
  topPlans: {
    planId: string;
    planName: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];

  // Payment status breakdown
  paymentStatus: {
    created: number;
    pending: number;
    successful: number;
    failed: number;
    expired: number;
  };
}

export class ActivityReportDto {
  period: string;
  startDate: Date;
  endDate: Date;

  totalActivities: number;
  activitiesByType: {
    type: string;
    count: number;
    percentage: number;
  }[];

  peakHours: {
    hour: number;
    count: number;
  }[];

  activityTimeline: TimelinePointDto[];

  // Detailed breakdown
  paymentActivities: number;
  sessionActivities: number;
  connectionActivities: number;
  accountActivities: number;
}

export class TenantReportOverviewDto {
  // Key metrics
  totalRevenue: number;
  activeUsers: number;
  totalSessions: number;
  successRate: number;

  // Charts
  revenueChart: TimelinePointDto[];
  activityChart: TimelinePointDto[];
  userGrowthChart: TimelinePointDto[];

  // Summary
  period: string;
  generatedAt: Date;
}
