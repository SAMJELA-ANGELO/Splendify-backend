import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret } from '../common/encryption.util';
import { CreateRouterDto, UpdateRouterDto } from './dto';

@Injectable()
export class RouterService {
  private readonly logger = new Logger(RouterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createRouterDto: CreateRouterDto) {
    // Encrypt sensitive fields
    const dataToSave: any = {
      tenantId,
      ...createRouterDto,
      password: encryptSecret(createRouterDto.password),
    };

    if (createRouterDto.radiusSecret) {
      dataToSave.radiusSecret = encryptSecret(createRouterDto.radiusSecret);
    }

    this.logger.log(`Creating router for tenant ${tenantId}: ${createRouterDto.name}`);

    return this.prisma.router.create({
      data: dataToSave,
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

    const dataToUpdate: any = { ...updateRouterDto };

    // Encrypt sensitive fields if they're being updated
    if (updateRouterDto.password) {
      dataToUpdate.password = encryptSecret(updateRouterDto.password);
    }

    if (updateRouterDto.radiusSecret) {
      dataToUpdate.radiusSecret = encryptSecret(updateRouterDto.radiusSecret);
    }

    this.logger.log(`Updating router ${id} for tenant ${tenantId}`);

    return this.prisma.router.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    this.logger.log(`Deleting router ${id} for tenant ${tenantId}`);
    return this.prisma.router.delete({
      where: { id },
    });
  }
}
