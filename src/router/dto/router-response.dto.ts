import { ApiProperty } from '@nestjs/swagger';

export class RouterResponseDto {
  @ApiProperty({ example: 'router-123' })
  id: string;

  @ApiProperty({ example: 'Main Office Router' })
  name: string;

  @ApiProperty({ example: '192.168.88.1', description: 'Local LAN IP address' })
  localIpAddress: string;

  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ example: 'XenFi-MainOffice', required: false, description: 'MikroTik identity/system name' })
  identity?: string;

  @ApiProperty({ example: 'Bamenda Central', required: false, description: 'Physical location' })
  location?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  updatedAt: Date;
}
