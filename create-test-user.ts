import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  console.log('🧪 Creating test user with active plan...');

  // Get the default tenant
  const tenant = await prisma.tenant.findFirst({
    where: { name: 'Default ISP' },
  });

  if (!tenant) {
    throw new Error('Default tenant not found. Run seed first.');
  }

  // Get the 2-hour plan
  const plan = await prisma.plan.findFirst({
    where: {
      tenantId: tenant.id,
      name: '100 CFA - 2 hours',
    },
  });

  if (!plan) {
    throw new Error('2-hour plan not found. Run seed first.');
  }

  // Create test user with active plan
  const hashedPassword = await bcrypt.hash('test123', 10);
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + plan.duration); // 2 hours from now

  const testUser = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: 'testuser',
      },
    },
    update: {
      password: hashedPassword,
      planId: plan.id,
      isActive: true,
      sessionExpiry: expiry,
      mikrotikCreated: true,
    },
    create: {
      tenantId: tenant.id,
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      planId: plan.id,
      isActive: true,
      sessionExpiry: expiry,
      mikrotikCreated: true,
    },
  });

  console.log(`✅ Test user created: ${testUser.username}`);
  console.log(`   Password: test123`);
  console.log(`   Plan: ${plan.name}`);
  console.log(`   Expires: ${expiry.toISOString()}`);
  console.log(`   Active: ${testUser.isActive}`);

  // Create a successful payment record
  const planPrice = Number(plan.price);
  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      userId: testUser.id,
      planId: plan.id,
      amount: planPrice,
      grossAmount: planPrice + (planPrice * 0.04), // with fees
      status: 'SUCCESSFUL',
      fapshiTransactionId: 'TEST-' + Date.now(),
      fapshiResponse: { test: true },
      paymentModel: 'ESCROW',
    },
  });

  console.log(`✅ Test payment created: ${payment.fapshiTransactionId}`);

  console.log('\n🎉 Test user ready for testing!');
  console.log('Login credentials:');
  console.log('  Username: testuser');
  console.log('  Password: test123');
  console.log(`  Expires at: ${expiry.toISOString()}`);
}

createTestUser()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });