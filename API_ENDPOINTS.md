# Splendid Starlink API - Complete Endpoint Documentation

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [Users](#users)
3. [Plans](#plans)
4. [Payments](#payments)
5. [Billing](#billing)
6. [Sessions](#sessions)
7. [Activities](#activities)
8. [Metrics](#metrics)
9. [MikroTik Management](#mikrotik-management)
10. [Notifications](#notifications)
11. [Tenants](#tenants)
12. [Health & Status](#health--status)

---

## Authentication

### Login
**POST** `/auth/login`

Authenticate user with credentials. Returns JWT token for subsequent requests.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password",
  "fromWifi": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "john_doe"
    },
    "planStatus": {
      "planExpired": false,
      "isActive": true,
      "sessionExpiry": "2026-04-18T15:30:00Z",
      "remainingHours": 24
    },
    "mikrotikAuth": {
      "success": true,
      "message": "Authenticated with MikroTik"
    }
  }
}
```

**Auth:** Not required
**Status Codes:** 200 (Success), 401 (Invalid credentials)

### Register (Create User)
**POST** `/auth/register`

Create a new user account with optional WiFi session details.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password",
  "tenantId": "tenant-123",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "ipAddress": "192.168.1.100",
  "routerIdentity": "Home"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "john_doe"
    }
  }
}
```

**Auth:** Not required
**Status Codes:** 201 (Created), 400 (Invalid input)

---

## Users

### Signup (Create User)
**POST** `/users/signup`

Create a new user account.

**Request Body:**
```json
{
  "username": "jane_doe",
  "password": "secure_password",
  "tenantId": "tenant-123"
}
```

**Response (201):**
```json
{
  "message": "User created",
  "user": {
    "id": "507f1f77bcf86cd799439012",
    "username": "jane_doe"
  }
}
```

**Auth:** Not required
**Status Codes:** 201 (Created), 400 (User exists)

---

## Plans

### Get All Plans
**GET** `/plans`

Retrieve all available data bundle plans.

**Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "100 CFA - 2 hours",
    "price": 100,
    "duration": 2,
    "tenantId": "tenant-123"
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "name": "500 CFA - 24 hours",
    "price": 500,
    "duration": 24,
    "tenantId": "tenant-123"
  }
]
```

**Auth:** Not required
**Status Codes:** 200 (Success)

---

### Get Plan by ID
**GET** `/plans/:id`

Get details of a specific plan.

**Parameters:**
- `id` (path) - Plan ID

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "100 CFA - 2 hours",
  "price": 100,
  "duration": 2,
  "tenantId": "tenant-123"
}
```

**Auth:** Not required
**Status Codes:** 200 (Success), 404 (Not found)

---

### Create Plan
**POST** `/plans`

Create a new data plan. **Admin only**.

**Request Body:**
```json
{
  "name": "1000 CFA - 7 days",
  "price": 1000,
  "duration": 168
}
```

**Response (201):**
```json
{
  "id": "507f1f77bcf86cd799439013",
  "name": "1000 CFA - 7 days",
  "price": 1000,
  "duration": 168,
  "tenantId": "tenant-123"
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 201 (Created), 401 (Unauthorized)

---

### Update Plan
**PUT** `/plans/:id`

Update an existing plan. **Admin only**.

**Parameters:**
- `id` (path) - Plan ID

**Request Body:**
```json
{
  "name": "Updated Plan",
  "price": 1500,
  "duration": 72
}
```

**Response (200):** Updated plan object
**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized), 404 (Not found)

---

### Delete Plan
**DELETE** `/plans/:id`

Delete a plan. **Admin only**.

**Parameters:**
- `id` (path) - Plan ID

**Response (200):**
```json
{
  "message": "Plan deleted"
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized), 404 (Not found)

---

## Payments

### Initiate Payment
**POST** `/payments/initiate`

Start a payment transaction for plan purchase.

**Request Body:**
```json
{
  "planId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "phone": "+234701234567",
  "externalId": "optional-external-id",
  "name": "John Doe",
  "macAddress": "02:38:9C:12:34:56",
  "routerIdentity": "Home",
  "isGift": false,
  "recipientUsername": null,
  "userIp": "192.168.1.100",
  "password": "optional-password"
}
```

**Response (201):**
```json
{
  "paymentId": "507f1f77bcf86cd799439011",
  "transId": "abc12345",
  "message": "Payment request sent to your mobile phone. Please complete payment on your device."
}
```

**Auth:** Required (JWT)
**Status Codes:** 201 (Created), 400 (Invalid input), 401 (Unauthorized)

---

### Check Payment Status
**GET** `/payments/status/:transactionId`

Check the status of a payment transaction.

**Parameters:**
- `transactionId` (path) - Fapshi transaction ID

**Response (200):**
```json
{
  "status": "SUCCESSFUL",
  "transactionId": "abc12345",
  "amount": 1000,
  "planDuration": 24,
  "sessionExpiry": "2026-04-19T15:30:00Z"
}
```

**Auth:** Not required
**Status Codes:** 200 (Success), 404 (Not found)

---

### Get Payment History
**GET** `/payments/history`

Get user's purchase history.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "user-123",
      "planId": "507f1f77bcf86cd799439011",
      "amount": 500,
      "status": "SUCCESSFUL",
      "transId": "abc12345",
      "createdAt": "2026-04-18T15:30:00Z",
      "planName": "500 CFA - 24 hours"
    }
  ]
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Payment Webhook
**POST** `/payments/webhook`

Fapshi payment status webhook. Called automatically by Fapshi gateway.

**Request Body:**
```json
{
  "transId": "abc12345",
  "status": "SUCCESSFUL",
  "amount": 1000,
  "timestamp": "2026-04-18T15:30:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Auth:** Not required
**Status Codes:** 200 (Success), 400 (Invalid payload)

---

## Billing

### Get Billing History
**GET** `/user/billing`

Retrieve complete billing/invoice history.

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "inv-001",
      "date": "2026-04-18T15:30:00Z",
      "amount": 500,
      "status": "SUCCESSFUL",
      "planName": "500 CFA - 24 hours",
      "planDuration": 24
    }
  ],
  "totalInvoices": 5,
  "totalSpent": 2500
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Get Billing Statistics
**GET** `/user/billing/stats`

Get aggregated billing statistics.

**Response (200):**
```json
{
  "totalSpent": 2500,
  "successfulPayments": 5,
  "failedPayments": 0,
  "totalHoursPurchased": 120,
  "firstPurchaseDate": "2026-03-18T10:00:00Z",
  "lastPurchaseDate": "2026-04-18T15:30:00Z",
  "averageSpendPerMonth": 500
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

## Sessions

### Get Current Session
**GET** `/sessions/current`

Get detailed information about current user session.

**Response (200):**
```json
{
  "tenantId": "tenant-123",
  "id": "user-123",
  "userId": "user-123",
  "startTime": "2026-04-18T15:30:00Z",
  "dataUsed": 0,
  "isActive": true,
  "remainingTime": 86400000
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Get Session Status
**GET** `/sessions/status`

Quick session status check.

**Response (200):**
```json
{
  "isActive": true,
  "remainingTime": 86400000
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

## Activities

### Get Recent Activities
**GET** `/activities/recent?page=1&pageSize=10`

Get paginated user activity history.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `pageSize` (optional) - Records per page (default: 10, max: 50)

**Response (200):**
```json
{
  "activities": [
    {
      "id": "act-001",
      "action": "PLAN_PURCHASED",
      "category": "payment",
      "description": "Purchased 500 CFA - 24 hours plan",
      "status": "SUCCESS",
      "details": {},
      "timestamp": "2026-04-18T15:30:00Z",
      "routerIdentity": "Home"
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 5
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Get Activity Statistics
**GET** `/activities/stats`

Get aggregated activity statistics for current month.

**Response (200):**
```json
{
  "totalActivities": 15,
  "successfulCount": 12,
  "failedCount": 3,
  "paymentCount": 5,
  "totalHours": 120,
  "monthStart": "2026-04-01T00:00:00Z",
  "monthEnd": "2026-04-30T23:59:59Z"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Get Activities by Category
**GET** `/activities/by-category?category=payment&page=1`

Filter activities by category.

**Query Parameters:**
- `category` (required) - One of: `payment`, `session`, `connection`, `account`, `system`
- `page` (optional) - Page number (default: 1)
- `pageSize` (optional) - Records per page (default: 10)

**Response (200):** Same as Get Recent Activities
**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

## Metrics

### Get Current Metrics
**GET** `/connection/metrics`

Get real-time connection speed, latency, and signal metrics.

**Response (200):**
```json
{
  "isConnected": true,
  "metrics": {
    "downloadSpeed": 85.5,
    "uploadSpeed": 35.2,
    "latency": 45,
    "signalStrength": 92,
    "connectionQuality": "excellent",
    "timestamp": "2026-04-18T15:30:00Z"
  },
  "status": "active",
  "dataUsed": 1250,
  "sessionExpiry": "2026-04-19T15:30:00Z",
  "router": "Home"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Get Historical Metrics
**GET** `/connection/metrics/history?hours=24`

Get historical metrics data for specified period.

**Query Parameters:**
- `hours` (optional) - Hours to retrieve (default: 24, max: 168)

**Response (200):**
```json
{
  "measurements": [
    {
      "downloadSpeed": 80.5,
      "uploadSpeed": 32.1,
      "latency": 42,
      "signalStrength": 90,
      "connectionQuality": "good",
      "timestamp": "2026-04-18T14:00:00Z"
    }
  ],
  "averageDownloadSpeed": 82.3,
  "averageUploadSpeed": 33.7,
  "averageLatency": 44,
  "averageSignalStrength": 91,
  "startTime": "2026-04-17T15:30:00Z",
  "endTime": "2026-04-18T15:30:00Z"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

## MikroTik Management

### Test Connection
**GET** `/mikrotik/test-connection`

Test MikroTik router connection. **Admin only**.

**Response (200):**
```json
{
  "message": "MikroTik connection successful",
  "data": {
    "connected": true,
    "router": "Home Router",
    "uptime": 3600
  }
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized), 500 (Connection failed)

---

### List All Users
**GET** `/mikrotik/users`

Get all hotspot users on MikroTik. **Admin only**.

**Response (200):**
```json
{
  "users": [
    {
      "username": "john_doe",
      "password": "****",
      "disabled": false,
      "createdAt": "2026-04-18T10:00:00Z"
    }
  ]
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Get User Details
**GET** `/mikrotik/users/:username`

Get details of specific hotspot user. **Admin only**.

**Parameters:**
- `username` (path) - Username

**Response (200):**
```json
{
  "user": {
    "username": "john_doe",
    "profile": "default",
    "disabled": false,
    "createdAt": "2026-04-18T10:00:00Z"
  }
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized), 404 (Not found)

---

### Get Active Users
**GET** `/mikrotik/active-users`

List currently connected hotspot users. **Admin only**.

**Response (200):**
```json
{
  "activeUsers": [
    {
      "username": "john_doe",
      "ipAddress": "192.168.100.50",
      "macAddress": "02:38:9C:12:34:56",
      "connectedSince": "2026-04-18T14:30:00Z",
      "bytesIn": 524288,
      "bytesOut": 1048576
    }
  ]
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Activate User
**POST** `/mikrotik/activate`

Create/activate hotspot user. **Admin only**.

**Request Body:**
```json
{
  "username": "john_doe",
  "durationHours": 24
}
```

**Response (201):**
```json
{
  "message": "User john_doe activated for 24 hours"
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 201 (Created), 400 (Invalid), 401 (Unauthorized)

---

### Disable User
**POST** `/mikrotik/disable`

Disable hotspot user (keeps account). **Admin only**.

**Request Body:**
```json
{
  "username": "john_doe"
}
```

**Response (200):**
```json
{
  "message": "User john_doe disabled (account kept)"
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Delete User
**DELETE** `/mikrotik/delete`

Permanently remove hotspot user. **Admin only**.

**Request Body:**
```json
{
  "username": "john_doe"
}
```

**Response (200):**
```json
{
  "message": "User john_doe deleted permanently"
}
```

**Auth:** Required (JWT + Admin)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

## Notifications

### Check Session Notifications
**POST** `/notifications/check-session`

Manually trigger session expiry warning checks.

**Response (200):**
```json
{
  "message": "Session notification check completed",
  "timestamp": "2026-04-18T15:30:00Z"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Check Payment Notifications
**POST** `/notifications/check-payments`

Manually trigger payment status notification checks.

**Response (200):**
```json
{
  "message": "Payment notification check completed",
  "timestamp": "2026-04-18T15:30:00Z"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Reset Session Notification Flags
**POST** `/notifications/reset-session-flags/:userId`

Reset session notification flags for testing.

**Parameters:**
- `userId` (path) - User ID

**Response (200):**
```json
{
  "message": "Session notification flags reset for user: user-123",
  "timestamp": "2026-04-18T15:30:00Z"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

### Reset Payment Notification Flags
**POST** `/notifications/reset-payment-flags/:paymentId`

Reset payment notification flags for testing.

**Parameters:**
- `paymentId` (path) - Payment ID

**Response (200):**
```json
{
  "message": "Payment notification flags reset for: payment-123",
  "timestamp": "2026-04-18T15:30:00Z"
}
```

**Auth:** Required (JWT)
**Status Codes:** 200 (Success), 401 (Unauthorized)

---

## Tenants

### Get All Tenants
**GET** `/tenants`

List all active tenants.

**Response (200):**
```json
[
  {
    "id": "tenant-123",
    "domain": "splendidstarlink.com",
    "subdomain": "app",
    "name": "Splendid Starlink",
    "email": "info@splendidstarlink.com",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

**Auth:** Not required
**Status Codes:** 200 (Success)

---

### Get Tenant Details
**GET** `/tenants/:id`

Get specific tenant information.

**Parameters:**
- `id` (path) - Tenant ID

**Response (200):** Single tenant object
**Status Codes:** 200 (Success), 404 (Not found)

---

### Create Tenant
**POST** `/tenants`

Create new tenant organization.

**Request Body:**
```json
{
  "domain": "newsite.com",
  "subdomain": "api",
  "name": "New Organization",
  "email": "admin@newsite.com",
  "businessName": "New Biz Inc"
}
```

**Response (201):** Created tenant object
**Status Codes:** 201 (Created), 400 (Invalid)

---

### Update Tenant
**PUT** `/tenants/:id`

Update tenant information.

**Parameters:**
- `id` (path) - Tenant ID

**Request Body:** Partial tenant fields
**Response (200):** Updated tenant object
**Status Codes:** 200 (Success), 404 (Not found)

---

## Health & Status

### Health Check
**GET** `/health`

Quick API health check.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-18T15:30:00Z",
  "uptime": 3600,
  "service": "starlink-hotspot-api",
  "version": "1.0.0",
  "environment": "production"
}
```

**Auth:** Not required
**Status Codes:** 200 (Healthy), 503 (Unhealthy)

---

### Ping
**GET** `/health/ping`

Ping endpoint for connection testing.

**Response (200):**
```json
{
  "message": "pong"
}
```

**Auth:** Not required
**Status Codes:** 200 (Success)

---

### Detailed Health Check
**GET** `/health/detailed`

Comprehensive health status with dependency checks.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-18T15:30:00Z",
  "uptime": 3600,
  "service": "starlink-hotspot-api",
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "database": "connected",
    "mikrotik": "connected",
    "fapshi": "available"
  }
}
```

**Auth:** Not required
**Status Codes:** 200 (All healthy), 503 (Some issues)

---

## Testing Tips

### Getting Started
1. Access Swagger UI: `http://localhost:3000/docs`
2. Use `/health` endpoint to verify API is running
3. Create account via `/users/signup` or login via `/auth/login`
4. Copy JWT token from response
5. Click "Authorize" button in Swagger and paste token with "Bearer " prefix

### Common Workflows

#### User Registration & Login
```
1. POST /users/signup → Create account
2. POST /auth/login → Get JWT token
3. Use token for all subsequent requests
```

#### Purchase & Activation
```
1. GET /plans → View available plans
2. POST /payments/initiate → Start payment
3. GET /payments/status/{transId} → Check payment
4. GET /sessions/current → Verify activation
```

#### Admin Management
```
1. POST /auth/login (admin account)
2. GET /mikrotik/users → List all hotspot users
3. POST /mikrotik/activate → Add new user
4. POST /plans → Create new plan
```

#### Monitoring
```
1. GET /health → Check service status
2. GET /connection/metrics → Current metrics
3. GET /activities/recent → User activity log
4. GET /user/billing → Billing history
```

---

## Error Handling

All errors follow this format:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "ValidationError"
}
```

### Common Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad request (invalid input)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not found
- **500** - Server error
- **503** - Service unavailable

---

## Rate Limiting & Best Practices

- Use pagination for list endpoints (max 50 per page)
- Cache metrics and activity data on client
- Refresh JWT tokens before expiry
- Monitor `/health/detailed` for service issues
- Use batch operations where available
- Test with `/health/ping` before critical operations

---

**Last Updated:** April 18, 2026
**API Version:** 1.0.0
**Database:** PostgreSQL with Prisma ORM
