import { ApiProperty } from '@nestjs/swagger';

export class GetSessionResponseDto {
  @ApiProperty({
    description: 'Unique session identifier (RADIUS Session ID)',
    example: 'clp7h8k9m0n1o2p3q4r5s6t7u8',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID that owns this session',
    example: 'clp1a2b3c4d5e6f7g8h9i0j1k2',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User ID associated with this session',
    example: 'clp2x3y4z5a6b7c8d9e0f1g2h3',
  })
  userId: string;

  @ApiProperty({
    description: 'Router ID managing this session (optional)',
    example: 'clp3m4n5o6p7q8r9s0t1u2v3w4',
    nullable: true,
  })
  routerId?: string;

  @ApiProperty({
    description: 'Session start timestamp',
    example: '2026-03-27T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  startTime: Date;

  @ApiProperty({
    description: 'Session end timestamp (if session is closed)',
    example: null,
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  endTime?: Date;

  @ApiProperty({
    description:
      'Total data uploaded and downloaded during the session in bytes',
    example: 1048576000,
    type: 'number',
  })
  dataUsed: number;

  @ApiProperty({
    description:
      'Data downloaded during the session in bytes (RADIUS Acct-Input-Octets)',
    example: 524288000,
    type: 'number',
  })
  dataUsedDownload: number;

  @ApiProperty({
    description:
      'Data uploaded during the session in bytes (RADIUS Acct-Output-Octets)',
    example: 524288000,
    type: 'number',
  })
  dataUsedUpload: number;

  @ApiProperty({
    description: 'Whether the session is currently active',
    example: true,
    type: 'boolean',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Remaining time in the session (in seconds)',
    example: 86400,
    type: 'number',
  })
  remainingTime: number;

  @ApiProperty({
    description: 'Session timeout duration from plan (in seconds)',
    example: 86400,
    nullable: true,
    type: 'number',
  })
  sessionTimeout?: number;

  @ApiProperty({
    description: 'MAC address of the connecting device',
    example: '00:11:22:33:44:55',
    nullable: true,
  })
  macAddress?: string;

  @ApiProperty({
    description: 'IP address assigned to the session',
    example: '192.168.1.100',
    nullable: true,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'RADIUS NAS Identifier (Network Access Server)',
    example: 'mikrotik-gateway-01',
    nullable: true,
  })
  nasIdentifier?: string;

  @ApiProperty({
    description: 'RADIUS NAS IP address',
    example: '192.168.1.1',
    nullable: true,
  })
  nasIpAddress?: string;

  @ApiProperty({
    description: 'RADIUS Framed IP Address',
    example: '192.168.1.100',
    nullable: true,
  })
  framedIpAddress?: string;

  @ApiProperty({
    description: 'RADIUS Calling Station ID (usually MAC address)',
    example: '00:11:22:33:44:55',
    nullable: true,
  })
  callingStationId?: string;

  @ApiProperty({
    description: 'RADIUS Called Station ID (AP/Gateway MAC)',
    example: 'AA:BB:CC:DD:EE:FF',
    nullable: true,
  })
  calledStationId?: string;

  @ApiProperty({
    description: 'RADIUS Accounting Session ID (unique per session)',
    example: '4d2208498e6a6c41',
    nullable: true,
  })
  acctSessionId?: string;

  @ApiProperty({
    description: 'RADIUS Accounting Termination Cause',
    example: 'User-Request',
    nullable: true,
  })
  acctTerminateCause?: string;

  @ApiProperty({
    description: 'Elapsed time since session start in seconds',
    example: 3600,
    type: 'number',
  })
  elapsedTime?: number;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2026-03-27T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
}
