import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'john_doe', description: 'Username' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address (optional; used for email login)',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    example: 'cmpecfoi80000nztolg9vpt8k',
    description: 'Tenant ID to register under (get from GET /tenants)',
  })
  @IsString()
  @MinLength(15)
  tenantId: string;

  @ApiProperty({
    example: 'AA:BB:CC:DD:EE:FF',
    description: 'Device MAC address (from WiFi redirect)',
    required: false,
  })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiProperty({
    example: '192.168.1.100',
    description: 'Device IP address (from WiFi redirect)',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    example: 'Home',
    description: 'Router identity (from WiFi redirect)',
    required: false,
  })
  @IsOptional()
  @IsString()
  routerIdentity?: string;
}
