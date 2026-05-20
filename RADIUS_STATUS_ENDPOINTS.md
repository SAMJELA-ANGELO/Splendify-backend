# RADIUS Service - Status Pages & Endpoints Documentation

## Overview

The RADIUS service now includes comprehensive health check endpoints that provide real-time status information about the authentication and accounting servers running on ports **1812** and **1813**.

## Accessing RADIUS Status Endpoints

All RADIUS status endpoints are accessible from your HTTP server (typically port 3000 or the port your NestJS app is running on).

### Base URL

```
http://your-server-ip:3000/health/radius
```

Replace `your-server-ip` with your actual server IP address.

---

## Available Endpoints

### 1. Overall RADIUS Service Status

**Endpoint:** `GET /health/radius/status`

**Purpose:** Get the overall status of both RADIUS ports and server metrics

**Example:**
```bash
curl http://your-server-ip:3000/health/radius/status
```

**Response:**
```json
{
  "status": "operational",
  "message": "RADIUS servers are running",
  "service": "RADIUS Authentication & Accounting",
  "ports": {
    "authentication": {
      "port": 1812,
      "protocol": "UDP",
      "service": "Access-Request / Access-Accept",
      "status": "listening"
    },
    "accounting": {
      "port": 1813,
      "protocol": "UDP",
      "service": "Accounting-Request / Accounting-Response",
      "status": "listening"
    }
  },
  "metrics": {
    "authRequests": 150,
    "acctRequests": 275,
    "activeSessions": 42,
    "uptime": 3600000
  },
  "timestamp": "2026-05-20T14:30:00.000Z"
}
```

---

### 2. Authentication Port (1812) Status

**Endpoint:** `GET /health/radius/auth-port`

**Purpose:** Check the RADIUS authentication port (1812) and detailed metrics

**What It Handles:**
- Access-Request packets (user authentication)
- Access-Accept (successful authentication)
- Access-Reject (failed authentication)
- Session-Timeout attributes
- Rate-Limit attributes (MikroTik-Rate-Limit)

**Example:**
```bash
curl http://your-server-ip:3000/health/radius/auth-port
```

**Response:**
```json
{
  "port": 1812,
  "status": "operational",
  "protocol": "UDP",
  "service": "RADIUS Authentication",
  "description": "Handles Access-Request packets for user authentication and returns Access-Accept or Access-Reject",
  "features": [
    "User-Name and User-Password validation",
    "Session-Timeout calculation",
    "Rate-Limit attributes (MikroTik-Rate-Limit)",
    "Plan-based speed limits (download/upload)"
  ],
  "requests": 150,
  "uptime": "3600s"
}
```

---

### 3. Accounting Port (1813) Status

**Endpoint:** `GET /health/radius/acct-port`

**Purpose:** Check the RADIUS accounting port (1813) and session tracking metrics

**What It Handles:**
- Accounting-Start (session begins)
- Interim-Update (periodic updates)
- Accounting-Stop (session ends)
- Data usage tracking (input/output octets)
- Session duration calculations

**Example:**
```bash
curl http://your-server-ip:3000/health/radius/acct-port
```

**Response:**
```json
{
  "port": 1813,
  "status": "operational",
  "protocol": "UDP",
  "service": "RADIUS Accounting",
  "description": "Handles Accounting-Request packets for session tracking and returns Accounting-Response",
  "features": [
    "Accounting-Start on session begin",
    "Interim-Update for ongoing sessions",
    "Accounting-Stop on session end",
    "Data usage tracking (input/output octets)",
    "Session duration calculation"
  ],
  "requests": 275,
  "activeSessions": 42,
  "uptime": "3600s",
  "lastCheck": "2026-05-20T14:30:00.000Z",
  "url": "udp://your-server-ip:1813"
}
```

---

### 4. Setup Guide & Configuration

**Endpoint:** `GET /health/radius/setup-guide`

**Purpose:** Get MikroTik configuration instructions and testing guide

**Example:**
```bash
curl http://your-server-ip:3000/health/radius/setup-guide
```

