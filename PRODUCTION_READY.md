# XenFi Production-Ready Router Management System

## System Architecture Update

This document summarizes the production-ready enhancements made to the XenFi router management system for RADIUS-based hotspot authentication.

---

## 1. Database Schema Updates

### Router Model Changes
**Previous Structure:**
```sql
Router {
  id, tenantId, name, ipAddress, username, password, identity, radiusSecret, isActive
}
```

**Updated Structure:**
```sql
Router {
  id                  String   @id @default(cuid())
  tenantId            String   // Foreign key to Tenant
  name                String   // Router display name
  localIpAddress      String   // LAN IP (e.g., 192.168.88.1) - replaces ipAddress
  username            String   // Router admin username
  password            String   // ENCRYPTED router admin password
  identity            String?  // MikroTik identity/system name
  radiusSecret        String?  // ENCRYPTED RADIUS shared secret
  adminPassword       String?  // ENCRYPTED admin password for provisioning
  location            String?  // Physical location (e.g., "Bamenda Central")
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  // Relations
  tenant              Tenant
  sessions            Session[]
}
```

**Key Changes:**
- ✅ `ipAddress` → `localIpAddress` - Clarifies this is a LAN IP, not public
- ✅ Added `radiusSecret` - Shared secret for RADIUS authentication (encrypted)
- ✅ Added `location` - Track where routers are physically deployed
- ✅ Passwords are now **automatically encrypted** before storage

### User Model Changes
**Previous Structure:**
```sql
User {
  id, tenantId (required), username, voucherCode, email, password, role, ...
  constraints: unique([tenantId, username]), unique([tenantId, email])
}
```

**Updated Structure:**
```sql
User {
  id                  String    @id @default(cuid())
  tenantId            String?   // NOW OPTIONAL - allows SUPER_ADMIN users without tenant
  username            String    @unique // NOW GLOBALLY UNIQUE - for SUPER_ADMIN
  voucherCode         String?   @unique
  email               String?   @unique // NOW GLOBALLY UNIQUE
  password            String
  role                String    @default("CUSTOMER")
                      // Values: 'SUPER_ADMIN', 'ISP_ADMIN', 'CUSTOMER'
  ...other fields...
  
  // Constraints
  @@unique([tenantId, username])
  @@unique([tenantId, email])
  @@index([role])
}
```

**Key Changes:**
- ✅ `tenantId` is now optional (NULL for SUPER_ADMIN)
- ✅ `username` is now globally unique (enables SUPER_ADMIN)
- ✅ `email` is now globally unique
- ✅ Added role-based index for faster queries

---

## 2. System Admin (SUPER_ADMIN) Setup

### SUPER_ADMIN Credentials
The system now has one authoritative super admin:

```
Username:       splendid
Email:          splendid@gmail.com
Password:       To2dayPips
Role:           SUPER_ADMIN
Tenant:         None (system-level access)
```

### SUPER_ADMIN Capabilities
- ✅ Create and manage Tenants (ISP organizations)
- ✅ Assign Routers to Tenants
- ✅ Create ISP_ADMIN users
- ✅ View system-wide metrics and statistics
- ✅ Manage user roles and permissions

### Auto-Seeding
The `AdminSeederService` automatically creates the SUPER_ADMIN on first run:
- Checks if `splendid` already exists (prevents duplicates)
- Creates with role='SUPER_ADMIN' and tenantId=NULL
- Logs credentials for reference

---

## 3. Router Management Endpoints (Authenticated)

All router endpoints now require **JWT authentication** and are scoped to the authenticated user's tenant.

### Request Body for Creating a Router

**Endpoint:** `POST /routers`

