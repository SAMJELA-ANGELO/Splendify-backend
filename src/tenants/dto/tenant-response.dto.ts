import { ApiProperty } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty({ example: 'tenant-123' })
  id: string;

  @ApiProperty({ example: 'splendidstarlink.com' })
  domain: string;

  @ApiProperty({ example: 'app' })
  subdomain: string;

  @ApiProperty({ example: 'Splendid Starlink' })
  name: string;

  @ApiProperty({ example: 'admin@splendidstarlink.com' })
  email: string;

  @ApiProperty({ example: '+234701234567', required: false })
  phone?: string;

  @ApiProperty({ example: 'Splendid Starlink Limited', required: false })
  businessName?: string;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  logoUrl?: string;

  @ApiProperty({ example: '123 Tech Street, Yaounde', required: false })
  address?: string;

  @ApiProperty({ example: '192.168.88.1', required: false })
  mikrotikHost?: string;

  @ApiProperty({ example: 8728, required: false })
  mikrotikPort?: number;

  @ApiProperty({ example: 'admin', required: false })
  mikrotikUsername?: string;

  @ApiProperty({ example: 'MainOfficeRouter', required: false })
  mikrotikIdentity?: string;

  @ApiProperty({ example: false, required: false })
  mikrotikUseSsl?: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-18T15:45:00Z' })
  updatedAt: Date;
}
