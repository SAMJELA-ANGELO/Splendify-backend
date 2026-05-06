import { Controller, Get, Logger } from '@nestjs/common';
import { RadiusService } from './radius.service';
import { RadiusStatusDto } from './dto/radius-status.dto';

@Controller('radius')
export class RadiusController {
  private readonly logger = new Logger(RadiusController.name);

  constructor(private readonly radiusService: RadiusService) {}

  @Get('status')
  getStatus(): RadiusStatusDto {
    return this.radiusService.getStatus();
  }
}