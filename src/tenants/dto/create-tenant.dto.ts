import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Tenant domain name',
    example: 'splendidstarlink.com',
  })
  @IsString()
  domain: string;

  @ApiProperty({
    description: 'Tenant subdomain',
    example: 'app',
  })
  @IsString()
  subdomain: string;

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
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Tech Street, Yaounde',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'MikroTik Router API host or IP address',
    example: '192.168.88.1',
    required: false,
  })
  @IsOptional()
  @IsString()
  mikrotikHost?: string;

  @ApiProperty({
    description: 'MikroTik Router API port',
    example: 8728,
    required: false,
  })
  @IsOptional()
  @IsInt()
  mikrotikPort?: number;

  @ApiProperty({
    description: 'MikroTik Router API username',
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  mikrotikUsername?: string;

  @ApiProperty({
    description: 'MikroTik Router API password',
    example: 's3cretP@ss',
    required: false,
    writeOnly: true,
  })
  @IsOptional()
  @IsString()
  mikrotikPassword?: string;

  @ApiProperty({
    description: 'MikroTik router identity/label',
    example: 'MainOfficeRouter',
    required: false,
  })
  @IsOptional()
  @IsString()
  mikrotikIdentity?: string;

  @ApiProperty({
    description: 'Use TLS/SSL when connecting to MikroTik RouterOS API',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  mikrotikUseSsl?: boolean;

  @ApiProperty({
    description: 'Business is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
