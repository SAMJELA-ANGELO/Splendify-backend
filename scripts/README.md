# Splendid Starlink Smoke Test

This script performs an end-to-end test of the Splendid Starlink platform, simulating the complete lifecycle from tenant creation to user activation.

## Prerequisites

1. Ensure the database is set up and migrated:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

2. Start the development server:
   ```bash
   npm run start:dev
   ```

3. In a separate terminal, run the smoke test:
   ```bash
   npm run smoke-test
   ```

## What the Test Does

1. **Admin Login**: Authenticates as admin user
2. **Create Tenant**: Creates a new ISP tenant
3. **Configure Billing**: Sets tenant to ESCROW payment mode
4. **Create Plan**: Creates an internet plan for the tenant
5. **Create User**: Creates a customer user under the tenant
6. **Initiate Payment**: Starts a payment for the user to buy the plan
7. **Trigger Webhook**: Manually simulates a successful payment webhook
8. **Verify Results**: Checks that escrow balance increased and user became active

## Expected Results

- ✅ All steps complete successfully
- ✅ Escrow balance increases by plan price minus 5% commission
- ✅ User status changes to active after successful payment

## Configuration

The test uses environment variables from `.env`:

- `ADMIN_EMAIL`: Admin login email (default: admin@splendify.com)
- `ADMIN_PASSWORD`: Admin password (default: admin123)
- `BASE_URL`: API base URL (default: http://localhost:3000)
- `ENCRYPTION_KEY`: Required for tenant secret encryption

## Troubleshooting

- **Server not running**: Ensure `npm run start:dev` is running
- **Database not ready**: Run migrations and seed first
- **Authentication fails**: Check admin credentials in seed and .env
- **Webhook fails**: Verify payment creation and webhook payload format

## Test Data

The script uses predefined test data for consistent results. Modify the constants in `scripts/smoke-test.ts` to change test parameters.