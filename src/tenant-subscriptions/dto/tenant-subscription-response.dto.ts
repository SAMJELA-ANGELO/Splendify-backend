import { ApiProperty } from '@nestjs/swagger';

export class TenantSubscriptionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'tenant-123' })
  tenantId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  optionId: string;

  @ApiProperty({ example: 'Basic ISP Rental' })
  optionName: string;

  @ApiProperty({ example: 7500 })
  amount: number;

  @ApiProperty({ example: 'MONTHLY' })
  billingCycle: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2026-04-19T12:00:00Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-05-19T12:00:00Z' })
  expiresAt: Date;
}
