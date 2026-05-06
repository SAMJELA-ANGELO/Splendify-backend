import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default tenant if it doesn't exist
  let defaultTenant = await prisma.tenant.findFirst({
    where: { name: 'Default ISP' },
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Default ISP',
        email: 'admin@splendidstarlink.com',
        businessName: 'Splendid Starlink',
        isActive: true,
      },
    });
  }

  console.log(`✅ Tenant created: ${defaultTenant.name}`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: defaultTenant.id,
        username: 'admin',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      username: 'admin',
      email: 'admin@splendify.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Admin user created: ${adminUser.username}`);

  // Create default plans
  const plans = [
    {
      name: '100 CFA - 2 hours',
      price: '100',
      duration: 2,
    },
    {
      name: '500 CFA - 24 hours',
      price: '500',
      duration: 24,
    },
    {
      name: '1000 CFA - 7 days',
      price: '1000',
      duration: 168,
    },
  ];

  for (const planData of plans) {
    const plan = await prisma.plan.upsert({
      where: {
        tenantId_name: {
          tenantId: defaultTenant.id,
          name: planData.name,
        },
      },
      update: {},
      create: {
        ...planData,
        price: parseFloat(planData.price),
        tenantId: defaultTenant.id,
      },
    });
    console.log(`✅ Plan created: ${plan.name}`);
  }

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
