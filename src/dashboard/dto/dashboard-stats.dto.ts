import { ApiProperty } from '@nestjs/swagger';

export class TimelinePointDto {
  @ApiProperty({ example: 'Apr 10' })
  label: string;

  @ApiProperty({ example: 12000 })
  value: number;
}

export class DashboardStatsDto {
  @ApiProperty({ example: 1250000 })
  totalRevenue: number;

  @ApiProperty({ example: 42 })
  activeUsers: number;

  @ApiProperty({ example: 120 })
  totalUsers: number;

  @ApiProperty({ example: 15 })
  todaySessions: number;

  @ApiProperty({ example: 320 })
  totalSessions: number;

  @ApiProperty({ example: 98 })
  successRate: number;

  @ApiProperty({ type: [TimelinePointDto] })
  revenueTimeline: TimelinePointDto[];

  @ApiProperty({ type: [TimelinePointDto] })
  activityTimeline: TimelinePointDto[];
}
