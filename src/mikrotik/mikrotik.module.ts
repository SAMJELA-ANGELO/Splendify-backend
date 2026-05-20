import { Module } from '@nestjs/common';
import { MikrotikService } from './mikrotik.service';
import { MikrotikController } from './mikrotik.controller';
import { RouterModule } from '../router/router.module';
import { RadiusModule } from '../radius/radius.module';

@Module({
  imports: [RouterModule, RadiusModule],
  providers: [MikrotikService],
  controllers: [MikrotikController],
  exports: [MikrotikService, RouterModule],
})
export class MikrotikModule {}
