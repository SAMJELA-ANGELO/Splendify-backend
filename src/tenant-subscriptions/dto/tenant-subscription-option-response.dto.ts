import { ApiProperty } from '@nestjs/swagger';

export class TenantSubscriptionOptionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Basic ISP Rental' })
  name: string;

  @ApiProperty({ example: 7500 })
  price: number;

  @ApiProperty({ example: 'MONTHLY' })
  billingCycle: string;

  @ApiProperty({
    example: 'Tenant rental plan for platform access',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}
