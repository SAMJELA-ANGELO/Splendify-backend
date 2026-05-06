import {
  IsString,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Tenant display name',
    example: 'Splendid Starlink',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tenant contact email',
    example: 'admin@splendidstarlink.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Tenant phone number',
    example: '+234701234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Business/legal name',
    example: 'Splendid Starlink Limited',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Main Street, Bamenda',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({
    description: 'Brand colors (JSON)',
    example: '{"primary": "#007bff", "secondary": "#6c757d"}',
    required: false,
  })
  @IsOptional()
  brandColors?: any;
}