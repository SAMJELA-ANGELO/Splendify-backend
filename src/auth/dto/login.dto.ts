import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john_doe',
    description: 'Username or email address',
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    example: 'tenant-123',
    description: 'Tenant ID to use for tenant-scoped login',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: false,
    description: 'Whether login is from WiFi captive portal',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  fromWifi?: boolean;

  @ApiProperty({
    example: 'AA:BB:CC:DD:EE:FF',
    description: 'Device MAC address if from WiFi',
    required: false,
  })
  @IsOptional()
  @IsString()
  macAddress?: string;
}
