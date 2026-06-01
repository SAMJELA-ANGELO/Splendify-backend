import axios from 'axios';
import { config } from 'dotenv';

config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'splendid';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'To2dayPips';

const planTemplate = {
  name: 'Smoke Test Plan',
  price: 500,
  duration: 2,
};

const userPassword = 'Password123!';

function randomSuffix(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length);
}

async function smokeTest() {
  console.log('🚀 Starting Splendid Starlink Smoke Test...\n');

  let adminToken = '';
  let userToken = '';
  let tenantId = '';
  let planId = '';
  let userId = '';

  try {
    console.log('1️⃣  Fetch tenants');
    const tenantsResponse = await axios.get(`${BASE_URL}/tenants`);
    const tenants = tenantsResponse.data;
    if (!Array.isArray(tenants) || tenants.length === 0) {
      throw new Error('No tenants available');
    }
    tenantId = tenants[0].id;
    console.log(`✅ Found tenant: ${tenantId} (${tenants[0].name})`);

    console.log('\n2️⃣  Admin login');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });
    adminToken = loginResponse.data?.data?.access_token || loginResponse.data?.data?.token;
    if (!adminToken) {
      throw new Error('Admin login did not return a JWT token');
    }
    console.log('✅ Admin login successful');

    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      'x-tenant-id': tenantId,
    };

    console.log('\n4️⃣  Create plan');
    const planName = `smoke-plan-${randomSuffix()}`;
    const planResponse = await axios.post(
      `${BASE_URL}/plans`,
      { ...planTemplate, name: planName },
      { headers: adminHeaders },
    );
    planId = planResponse.data.id;
    console.log(`✅ Plan created: ${planId}`);

    console.log('\n5️⃣  Verify plans list');
    const plansResponse = await axios.get(`${BASE_URL}/plans`, {
      headers: { 'x-tenant-id': tenantId },
    });
    const plans = plansResponse.data;
    if (!Array.isArray(plans) || !plans.some((plan) => plan.id === planId)) {
      throw new Error('Created plan not found in plans list');
    }
    console.log('✅ Plans list returned and includes created plan');

    console.log('\n6️⃣  Register a new tenant user');
    const username = `smokeuser_${randomSuffix()}`;
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      tenantId,
      username,
      password: userPassword,
    });
    userToken = registerResponse.data?.data?.access_token || registerResponse.data?.data?.token;
    if (!userToken) {
      throw new Error('Registration did not return a JWT token');
    }
    userId = registerResponse.data?.data?.user?.userId;
    console.log(`✅ User registered: ${username} (${userId})`);

    const userHeaders = {
      Authorization: `Bearer ${userToken}`,
      'x-tenant-id': tenantId,
    };

    console.log('\n7️⃣  Fetch users for tenant');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: userHeaders,
    });
    const users = usersResponse.data;
    if (!Array.isArray(users) || !users.some((user) => user.username === username)) {
      throw new Error('Created user not found in tenant users list');
    }
    console.log('✅ User list returned and includes registered user');

    console.log('\n8️⃣  Fetch payment history for new user');
    const historyResponse = await axios.get(`${BASE_URL}/payments/history`, {
      headers: userHeaders,
    });
    console.log('✅ Payment history endpoint accessible');
    console.log(`   History items: ${Array.isArray(historyResponse.data?.data) ? historyResponse.data.data.length : 0}`);

    console.log('\n9️⃣  Tenant billing config check');
    const billingConfig = await axios.get(`${BASE_URL}/tenants/${tenantId}/billing-config`, {
      headers: adminHeaders,
    });
    console.log('✅ Billing config fetched');

    console.log('\n🎉 Smoke test passed! Backend routes, auth, tenant scoping, and admin flow are working.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Smoke test failed:');
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  smokeTest();
}

export { smokeTest };