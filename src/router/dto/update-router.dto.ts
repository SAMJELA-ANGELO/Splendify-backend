import { PartialType } from '@nestjs/swagger';
import { CreateRouterDto } from './create-router.dto';

export class UpdateRouterDto extends PartialType(CreateRouterDto) {}
