import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateTenantSubscriptionOptionDto {
  @ApiProperty({ example: 'Basic ISP Rental' })
  @IsString()
  name: string;

  @ApiProperty({ example: 7500 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'MONTHLY', required: false })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiProperty({
    example: 'Basic monthly rental for small ISP',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isActive?: boolean;
}
