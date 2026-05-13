import { Module } from '@nestjs/common';
import { MockRouterService } from './mock-router.service';
import { RouterController } from './router.controller';
import { RouterService } from './router.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MikrotikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [PrismaModule, MikrotikModule],
  providers: [
    {
      provide: 'RouterProvider',
      useClass: MockRouterService,
    },
    RouterService,
  ],
  controllers: [RouterController],
  exports: ['RouterProvider'],
})
export class RouterModule {}
