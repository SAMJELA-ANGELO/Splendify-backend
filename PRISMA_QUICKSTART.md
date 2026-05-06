# ✅ Prisma ORM Setup - Quick Start Guide

## Status: COMPLETE ✨

Your project is now configured with **Prisma 7** and ready to work with **Supabase PostgreSQL**.

---

## 🚀 What's Been Done

✅ **Prisma Installed**: v7.7.0  
✅ **Supabase Configuration**: `.env` configured with pooled + direct connections  
✅ **Schema Created**: Multi-tenant data model with all entities  
✅ **Prisma Client Generated**: TypeScript types ready  
✅ **NPM Scripts Added**: Ready for migrations and seeding  

---

## 📋 Your Next Steps

### 1. **Update `.env` with your Supabase credentials**

Get your Supabase database URLs from: https://app.supabase.com/project/[YOUR-PROJECT]/settings/database

```bash
# Replace [YOUR-PASSWORD] and [YOUR-PROJECT-ID]
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-ID]:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-ID]:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

### 2. **Run Migrations to Create Tables**

```bash
# Create initial migration and apply to database
npm run prisma:push
```

Or if you prefer manual migrations:
```bash
npm run prisma:migrate
```

### 3. **(Optional) Seed Initial Data**

```bash
npm run prisma:seed
```

This creates:
- Default tenant "Default ISP"
- 3 sample plans (100 CFA, 500 CFA, 1000 CFA)

---

## 📁 Project Structure

```
splendid-starlink/
├── prisma/
│   ├── schema.prisma          ← Database models
│   ├── seed.ts                 ← Initial data
│   └── migrations/             ← Auto-generated migration files
├── generated/
│   └── prisma/                 ← Auto-generated Prisma client
├── .env                        ← Database URLs (keep secret!)
├── .env.local                  ← Local overrides
├── prisma.config.ts            ← Prisma configuration
└── PRISMA_SETUP.md             ← Detailed documentation
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `Tenant` | ISP/Business accounts |
| `User` | End users + admins + agents |
| `Plan` | Service packages |
| `Payment` | Transaction records |
| `Router` | MikroTik/networking hardware |
| `Session` | WiFi connection sessions |
| `Activity` | Audit trail |

### Key Features

- **Multi-Tenant Isolation**: All data scoped by `tenantId`
- **Relationships**: Cascading deletes, foreign keys
- **Indexes**: Optimized queries on common fields
- **Timestamps**: `createdAt`/`updatedAt` tracking

---

## 🛠️ Available Commands

### Development
```bash
npm run prisma:generate    # Regenerate Prisma client (after schema changes)
npm run prisma:studio      # Open visual database editor
npm run prisma:migrate dev  # Create & apply migrations interactively
npm run prisma:reset       # ⚠️ DELETE ALL DATA and reset schema
```

### Production
```bash
npm run prisma:push        # Apply schema directly (no migration files)
npm run prisma:migrate:deploy  # Apply existing migrations
npm run prisma:seed        # Populate sample data
```

---

## 🔗 Connection Strings Explained

### Pooler URL (for App)
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
- Uses **PgBouncer** for connection pooling
- Port: **6543**
- Use for: Application connections that need pooling

### Direct URL (for Migrations)
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```
- Direct connection without pooling
- Port: **5432**
- Use for: Migrations, schema changes

---

## 📝 Using Prisma in Code

### Import Prisma Client
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
```

### Example Queries
```typescript
// Create tenant
const tenant = await prisma.tenant.create({
  data: {
    name: 'MyISP',
    email: 'admin@myisp.com',
  },
});

// Find users by tenant
const users = await prisma.user.findMany({
  where: { tenantId: tenant.id },
});

// Create payment
const payment = await prisma.payment.create({
  data: {
    tenantId: tenant.id,
    userId: user.id,
    planId: plan.id,
    amount: new Decimal('1000'),
    status: 'SUCCESSFUL',
    fapshiTransactionId: 'ABC123',
  },
});
```

---

## ⚙️ Configuration Files

### `.env` (Local Development)
```
DATABASE_URL=...          # Connection pooling URL
DIRECT_URL=...            # Direct connection URL
NODE_ENV=development
JWT_SECRET=...
```

### `prisma.config.ts`
```typescript
{
  schema: "prisma/schema.prisma",
  datasource: {
    adapter: "postgresql",
    url: process.env["DATABASE_URL"],
  },
}
```

### `prisma/schema.prisma`
- All model definitions
- Relationships
- Indexes
- Constraints

---

## 🆘 Troubleshooting

### Issue: "Could not resolve @prisma/client"
**Solution**: Run `npm install @prisma/client --legacy-peer-deps`

### Issue: "No database connection"
**Solution**: 
1. Check `.env` DATABASE_URL is correct
2. Test connection: `npx prisma db execute --stdin < /dev/null`
3. Verify Supabase project is active

### Issue: "Migration conflicts"
**Solution**: Run `npm run prisma:reset` (deletes all data)

### Issue: Prisma Client out of sync
**Solution**: Run `npm run prisma:generate`

---

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Setup](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL Adapter](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#postgresql)
- [Connection Pooling](https://www.prisma.io/docs/orm/overview/databases/connection-urls#connection-pooling-1)

---

## 🎯 Next Phase: NestJS Integration

After confirming database works:

1. Create `PrismaService` in NestJS
2. Replace MongoDB services with Prisma
3. Update controllers to use Prisma models
4. Run tests to verify

See [PRISMA_SETUP.md](./PRISMA_SETUP.md) for detailed integration guide.

---

**Ready to go!** 🚀  
Run `npm run prisma:push` when you've updated `.env` with your Supabase credentials.
