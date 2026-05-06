import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test data
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const TENANT_DATA = {
  name: 'Test ISP Cameroon',
  email: 'test@isp.com',
  phone: '+237812345678',
  businessName: 'Test Internet Services',
  paymentModel: 'ESCROW',
};

const PLAN_DATA = {
  name: 'Basic Internet Plan',
  price: 5000,
  duration: 30, // 30 hours
  dataLimit: 100 * 1024 * 1024 * 1024, // 100GB in bytes
  downloadLimit: 10 * 1024 * 1024, // 10Mbps
  uploadLimit: 5 * 1024 * 1024, // 5Mbps
};

const USER_DATA = {
  username: 'testuser',
  email: 'user@test.com',
  password: 'password123',
};

const PAYMENT_DATA = {
  phone: '+237812345678',
  planId: '', // Will be set after plan creation
  userId: '', // Will be set after user creation
};

async function smokeTest() {
  console.log('🚀 Starting Splendid Starlink Smoke Test...\n');

  let token = '';
  let tenantId = '';
  let planId = '';
  let userId = '';
  let paymentId = '';

  try {
    // Step 0: Get default tenant for context
    console.log('0️⃣ Fetching default tenant...');
    // First, get a temporary token or use the default tenant directly
    // For now, we'll assume the default tenant ID from seeding
    const defaultTenantResponse = await axios.get(`${BASE_URL}/tenants?limit=1`);
    const defaultTenant = defaultTenantResponse.data[0];
    if (!defaultTenant) {
      throw new Error('No default tenant found. Run: npm run prisma:seed');
    }
    const defaultTenantId = defaultTenant.id;
    console.log(`✅ Default tenant found: ${defaultTenantId}\n`);

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });
    token = loginResponse.data.access_token;
    console.log('✅ Admin login successful\n');

    // Set authorization header for subsequent requests
    const baseHeaders = { Authorization: `Bearer ${token}` };
    
    // Headers with tenant context (for tenant-scoped operations)
    const getTenantHeaders = (tid: string) => ({
      ...baseHeaders,
      'x-tenant-id': tid,
    });

    // Step 2: Create tenant
    console.log('2️⃣ Creating tenant...');
    const tenantResponse = await axios.post(`${BASE_URL}/tenants`, TENANT_DATA, { headers: baseHeaders });
    tenantId = tenantResponse.data.id;
    console.log(`✅ Tenant created: ${tenantId}\n`);

    // Step 3: Update tenant billing config to ESCROW (already set, but confirm)
    console.log('3️⃣ Updating tenant billing config to ESCROW...');
    await axios.put(`${BASE_URL}/tenants/${tenantId}/billing-config`, {
      paymentModel: 'ESCROW',
      payoutMobileMoney: '+237812345678',
      payoutMinimumThreshold: 10000,
    }, { headers: getTenantHeaders(tenantId) });
    console.log('✅ Billing config updated to ESCROW\n');

    console.log('🔍 Debug: admin token length:', token?.length);
    console.log('🔍 Debug: plan creation headers:', getTenantHeaders(tenantId));

    // Step 4: Create plan for tenant
    console.log('4️⃣ Creating plan for tenant...');
    const planResponse = await axios.post(`${BASE_URL}/plans`, PLAN_DATA, { headers: getTenantHeaders(tenantId) });
    planId = planResponse.data.id;
    console.log(`✅ Plan created: ${planId}\n`);

    // Step 5: Create user under tenant
    console.log('5️⃣ Creating user under tenant...');
    const userResponse = await axios.post(`${BASE_URL}/users/signup`, {
      tenantId,
      username: USER_DATA.username,
      password: USER_DATA.password,
    }, { headers: getTenantHeaders(tenantId) });
    userId = userResponse.data.user.id;
    console.log(`✅ User created: ${userId}\n`);

    // Step 6: Initiate payment for user to buy plan
    console.log('6️⃣ Initiating payment...');
    PAYMENT_DATA.planId = planId;
    PAYMENT_DATA.userId = userId;
    const paymentResponse = await axios.post(`${BASE_URL}/payments/initiate`, PAYMENT_DATA, { headers: getTenantHeaders(tenantId) });
    paymentId = paymentResponse.data.paymentId;
    console.log(`✅ Payment initiated: ${paymentId}\n`);

    // Step 7: Manually trigger webhook (simulate successful payment)
    console.log('7️⃣ Manually triggering webhook for successful payment...');
    const webhookPayload = {
      transId: paymentResponse.data.transId,
      status: 'SUCCESSFUL',
      amount: PLAN_DATA.price,
      phone: PAYMENT_DATA.phone,
      externalId: paymentId,
    };
    await axios.post(`${BASE_URL}/payments/webhook`, webhookPayload);
    console.log('✅ Webhook triggered\n');

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 8: Check escrow balance increased
    console.log('8️⃣ Checking escrow balance...');
    const balanceResponse = await axios.get(`${BASE_URL}/tenants/${tenantId}/escrow-balance`, { headers: getTenantHeaders(tenantId) });
    const balance = balanceResponse.data.balance;
    const expectedBalance = PLAN_DATA.price * 0.95; // 5% commission
    if (balance >= expectedBalance) {
      console.log(`✅ Escrow balance increased: ${balance} XAF (expected: ${expectedBalance} XAF)\n`);
    } else {
      throw new Error(`❌ Escrow balance not increased. Current: ${balance}, Expected: ${expectedBalance}`);
    }

    // Step 9: Verify payment status shows SUCCESSFUL
    console.log('9️⃣ Checking payment status...');
    const paymentStatusResponse = await axios.get(`${BASE_URL}/payments/status/${paymentResponse.data.transId}`, { headers: getTenantHeaders(tenantId) });
    const paymentStatus = paymentStatusResponse.data.status;
    if (paymentStatus === 'SUCCESSFUL') {
      console.log('✅ Payment status is SUCCESSFUL\n');
    } else {
      throw new Error(`❌ Payment status is not SUCCESSFUL: ${paymentStatus}`);
    }

    console.log('🎉 Smoke test completed successfully! All checks passed.');

  } catch (error: any) {
    console.error('❌ Smoke test failed:', error.response?.data || error.response || error.message || error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  smokeTest();
}

export { smokeTest };