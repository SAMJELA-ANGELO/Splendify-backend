import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, IsEmail } from 'class-validator';

export class SubscribeTenantDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Tenant rental option ID',
  })
  @IsString()
  optionId: string;

  @ApiProperty({
    example: '237691234567',
    description: 'Contact phone number for subscription payment',
  })
  @IsString()
  @Matches(/^6[0-9]{8}$/, {
    message:
      'Phone number must be a valid Cameroon mobile number starting with 6',
  })
  phone: string;

  @ApiProperty({ example: 'billing@tenant.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'EXT-RENT-001', required: false })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ example: 'ABC Telecom', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '192.168.0.100', required: false })
  @IsOptional()
  @IsString()
  userIp?: string;
}
