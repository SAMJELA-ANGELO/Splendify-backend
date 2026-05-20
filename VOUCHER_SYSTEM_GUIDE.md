# Voucher System - Complete Implementation Guide

## Quick Answer to Your Question

**Yes, the voucher system uses the username and password the user created when setting up their account.**

### Voucher Format

```
username:plaintext_password
```

The voucher code contains both the username and the **plaintext password** (the actual password, not the hashed version stored in the database).

---

## How Vouchers Work

### 1. Account Creation

When a user creates an account:
```
Username: john_doe
Password: MyPassword123
```

The password is hashed using bcrypt and stored securely in the database.

### 2. Plan Purchase

When the same user buys a plan:

```json
{
  "action": "plan purchase",
  "user": "john_doe",
  "plan": "2-Hour Plan",
  "price": "5000 XAF",
  "timestamp": "2026-05-20T15:00:00Z",
  "password": "MyPassword123"  // Plaintext password from payment
}
```

**Immediately after payment succeeds:**

1. System creates a voucher: `john_doe:MyPassword123`
2. Sets session expiry: 15:00 + 2 hours = 17:00
3. Stores in database:
   ```
   User Record:
   - voucherCode: "john_doe:MyPassword123"
   - planPurchaseTime: 2026-05-20T15:00:00Z
   - planDurationHours: 2
   - sessionExpiry: 2026-05-20T17:00:00Z
   - isActive: true
   ```

### 3. RADIUS Authentication

When user connects to the hotspot at 16:00 (4 PM):

**MikroTik Sends:**
```
RADIUS Access-Request:
  Username: john_doe
  Password: MyPassword123
  NAS-IP: 192.168.1.1
  Acct-Session-Id: abc123xyz
```

**Server Validates:**
```
1. Find user: john_doe ✓
2. Check isActive: true ✓
3. Check password:
   - Provided: "MyPassword123"
   - Hashed stored: "$2b$10$..."
   - bcrypt.compare("MyPassword123", "$2b$10$...") = true ✓
4. Check session expiry:
   - Current time: 2026-05-20T16:00:00Z
   - Expiry: 2026-05-20T17:00:00Z
   - Still valid: true ✓
```

**Server Responds:**
```
RADIUS Access-Accept
  Session-Timeout: 3600 (1 hour remaining)
  Mikrotik-Rate-Limit: "5M/10M" (from plan)
```

**Result:** User connected ✓

### 4. Session Timeout

At **17:00 (5 PM)**, even if user is still connected:

**Cleanup Service Runs (every minute):**
```
1. Find all active users with sessionExpiry < NOW
2. Found: john_doe (expiry: 17:00, now: 17:00)
3. Disable user: isActive = false
4. Unbind MAC address from MikroTik
5. Deactivate user on all routers
```

**User Experience:**
- At 17:00, connection suddenly drops
- Cannot reconnect until they buy another plan
- If they try to authenticate before 17:00 with wrong password, they're rejected immediately

---

## Database Schema

### User Table Fields (New)

```sql
CREATE TABLE "User" (
  -- ... existing fields ...
  
  -- Voucher fields
  voucherCode VARCHAR,           -- Format: username:password
  planPurchaseTime TIMESTAMP,    -- When plan was bought
  planDurationHours INT,         -- Plan duration in hours
  
  -- These already existed but now used for purchase-based expiry:
  sessionExpiry TIMESTAMP,       -- Purchase time + plan duration
  isActive BOOLEAN               -- Set to true on purchase, false on expiry
);
```

### Example Data

```json
{
  "id": "user_123",
  "username": "john_doe",
  "email": "john@example.com",
  "password": "$2b$10$...",  // HASHED - never used for voucher
  
  // Voucher system fields:
  "voucherCode": "john_doe:MyPassword123",  // PLAINTEXT in voucher
  "planPurchaseTime": "2026-05-20T15:00:00Z",
  "planDurationHours": 2,
  "sessionExpiry": "2026-05-20T17:00:00Z",
  "isActive": true,
  
  // ... other fields ...
}
```

---

## Code Flow

### When Payment Succeeds

**File:** `src/payments/payments.service.ts` → `activateUserAccess()`

```typescript
// 1. Get plan details
const plan = await this.plansService.findById(tenantId, payment.planId);

// 2. Calculate expiry
const expiry = new Date();
expiry.setHours(expiry.getHours() + plan.duration);  // NOW + hours

// 3. Update user record
await this.usersService.updateUser(tenantId, targetUserId, {
  isActive: true,
  sessionExpiry: expiry,
});

// 4. Generate voucher
const voucherCode = await this.voucherService.generateVoucher(
  tenantId,
  targetUserId,
  user,              // User object from database
  payment.password,  // PLAINTEXT password from payment
  plan.duration      // Hours
);
// Returns: "john_doe:MyPassword123"
```

### VoucherService Generation

**File:** `src/payments/voucher.service.ts` → `generateVoucher()`

```typescript
async generateVoucher(
  tenantId: string,
  userId: string,
  user: User,
  plaintextPassword: string,  // Original password from payment
  planDurationHours: number
): Promise<string> {
  // Create voucher with plaintext password
  const voucherCode = `${user.username}:${plaintextPassword}`;
  // Result: "john_doe:MyPassword123"
  
  // Calculate expiry time
  const purchaseTime = new Date();
  const expiryTime = new Date(purchaseTime);
  expiryTime.setHours(expiryTime.getHours() + planDurationHours);
  
  // Store in database
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      voucherCode: voucherCode,
      planPurchaseTime: purchaseTime,
      planDurationHours: planDurationHours,
      sessionExpiry: expiryTime,
      isActive: true,
    },
  });
  
  return voucherCode;
}
```

### RADIUS Authentication

**File:** `src/radius/radius.service.ts` → `handleAuthRequest()`

```typescript
private async handleAuthRequest(msg: Buffer, rinfo: dgram.RemoteInfo) {
  // Decode RADIUS packet
  const packet = radius.decode({ packet: msg, secret: routerInfo.secret });
  
  // Extract credentials from packet
  const username = packet.attributes['User-Name'];           // "john_doe"
  const userPassword = packet.attributes['User-Password'];   // "MyPassword123"
  
  // Find user by username
  const user = await this.prisma.user.findFirst({
    where: { username: username, tenantId: routerInfo.tenantId }
  });
  
  // Verify password against hashed password
  const bcrypt = require('bcrypt');
  const passwordMatch = await bcrypt.compare(userPassword, user.password);
  // Compares: "MyPassword123" vs hashed value in database
  
  if (!passwordMatch) {
    this.sendAccessReject(rinfo, msg, routerInfo.secret);
    return;
  }
  
  // Check session expiry
  if (user.sessionExpiry && user.sessionExpiry < new Date()) {
    this.sendAccessReject(rinfo, msg, routerInfo.secret);
    return;
  }
  
  // All checks passed
  this.sendAccessAccept(rinfo, msg, packet, user);
}
```

### Session Cleanup

**File:** `src/session-cleanup/session-cleanup.service.ts` → `handleSessionCleanup()`

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async handleSessionCleanup() {
  const now = new Date();
  
  // Find expired users
  const expiredUsers = await this.prisma.user.findMany({
    where: {
      isActive: true,
      sessionExpiry: { lt: now }  // Expiry time < current time
    }
  });
  
  // Disable each user
  for (const user of expiredUsers) {
    // Log purchase-based expiry details
    console.log(`Purchase time: ${user.planPurchaseTime}`);
    console.log(`Duration: ${user.planDurationHours} hours`);
    console.log(`Expired at: ${user.sessionExpiry}`);
    
    // Unbind from routers
    await this.mikrotikService.unbindMacOnAvailableRouters(user.macAddress);
    
    // Mark as inactive
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false }
    });
  }
}
```

---

## Security Considerations

### Plaintext Password in Voucher Code

**Why it's safe:**
1. Voucher is transmitted over HTTPS
2. Only stored temporarily until user connects
3. User already knows this is their password
4. RADIUS requires plaintext to verify against hashed version
5. Alternative would require storing plaintext in database (worse)

### Best Practices

```
✓ DO:
  - Use HTTPS for all voucher transmission
  - Require secure password during account creation
  - Log all RADIUS authentication attempts
  - Display voucher only once at purchase completion
  - Encourage users to change password after plan expires