**Required Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "name": "Main Office Router",
  "localIpAddress": "192.168.88.1",
  "username": "admin",
  "password": "password123",
  "identity": "XenFi-MainOffice",
  "radiusSecret": "your-secure-shared-secret-here",
  "location": "Bamenda Central",
  "isActive": true
}
```

**Field Descriptions:**
| Field | Type | Description | Encrypted |
|-------|------|-------------|-----------|
| `name` | string | Router display name | No |
| `localIpAddress` | string | LAN IP address (192.168.88.1) | No |
| `username` | string | Router admin username | No |
| `password` | string | Router admin password | ✅ Yes |
| `identity` | string (optional) | MikroTik system name | No |
| `radiusSecret` | string (optional) | RADIUS shared secret | ✅ Yes |
| `location` | string (optional) | Physical location | No |
| `isActive` | boolean (optional) | Router status | No |

**Response:**
```json
{
  "id": "router-123",
  "name": "Main Office Router",
  "localIpAddress": "192.168.88.1",
  "username": "admin",
  "identity": "XenFi-MainOffice",
  "location": "Bamenda Central",
  "isActive": true,
  "createdAt": "2026-04-26T14:17:42Z",
  "updatedAt": "2026-04-26T14:17:42Z"
}
```

---

## 4. Security Features

### Automatic Encryption
Sensitive fields are **automatically encrypted** before storage:
- `password` (router admin password)
- `radiusSecret` (RADIUS shared secret)

**Encryption Algorithm:** AES-256-GCM with IV + Auth Tag

**Decryption:** Fields are decrypted on retrieval via `tryDecryptSecret()` utility

### Authentication
- ✅ All router endpoints require JWT authentication
- ✅ Routers are scoped to tenant (can only access own routers)
- ✅ SUPER_ADMIN users can access system-wide resources

---

## 5. API Access Control

### Public Endpoints (No Auth Required)
```
POST /auth/register          - Tenant registration
POST /auth/login             - Tenant login
POST /tenant/auth/register   - ISP registration
POST /tenant/auth/login      - ISP login
GET  /radius/status          - RADIUS server status
GET  /health                 - System health check
```

### Protected Endpoints (JWT Required)
```
POST   /routers              - Create router for tenant
GET    /routers              - List routers for tenant
GET    /routers/:id          - Get specific router
PUT    /routers/:id          - Update router
DELETE /routers/:id          - Delete router
```

---

## 6. Tenant-Router Association

### How Tenants Manage Routers

1. **Tenant Logs In**
   ```bash
   POST /tenant/auth/login
   Body: { "username": "isp_admin", "password": "..." }
   Response: { "access_token": "eyJhbGc..." }
   ```

2. **Create Router for Tenant**
   ```bash
   POST /routers
   Authorization: Bearer eyJhbGc...
   Body: { 
     "name": "Branch Office",
     "localIpAddress": "192.168.1.1",
     "radiusSecret": "secret123",
     ...
   }
   ```

3. **Router is Automatically Scoped**
   - The router's `tenantId` is extracted from JWT token
   - Router can ONLY be accessed by that tenant's users
   - Isolation is enforced at the database level

---

## 7. Migration Details

**Migration File:** `20260426141742_update_router_and_user_fields`

**Changes Applied:**
1. Router table:
   - Renamed `ipAddress` → `localIpAddress`
   - Added `radiusSecret` column (STRING, optional)
   - Added `adminPassword` column (STRING, optional)
   - Added `location` column (STRING, optional)

2. User table:
   - Made `tenantId` optional (NULL allowed)
   - Added UNIQUE constraint on `username`
   - Added UNIQUE constraint on `email`
   - Added INDEX on `role`

---

## 8. Code Changes Summary

### Files Modified

1. **Database Schema**
   - `prisma/schema.prisma` - Updated Router and User models

2. **Router API**
   - `src/router/router.controller.ts` - Added @UseGuards(JwtAuthGuard)
   - `src/router/router.service.ts` - Added encryption logic
   - `src/router/dto/create-router.dto.ts` - Added new fields
   - `src/router/dto/router-response.dto.ts` - Updated response model

3. **Users Management**
   - `src/users/users.service.ts` - Added `createSuperAdmin()` method
   - `src/auth/admin-seeder.service.ts` - Updated to create SUPER_ADMIN

4. **RADIUS Integration**
   - `src/radius/radius.service.ts` - Fixed field references (ipAddress → localIpAddress)

5. **Sessions**
   - `src/sessions/sessions.service.ts` - Updated field reference

6. **Tenant Interceptor**
   - `src/tenants/tenant.interceptor.ts` - Added `/radius/status` to public routes

---

## 9. Production Deployment Checklist

- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] SUPER_ADMIN user created with credentials: `splendid / To2dayPips`
- [ ] JWT secret configured in environment (`JWT_SECRET`)
- [ ] Encryption key configured (`ENCRYPTION_KEY`)
- [ ] Router firewall: UDP ports 1812, 1813 open for RADIUS
- [ ] Test router creation endpoint with valid JWT token
- [ ] Test RADIUS authentication with sample MikroTik device
- [ ] Verify encrypted fields in database (password, radiusSecret)

---

## 10. Next Steps

### For ISP Administrators
1. Use `splendid` to log in as SUPER_ADMIN
2. Create ISP tenant(s) using `/tenants` endpoint
3. Create ISP_ADMIN users for each tenant
4. ISP_ADMIN users create routers with RADIUS secrets
5. Configure MikroTik devices with RADIUS settings

### For MikroTik Configuration
See `RADIUS_SETUP_GUIDE.md` for detailed WinBox setup instructions

---

## 11. Example Workflows

### Workflow 1: SUPER_ADMIN Creates ISP Tenant

```bash
# 1. Login as SUPER_ADMIN
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"splendid","password":"To2dayPips"}'
# Response: { "access_token": "eyJhbGc..." }

# 2. Create ISP Tenant
curl -X POST http://localhost:3000/tenants \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bamenda ISP",
    "subdomain": "bamenda-isp",
    "email": "admin@bamendaisp.com",
    "businessName": "Bamenda Internet Services"
  }'
```

### Workflow 2: ISP Creates Router

```bash
# 1. ISP Login
curl -X POST http://localhost:3000/tenant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"isp_admin","password":"..."}'
# Response: { "access_token": "eyJhbGc..." }

# 2. Create Router
curl -X POST http://localhost:3000/routers \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office Router",
    "localIpAddress": "192.168.88.1",
    "username": "admin",
    "password": "RouterPassword123",
    "identity": "XenFi-MainOffice",
    "radiusSecret": "MySuperSecureRADIUSSecret123",
    "location": "Bamenda Central"
  }'
```

---

## 12. Security Notes

⚠️ **Important:**
1. Passwords and RADIUS secrets are **automatically encrypted** - never store as plain text
2. The `ENCRYPTION_KEY` environment variable must be 32 bytes (256-bit)
3. All router endpoints require valid JWT authentication
4. Routers are scoped to tenants - data isolation is enforced
5. SUPER_ADMIN accounts should use strong passwords in production
6. Rotate encryption keys periodically (requires re-encryption of existing data)

---

## 13. Troubleshooting

### Issue: "Tenant ID is required"
- **Cause:** JWT token missing or invalid
- **Solution:** Ensure you include `Authorization: Bearer <token>` header

### Issue: "Router with IP already exists"
- **Cause:** A router with that `localIpAddress` exists for the tenant
- **Solution:** Use a unique IP or check existing routers

### Issue: "RADIUS secret decryption failed"
- **Cause:** Encryption key changed or corrupted
- **Solution:** Verify `ENCRYPTION_KEY` matches what was used during creation

---

## 14. API Documentation

Auto-generated Swagger docs available at: `http://localhost:3000/docs`

All endpoints are documented with:
- Request/response schemas
- Authentication requirements
- Error codes and descriptions