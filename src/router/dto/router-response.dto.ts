import { ApiProperty } from '@nestjs/swagger';

export class RouterResponseDto {
  @ApiProperty({ example: 'router-123' })
  id: string;

  @ApiProperty({ example: 'Main Office Router' })
  name: string;

  @ApiProperty({ example: '192.168.88.1' })
  ipAddress: string;

  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ example: 'MainOfficeRouter', required: false })
  identity?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  updatedAt: Date;
}
