# Prisma ORM Integration Guide

## ✅ Setup Complete

Your Splendidly Starlink backend has been successfully integrated with **Prisma ORM** and configured for **Supabase PostgreSQL**.

---

## 📋 What Was Configured

### 1. **Prisma Schema** (`prisma/schema.prisma`)
Complete multi-tenant data model with:
- **Tenant Management**: Support for multiple ISPs with white-labeling
- **User Management**: Role-based access control (user, admin, agent)
- **Plans & Billing**: Plans linked to tenants with pricing
- **Payments**: Fapshi integration tracking with tenant isolation
- **Router Management**: MikroTik router configurations per tenant
- **Sessions**: Connection tracking with start/end times
- **Activities**: Full audit logging per tenant

### 2. **Prisma Config** (`prisma.config.ts`)
- Configured for PostgreSQL
- Supabase connection pooling support
- Direct URL for migrations

### 3. **Environment Configuration** (`.env` and `.env.local`)
- `DATABASE_URL`: Supabase pooled connection
- `DIRECT_URL`: Supabase direct connection for migrations
- Application secrets and service credentials

---

## 🚀 Next Steps

### Step 1: Update `.env` File
Replace placeholders in your `.env` file:

```bash
# Get your Supabase credentials from:
# https://app.supabase.com/project/[PROJECT-ID]/settings/database

DATABASE_URL="postgresql://postgres.[PROJECT-ID]:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-ID]:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

# Update other credentials as needed
JWT_SECRET=your-production-secret
FAPSHI_APIUSER=your-fapshi-username
FAPSHI_APIKEY=your-fapshi-api-key
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Run Migrations
First migration creates all tables:
```bash
npx prisma migrate deploy --name "init"
```

Or if deploying for the first time:
```bash
npx prisma db push
```

### Step 4: Seed Initial Data (Optional)
```bash
npx prisma db seed
```

---

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Multi-Tenant |
|-------|---------|--------------|
| `Tenant` | ISP/Business entities | Root |
| `User` | End users + admins | Per-tenant |
| `Plan` | Service packages | Per-tenant |
| `Payment` | Transaction records | Per-tenant |
| `Router` | MikroTik devices | Per-tenant |
| `Session` | WiFi connections | Per-tenant |
| `Activity` | Audit log | Per-tenant |

### Key Relationships
```
Tenant (1) ──→ (Many) Users
       ├──→ Plans
       ├──→ Payments
       ├──→ Routers
       ├──→ Sessions
       └──→ Activities
```

---

## 🔗 Connection Details

### Supabase Setup
1. Create Supabase project at https://supabase.com
2. Go to **Settings > Database**
3. Copy connection string for **Connection Pooler**
4. Copy direct connection URL for **Migrations**
5. Update `.env` file with both URLs

### Connection Pooling
- **Pooler URL** (for app): Uses pgBouncer for connection pooling
- **Direct URL** (for migrations): Direct database connection
- **Port difference**:
  - Pooler: `6543`
  - Direct: `5432`

---

## 🔧 Common Commands

### Development Workflow
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create new migration
npx prisma migrate dev --name "description"

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View database in Studio
npx prisma studio
```

### Production Deployment
```bash
# Generate client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
```

---

## 🏗️ Upcoming: NestJS Integration

Once Prisma is working, you'll need to:

1. **Install NestJS Prisma**:
   ```bash
   npm install @prisma/client
   npm install prisma-nestjs-graphql --save-dev
   ```

2. **Create PrismaService**:
   ```typescript
   // src/prisma/prisma.service.ts
   import { PrismaClient } from '@prisma/client';
   
   export class PrismaService extends PrismaClient {}
   ```

3. **Update AppModule**:
   ```typescript
   // Import PrismaService in app.module.ts
   import { PrismaService } from './prisma/prisma.service';
   
   @Module({
     providers: [PrismaService],
     exports: [PrismaService],
   })
   ```

4. **Replace MongoDB Services**:
   - Migrate UsersService from Mongoose to Prisma
   - Migrate PlansService from Mongoose to Prisma
   - Migrate PaymentsService from Mongoose to Prisma
   - etc.

---

## ⚠️ Important Notes

1. **Keep Mongoose for now**: Your app still uses Mongoose. Phase in Prisma services gradually.

2. **Database Migration**: You can run both MongoDB and PostgreSQL in parallel during transition.

3. **Prisma Studio**: View and edit data visually:
   ```bash
   npx prisma studio
   ```

4. **Reset Carefully**: `npx prisma migrate reset` deletes all data.

---

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase PostgreSQL Guide](https://supabase.com/docs/guides/database)
- [Prisma with NestJS](https://docs.nestjs.com/recipes/prisma)
- [Connection Pooling](https://www.prisma.io/docs/orm/overview/databases/connection-urls#connection-pooling)

---

## ✨ Next Phase

After Prisma is fully set up:
1. Migrate services to Prisma one by one
2. Run tests to ensure compatibility
3. Deprecate Mongoose gradually
4. Full PostgreSQL + Prisma production setup

---

**Status**: ✅ Prisma installed and configured. Ready for migrations!
