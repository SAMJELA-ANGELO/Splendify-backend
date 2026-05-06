import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiProperty({
    description: 'Business/legal name',
    example: 'Updated Legal Name',
    required: false,
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({
    description: 'Business is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
