# RouterOS API Connection Troubleshooting Guide

## Problem Analysis
The PPPoE Manager application is unable to connect to RouterOS devices due to network connectivity issues. The connection is timing out after 10 seconds, indicating that the application cannot reach the RouterOS API service.

## Common Issues and Solutions

### 1. RouterOS API Service Not Enabled
**Issue**: The RouterOS API service is not enabled on the router.
**Solution**: 
```bash
# Connect to your router via WinBox or Terminal
# Enable the API service
/ip service enable api
# Or enable API-SSL for secure connections
/ip service enable api-ssl
```

### 2. Firewall Blocking API Port
**Issue**: The router's firewall is blocking incoming API connections.
**Solution**:
```bash
# Allow API connections from your network
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept comment="Allow API"
# Or for API-SSL
/ip firewall filter add chain=input protocol=tcp dst-port=8729 action=accept comment="Allow API-SSL"
```

### 3. Incorrect IP Address or Port
**Issue**: The router's IP address or API port is incorrect.
**Solution**:
- Verify the router's IP address
- Check that the API port is correct (default: 8728 for API, 8729 for API-SSL)
- Ensure the router is accessible from the application server

### 4. Network Connectivity Issues
**Issue**: The application server cannot reach the router due to network issues.
**Solution**:
```bash
# Test basic connectivity
ping <router-ip>

# Test port accessibility
telnet <router-ip> 8728
# Or use nc (netcat)
nc -zv <router-ip> 8728
```

### 5. API User Permissions
**Issue**: The API user doesn't have sufficient permissions.
**Solution**:
```bash
# Create a dedicated API user with appropriate permissions
/user add name=apiuser password=apipassword group=full
# Or use existing admin user
```

### 6. RouterOS Version Compatibility
**Issue**: The RouterOS version might not be compatible with the node-routeros library.
**Solution**:
- Ensure RouterOS version is 6.0 or later
- Update RouterOS to the latest stable version

## Step-by-Step Troubleshooting

### Step 1: Verify RouterOS API Service
```bash
# Check if API service is running
/ip service print
# Look for 'api' or 'api-ssl' in the list
```

### Step 2: Test Basic Network Connectivity
```bash
# From the application server, test connectivity
ping <router-ip>
telnet <router-ip> 8728
```

### Step 3: Check RouterOS Configuration
```bash
# Verify API service settings
/ip service print detail
# Check firewall rules
/ip firewall filter print
```

### Step 4: Test with RouterOS Command Line
```bash
# Test API connection from RouterOS itself
/tool fetch url="http://<router-ip>:8728" mode=http
```

### Step 5: Verify Application Configuration
- Check the router configuration in the application
- Ensure correct IP, port, username, and password
- Verify network routing between application server and router

## Alternative Connection Methods

### Using API-SSL (Secure Connection)
If the standard API port (8728) is blocked, try using API-SSL:
```javascript
const conn = new RouterOSAPI({
  host: router.address,
  user: router.apiUsername,
  password: router.apiPassword,
  port: 8729, // API-SSL port
  tls: true   // Enable SSL/TLS
});
```

### Using SSH Tunnel
If direct connection is not possible, use SSH tunnel:
```bash
# Create SSH tunnel
ssh -L 8728:localhost:8728 user@<router-ip>
# Then connect to localhost:8728
```

## RouterOS API Configuration Script

Use this script to properly configure RouterOS for API access:

```bash
# RouterOS API Configuration Script
# Run this on your RouterOS device

# Enable API service
/ip service enable api
/ip service enable api-ssl

# Set API service to listen on all interfaces
/ip service set api address=0.0.0.0/0
/ip service set api-ssl address=0.0.0.0/0

# Create firewall rules to allow API connections
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept comment="Allow API connections"
/ip firewall filter add chain=input protocol=tcp dst-port=8729 action=accept comment="Allow API-SSL connections"

# Create dedicated API user (optional)
/user add name=pppoemanager password=securepassword group=full comment="PPPoE Manager API User"

# Log the configuration
/log info "RouterOS API service configured for PPPoE Manager"

# Display current configuration
/ip service print
/ip firewall filter print
```

## Testing the Connection

After configuring RouterOS, test the connection using the application:

1. **Add a Router**:
   - Navigate to `/routers/new`
   - Enter the router details (IP, username, password, port)
   - Click "Test Connection" before saving

2. **Check Logs**:
   - Monitor the application logs for connection errors
   - Check RouterOS logs for API access attempts

3. **Verify Status**:
   - The router should show "ONLINE" status if connection is successful
   - Check the "Last Checked" timestamp

## Common Error Messages

### "Timed out after 10 seconds"
- **Cause**: Network connectivity issue or router not reachable
- **Solution**: Check network connectivity, firewall rules, and router availability

### "Connection refused"
- **Cause**: API service not running or port blocked
- **Solution**: Enable API service and check firewall rules

### "Authentication failed"
- **Cause**: Incorrect username or password
- **Solution**: Verify credentials and user permissions

### "Permission denied"
- **Cause**: API user lacks necessary permissions
- **Solution**: Grant appropriate permissions to the API user

## Network Diagram

```
[Application Server] ←→ [Network] ←→ [RouterOS Device]
       |                     |              |
       |── API Port 8728 ────┘              |
       |── API-SSL Port 8729 ────────────────┘
       |── SSH Port 22 ──────────────────────┘ (for tunneling)
```

## Support

If you continue to experience issues:
1. Check the RouterOS documentation: https://wiki.mikrotik.com/wiki/Manual:API
2. Verify your network infrastructure
3. Contact your network administrator
4. Check the node-routeros library documentation: https://github.com/johnyher/node-routeros