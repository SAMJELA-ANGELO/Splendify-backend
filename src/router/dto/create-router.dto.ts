import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouterDto {
  @ApiProperty({ example: 'Main Office Router' })
  @IsString()
  name: string;

  @ApiProperty({ example: '192.168.88.1', description: 'Local LAN IP address' })
  @IsString()
  localIpAddress: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', writeOnly: true, description: 'Router admin password (will be encrypted)' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'XenFi-MainOffice', required: false, description: 'MikroTik identity/system name' })
  @IsOptional()
  @IsString()
  identity?: string;

  @ApiProperty({ example: 'your-secure-shared-secret', required: false, description: 'RADIUS shared secret (will be encrypted)' })
  @IsOptional()
  @IsString()
  radiusSecret?: string;

  @ApiProperty({ example: 'Bamenda Central', required: false, description: 'Physical location of the router' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