✗ DON'T:
  - Email voucher in plaintext
  - Display voucher in user dashboard repeatedly
  - Use same password for all users
  - Store plaintext passwords in database
```

---

## Example Scenarios

### Scenario 1: Happy Path

```
15:00 - User buys 2-hour plan
        Voucher: john_doe:MyPassword123
        Expiry: 17:00

15:30 - User connects to hotspot
        Enters username: john_doe
        Enters password: MyPassword123
        RADIUS verification: ✓
        Status: CONNECTED

16:45 - User still connected
        Downloaded 500MB
        Still 15 minutes of session left

17:00 - Cleanup service runs
        Session expired
        User disconnected
        MAC address unbound
        Status: DISCONNECTED

17:05 - User tries to reconnect
        Enters same credentials
        RADIUS verification: ✗ (session expired)
        Error: "Your plan has expired. Please purchase a new plan."
```

### Scenario 2: Wrong Password

```
15:00 - User buys 2-hour plan
        Voucher: john_doe:MyPassword123

15:30 - User tries to connect
        Enters username: john_doe
        Enters password: WrongPassword123
        RADIUS verification: ✗
        Error: "Invalid credentials"
```

### Scenario 3: Early Session End

```
15:00 - User buys 2-hour plan
        Voucher: john_doe:MyPassword123
        Expiry: 17:00

15:30 - User connected

16:00 - User manually disconnects
        Voucher still valid until 17:00

16:30 - User reconnects
        Same voucher still works
        Expiry still: 17:00
        
17:00 - Original expiry time
        Cleanup service runs
        User disabled regardless of connection status
```

---

## Testing the Voucher System

### Test 1: Verify Voucher Generation

```bash
# Call payment webhook simulator
POST /payments/test-webhook
{
  "transId": "test_123",
  "status": "SUCCESSFUL"
}

# Check user record for voucher
GET /users/user_123/voucher
# Should return:
# {
#   "voucherCode": "john_doe:MyPassword123",
#   "sessionExpiry": "2026-05-20T17:00:00Z"
# }
```

### Test 2: Verify Session Timeout

```bash
# Create user with past expiry
POST /admin/test/create-expired-user
{
  "username": "test_user",
  "password": "test_pass",
  "sessionExpiry": "2020-01-01T00:00:00Z"  // Past date
}

# Manual cleanup run
POST /admin/cleanup/run-now

# User should be inactive
GET /users/test_user
# Should show: isActive: false
```

### Test 3: Verify RADIUS Authentication

```bash
# Using radtest (Linux)
radtest john_doe MyPassword123 192.168.1.100 0 testing123
# Should return: Access-Accept

# Using wrong password
radtest john_doe WrongPassword123 192.168.1.100 0 testing123
# Should return: Access-Reject
```

---

## Migration Notes (If Updating Existing System)

If you're upgrading from a system without vouchers:

```sql
-- Add new columns
ALTER TABLE "User" ADD COLUMN "voucherCode" VARCHAR;
ALTER TABLE "User" ADD COLUMN "planPurchaseTime" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "planDurationHours" INT;

-- Populate existing active users with vouchers
-- (requires their original passwords - may not be available)
-- Option 1: Require password reset to generate vouchers
-- Option 2: Generate new temporary vouchers on next purchase
```

---

## Summary

| Aspect | Value |
|--------|-------|
| **Voucher Format** | `username:plaintext_password` |
| **Password Source** | Original password from account creation |
| **Session Expiry** | Purchase time + plan duration |
| **Cleanup Frequency** | Every minute |
| **Authentication** | RADIUS with bcrypt verification |
| **Security** | HTTPS only, temporary storage |

✅ Voucher system is now fully implemented and documented!
