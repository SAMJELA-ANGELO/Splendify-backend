import { ApiProperty } from '@nestjs/swagger';

export class GetSessionStatusResponseDto {
  @ApiProperty({
    description: 'Whether the session is currently active',
    example: true,
    type: 'boolean',
  })
  isActive: boolean;

  @ApiProperty({
    description:
      'Remaining time in the session (in seconds). Only present if session is active.',
    example: 86400,
    type: 'number',
    nullable: true,
  })
  remainingTime?: number;

  @ApiProperty({
    description: 'Session ID if active (for CoA or session management)',
    example: 'clp7h8k9m0n1o2p3q4r5s6t7u8',
    type: 'string',
    nullable: true,
  })
  sessionId?: string;
}
