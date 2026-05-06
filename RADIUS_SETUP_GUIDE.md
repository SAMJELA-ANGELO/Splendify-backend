# RADIUS Server Setup Guide

## Overview
This guide explains how to configure MikroTik routers to use the XenFi RADIUS server for hotspot authentication and accounting.

## Prerequisites
- MikroTik RouterOS v6.0 or later
- UDP ports 1812 and 1813 open on your server firewall
- RADIUS secret configured in your router settings

## Step 1: Access Router Management
1. Open WinBox or web interface
2. Connect to your MikroTik router

## Step 2: Configure RADIUS Server
1. Navigate to **IP > Hotspot**
2. Go to **RADIUS** tab
3. Click **+** to add a new RADIUS server:
   - **Address**: Your server IP address
   - **Secret**: The RADIUS secret from your router configuration
   - **Authentication Port**: 1812
   - **Accounting Port**: 1813
   - Check **Hotspot** service

## Step 3: Configure Hotspot Server Profile
1. Go to **IP > Hotspot > Server Profiles**
2. Edit your hotspot server profile (or create a new one)
3. In the **Login** tab:
   - Change **Login By** to `HTTP CHAP`
   - Check **RADIUS** checkbox

## Step 4: Test the Configuration
1. Try connecting to your hotspot with a valid voucher code
2. Check server logs for RADIUS authentication messages
3. Monitor the `/radius/status` endpoint for server status

## RADIUS Attributes Supported

### Authentication Response (Access-Accept)
- **Session-Timeout**: Automatically calculated from user expiry date
- **Mikrotik-Rate-Limit**: Speed limits from user plan (format: "5M/10M")

### Accounting Support
- **Accounting-Start**: Records session start
- **Interim-Update**: Updates data usage every 2-5 minutes
- **Accounting-Stop**: Records session end

## Troubleshooting

### Common Issues
1. **"No response from RADIUS server"**
   - Check if UDP ports 1812/1813 are open
   - Verify server IP address and ports

2. **"Access rejected"**
   - Check user voucher code
   - Verify user is active and not expired
   - Check RADIUS secret matches

3. **Speed limits not applied**
   - Ensure MikroTik-Rate-Limit attribute is supported in your RouterOS version
   - Check plan configuration has download/upload limits

### Debug Commands
```bash
# Check RADIUS server configuration
/ip hotspot radius print

# Monitor RADIUS packets (in terminal)
/radius monitor
```

## Security Notes
- RADIUS secrets are encrypted in the database
- All communication uses shared secrets for authentication
- User voucher codes are used as RADIUS usernames
- Only active, non-expired users can authenticate