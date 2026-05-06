import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail } from 'class-validator';

export class TenantSignupDto {
  @ApiProperty({ example: 'john_doe', description: 'Username for the tenant admin' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'password123', description: 'Password for the tenant admin' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'admin@ispcompany.com',
    description: 'Email address for the tenant admin',
  })
  @IsEmail()
  email: string;
}