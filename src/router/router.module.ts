import { Module } from '@nestjs/common';
import { MockRouterService } from './mock-router.service';
import { RouterController } from './router.controller';
import { RouterService } from './router.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RadiusRouterService } from './radius-router.service';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'RouterProvider',
      useClass: RadiusRouterService,
    },
    RouterService,
    RadiusRouterService,
  ],
  controllers: [RouterController],
  exports: ['RouterProvider'],
})
export class RouterModule {}
