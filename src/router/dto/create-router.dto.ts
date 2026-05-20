import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouterDto {
  @ApiProperty({ example: 'Main Office Router' })
  @IsString()
  name: string;

  @ApiProperty({ example: '192.168.88.1' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ example: '192.168.88.1' })
  @IsString()
  localIpAddress: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', writeOnly: true })
  @IsString()
  password: string;

  @ApiProperty({ example: 'MainOfficeRouter', required: false })
  @IsOptional()
  @IsString()
  identity?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
