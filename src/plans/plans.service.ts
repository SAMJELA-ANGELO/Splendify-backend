import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Plan as PrismaPlan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<PrismaPlan[]> {
    this.logger.log(`📋 Fetching all plans (Tenant: ${tenantId})`);
    const plans = await this.prisma.plan.findMany({
      where: { tenantId },
    });
    this.logger.log(`✅ Retrieved ${plans.length} plans`);
    return plans;
  }

  async findById(tenantId: string, id: string): Promise<PrismaPlan | null> {
    this.logger.log(`🔍 Fetching plan: ${id} (Tenant: ${tenantId})`);
    const plan = await this.prisma.plan.findFirst({
      where: { id, tenantId },
    });
    if (plan) {
      this.logger.log(`✅ Plan found: ${plan.name}`);
    } else {
      this.logger.warn(`⚠️ Plan not found: ${id}`);
    }
    return plan;
  }

  async create(
    tenantId: string,
    planData: {
      name: string;
      price: number;
      duration: number;
    },
  ): Promise<PrismaPlan> {
    this.logger.log(
      `➕ Creating new plan: ${planData.name} (${planData.price} XAF, ${planData.duration}h) (Tenant: ${tenantId})`,
    );
    const savedPlan = await this.prisma.plan.create({
      data: {
        tenantId,
        ...planData,
      },
    });
    this.logger.log(`✅ Plan created: ${savedPlan.name} (ID: ${savedPlan.id})`);
    return savedPlan;
  }

  async update(
    tenantId: string,
    id: string,
    updateData: Partial<{
      name: string;
      price: number;
      duration: number;
    }>,
  ): Promise<PrismaPlan | null> {
    this.logger.log(
      `✏️ Updating plan ${id} with: ${JSON.stringify(updateData)} (Tenant: ${tenantId})`,
    );
    const existingPlan = await this.prisma.plan.findFirst({
      where: { id, tenantId },
    });

    if (!existingPlan) {
      this.logger.error(`❌ Failed to update plan: ${id}`);
      return null;
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: updateData,
    });
    this.logger.log(`✅ Plan updated: ${updatedPlan.name}`);
    return updatedPlan;
  }

  async delete(tenantId: string, id: string): Promise<PrismaPlan | null> {
    this.logger.log(`🗑️ Deleting plan: ${id} (Tenant: ${tenantId})`);
    const existingPlan = await this.prisma.plan.findFirst({
      where: { id, tenantId },
    });

    if (!existingPlan) {
      this.logger.error(`❌ Failed to delete plan: ${id}`);
      return null;
    }

    const deleted = await this.prisma.plan.delete({
      where: { id },
    });
    this.logger.log(`✅ Plan deleted: ${deleted.name}`);
    return deleted;
  }
}