**Response:**
```json
{
  "title": "RADIUS Server Configuration Guide",
  "server": {
    "authentication": "your-server-ip:1812",
    "accounting": "your-server-ip:1813"
  },
  "status": {
    "port1812": "operational",
    "port1813": "operational",
    "description": "Both RADIUS ports are accessible"
  },
  "configuration": {
    "mikrotik": {
      "title": "MikroTik RouterOS Configuration",
      "steps": [
        {
          "step": 1,
          "title": "Access Router Management",
          "instructions": [
            "Open WinBox or web interface",
            "Connect to your MikroTik router"
          ]
        },
        {
          "step": 2,
          "title": "Configure RADIUS Server",
          "path": "IP > Hotspot > RADIUS",
          "instructions": [
            "Click '+' to add a new RADIUS server",
            "Address: your-server-ip",
            "Authentication Port: 1812",
            "Accounting Port: 1813",
            "Secret: [Your router RADIUS secret]",
            "Check 'Hotspot' service"
          ]
        },
        {
          "step": 3,
          "title": "Configure Hotspot Profile",
          "path": "IP > Hotspot > Server Profiles",
          "instructions": [
            "Edit your hotspot server profile",
            "Go to Login tab",
            "Change 'Login By' to 'HTTP CHAP'",
            "Check 'RADIUS' checkbox"
          ]
        },
        {
          "step": 4,
          "title": "Test Connection",
          "instructions": [
            "Connect to the hotspot with a valid voucher code",
            "Check server logs for RADIUS authentication messages",
            "Monitor the status endpoints below"
          ]
        }
      ]
    }
  },
  "endpoints": {
    "overall_status": "/health/radius/status",
    "auth_port_1812": "/health/radius/auth-port",
    "acct_port_1813": "/health/radius/acct-port"
  },
  "voucher_format": {
    "description": "RADIUS vouchers use username:password format",
    "example": "username:password_hash",
    "authentication": "When connecting, use the voucher code as username and the original password"
  },
  "testing": {
    "curl": "curl http://your-server-ip/health/radius/status",
    "description": "Use this endpoint to verify RADIUS ports are accessible"
  }
}
```

---

### 5. Quick Connectivity Check

**Endpoint:** `GET /health/radius/quick-check`

**Purpose:** Quick 5-second health check (returns minimal data)

**Example:**
```bash
curl http://your-server-ip:3000/health/radius/quick-check
```

**Response:**
```json
{
  "healthy": true,
  "port1812": {
    "name": "Authentication",
    "status": "listening",
    "requests": 150
  },
  "port1813": {
    "name": "Accounting",
    "status": "listening",
    "requests": 275
  },
  "uptime": "3600s"
}
```

---

## Monitoring & Alerts

### Recommended Monitoring Setup

Monitor these endpoints every **60 seconds** for production monitoring:

```bash
# Check overall status
curl -s http://your-server-ip:3000/health/radius/status | jq '.metrics'

# Check if ports are responsive
curl -s http://your-server-ip:3000/health/radius/quick-check | jq '.healthy'

# Monitor active sessions
curl -s http://your-server-ip:3000/health/radius/acct-port | jq '.activeSessions'
```

### Alert Conditions

Set up alerts if:
- `healthy: false` in quick-check response
- Both port statuses are not "operational"
- Server uptime is 0 (server crashed and restarted)
- Authentication/Accounting requests stop increasing

---

## Voucher System Documentation

### Understanding the Voucher System

When a user buys a plan, a **voucher** is automatically generated. The voucher is used for RADIUS authentication.

#### Voucher Format

```
username:plaintext_password
```

**Example:**
```
john_doe:mySecurePassword123
```

#### How It Works

1. **User Creates Account**
   - Username: `john_doe`
   - Password: `mySecurePassword123` (hashed and stored in database)

2. **User Buys a Plan**
   - Plan duration: 2 hours
   - Purchase time: 3:00 PM
   - Session expiry: 5:00 PM (2 hours later)
   - Voucher generated: `john_doe:mySecurePassword123`

3. **User Connects to Hotspot**
   - MikroTik prompts for credentials
   - User enters: `john_doe` (username) and `mySecurePassword123` (password)
   - MikroTik sends RADIUS Access-Request to your server

4. **Server Validates**
   - Checks if user `john_doe` exists
   - Compares provided password against hashed password using bcrypt
   - Checks if session has expired (5:00 PM deadline)
   - Returns Access-Accept or Access-Reject

5. **Session Cleanup**
   - Every minute, the cleanup service runs
   - Any user whose `sessionExpiry` time has passed is automatically disconnected
   - **No matter if they're actively connected**, they get disconnected at expiry time

---

### Session Timing (Purchase-Based Expiry)

