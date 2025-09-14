# Security Considerations for Deployment

## 🔒 Critical Security Requirements

Your MCP server handles sensitive Salesforce credentials and provides programmatic access to your Salesforce org. Follow these security best practices.

### 🛡️ Environment & Secrets Management

#### ✅ DO:
- **Use environment variables** for all credentials
- **Use secure secret management** (AWS Parameter Store, Railway variables, etc.)
- **Enable API key authentication** in production
- **Use HTTPS only** (disable HTTP in production)
- **Set strong ALLOWED_ORIGINS** (not '*' in production)
- **Use strong, random API keys** (32+ characters)

#### ❌ DON'T:
- Store credentials in code or configuration files
- Use the same API key across environments
- Expose the server without authentication
- Use HTTP in production
- Allow all origins (*) in production

### 🔑 Salesforce Authentication Security

#### Username/Password Method:
```bash
# Use dedicated integration user (not your personal account)
SALESFORCE_USERNAME=integration-user@yourcompany.com
SALESFORCE_PASSWORD=strong-unique-password  
SALESFORCE_TOKEN=regenerated-security-token

# Limit user permissions to minimum required
# Use IP restrictions in Salesforce if possible
```

#### OAuth Client Credentials (Most Secure):
```bash
SALESFORCE_CONNECTION_TYPE=OAuth_2.0_Client_Credentials
SALESFORCE_CLIENT_ID=your-connected-app-id
SALESFORCE_CLIENT_SECRET=your-connected-app-secret
SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com

# Benefits:
# - No passwords to manage
# - Better audit trails  
# - Easier to revoke access
# - Supports IP restrictions
```

### 🌐 Network Security

#### API Key Authentication:
```bash
# Generate strong API key
API_KEY=$(openssl rand -base64 32)

# Use in requests:
curl -H "X-API-Key: your-api-key" https://your-server/tools/salesforce_query_records
```

#### CORS Configuration:
```bash
# Production - specific domains only
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Development - local only  
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Never use '*' in production unless behind authentication
```

#### HTTPS/TLS:
- **Always use HTTPS** in production
- **Use TLS 1.2+** minimum
- **Consider certificate pinning** for high-security environments

### 🏢 Deployment Environment Security

#### Railway/Fly.io/Cloud Platforms:
```bash
# Use their secret management
flyctl secrets set SALESFORCE_PASSWORD=your-password
railway variables:set SALESFORCE_PASSWORD=your-password

# Enable platform security features
# - Two-factor authentication
# - Team access controls  
# - Audit logging
```

#### AWS/Enterprise:
```bash
# Use Parameter Store or Secrets Manager
aws ssm put-parameter --name "/mcp/salesforce/password" \
  --value "your-password" --type "SecureString"

# Use IAM roles and policies
# Restrict network access with Security Groups
# Enable CloudTrail for audit logging
```

### 📊 Monitoring & Alerting

#### Log Security Events:
- Failed authentication attempts
- Unusual API usage patterns
- Salesforce connection errors
- High request volumes

#### Set Up Alerts:
- Multiple failed login attempts
- API key misuse
- Unusual geographic access
- Service availability issues

#### Sample Log Monitoring:
```javascript
// In your monitoring system
const suspiciousPatterns = [
  'INVALID_LOGIN', 
  'Rate limit exceeded',
  'Unauthorized access',
  'Invalid API key'
];
```

### 🔧 Production Hardening

#### Docker Security:
```dockerfile
# Use non-root user
RUN adduser -S mcpuser -u 1001
USER mcpuser

# Minimize attack surface
FROM node:22-alpine  # Minimal base image
RUN apk add --no-cache dumb-init  # Only essential packages
```

#### Resource Limits:
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
```

#### Health Checks:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 🚨 Incident Response

#### If Credentials Are Compromised:
1. **Immediately rotate** Salesforce passwords/tokens
2. **Regenerate API keys** and update clients
3. **Review access logs** for unauthorized usage
4. **Update firewall rules** if needed
5. **Audit Salesforce org** for unauthorized changes

#### Monitoring Checklist:
- [ ] API key authentication enabled
- [ ] HTTPS-only configuration
- [ ] Restrictive CORS policy
- [ ] Strong Salesforce credentials
- [ ] Regular security token rotation
- [ ] Log monitoring configured
- [ ] Alert thresholds set
- [ ] Incident response plan documented

### 📋 Security Review Checklist

Before going to production:

- [ ] No hardcoded credentials in code
- [ ] Environment variables properly secured
- [ ] API key authentication enabled
- [ ] CORS properly restricted
- [ ] HTTPS enforced
- [ ] Monitoring and alerting configured
- [ ] Regular credential rotation planned
- [ ] Incident response procedures documented
- [ ] Team access controls implemented
- [ ] Regular security audits scheduled
