import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouterDto, UpdateRouterDto } from './dto';

@Injectable()
export class RouterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createRouterDto: CreateRouterDto) {
    return this.prisma.router.create({
      data: {
        tenantId,
        ...createRouterDto,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.router.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const router = await this.prisma.router.findFirst({
      where: { id, tenantId },
    });
    if (!router) {
      throw new NotFoundException(`Router ${id} not found`);
    }
    return router;
  }

  async update(tenantId: string, id: string, updateRouterDto: UpdateRouterDto) {
    await this.findOne(tenantId, id);
    return this.prisma.router.update({
      where: { id },
      data: updateRouterDto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.router.delete({
      where: { id },
    });
  }
}