**Key Feature:** Sessions expire based on **purchase time + plan duration**, not on actual connection time.

#### Example Scenario

| Event | Time | Status |
|-------|------|--------|
| User buys 2-hour plan | 3:00 PM | Plan purchased |
| Session expiry time set | 3:00 PM | Expires at 5:00 PM |
| User connects at | 4:00 PM | Connected for 1 hour |
| Cleanup service runs | 5:00 PM | User automatically disconnected |
| User tries to reconnect at | 5:05 PM | Connection rejected (expired) |

**Result:** Even though user only used 1 hour of actual connection time, they're cut off at 5:00 PM because that's when the plan expired.

---

### Getting Voucher Information

#### For Users

Users can check their voucher details through the API:

```bash
GET /users/:userId/voucher
```

Response:
```json
{
  "username": "john_doe",
  "voucherCode": "john_doe:mySecurePassword123",
  "planPurchaseTime": "2026-05-20T15:00:00.000Z",
  "planDurationHours": 2,
  "sessionExpiry": "2026-05-20T17:00:00.000Z",
  "isExpired": false,
  "timeRemainingMinutes": 85,
  "timeRemainingHours": 1.42
}
```

#### For Admins

Get all active vouchers for a tenant:

```bash
GET /admin/tenants/:tenantId/vouchers
```

---

### Voucher Lifecycle

1. **Generation** → Triggered on successful payment
2. **Active** → User can authenticate with voucher
3. **Expiry Approaching** → User receives notifications at 30min, 10min before expiry
4. **Expired** → Session cleanup service disables user
5. **Revoked** → Can be manually revoked or revoked on refund

---

## Testing Your Setup

### Step 1: Verify RADIUS Ports are Accessible

```bash
# Check port 1812 (Authentication)
curl http://your-server-ip:3000/health/radius/auth-port

# Check port 1813 (Accounting)
curl http://your-server-ip:3000/health/radius/acct-port
```

### Step 2: Verify MikroTik Configuration

```bash
# In MikroTik terminal, test RADIUS connection
/radius test-login username=test_user password=test_password
```

### Step 3: Test with a Real Voucher

1. Create a test user with a plan
2. Get the voucher code
3. Connect to hotspot with the voucher credentials
4. Monitor the server logs for RADIUS request/response

### Step 4: Monitor Active Sessions

```bash
# Get active sessions count
curl http://your-server-ip:3000/health/radius/acct-port | jq '.activeSessions'

# Check if authentication requests are processed
curl http://your-server-ip:3000/health/radius/auth-port | jq '.requests'
```

---

## Troubleshooting

### Problem: Ports not accessible

```bash
# Check if ports are listening on server
netstat -tulpn | grep -E ':1812|:1813'

# Verify firewall allows UDP traffic
sudo ufw allow 1812/udp
sudo ufw allow 1813/udp
```

### Problem: User authentication failing

Check:
1. User account is active: `isActive: true`
2. User has a valid plan: `planId` is set
3. Session hasn't expired: `sessionExpiry > now`
4. Password is correct (case-sensitive)

### Problem: No active sessions showing

1. Verify MikroTik is configured correctly
2. Check RADIUS secret matches on both sides
3. Verify users are actually connecting to hotspot
4. Check server logs for RADIUS request handling errors

---

## API Integration

### Environment Variables

Add these to your `.env` file:

```bash
# RADIUS Port Configuration
RADIUS_AUTH_PORT=1812
RADIUS_ACCT_PORT=1813

# Server IP for status endpoints
SERVER_IP=your-actual-server-ip
```

### Monitoring Dashboard Integration

You can create a monitoring dashboard by polling these endpoints:

```javascript
// Example: React hook for monitoring
const [radiusStatus, setRadiusStatus] = useState(null);

useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('http://server-ip:3000/health/radius/status');
    const data = await response.json();
    setRadiusStatus(data);
  }, 60000); // Poll every 60 seconds
  
  return () => clearInterval(interval);
}, []);
```

---

## Summary

✅ **Port 1812** - Authentication & Access Control  
✅ **Port 1813** - Accounting & Session Tracking  
✅ **Voucher System** - Uses username and original password  
✅ **Session Expiry** - Based on purchase time + plan duration  
✅ **Status Pages** - Real-time monitoring and configuration guide  

All endpoints are now accessible at: `http://your-server-ip:3000/health/radius`
