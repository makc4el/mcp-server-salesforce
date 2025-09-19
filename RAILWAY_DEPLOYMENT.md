# 🚄 Railway Deployment Guide for Salesforce MCP Server

This guide provides step-by-step instructions for deploying the Salesforce MCP Server on Railway for remote access.

## 🎯 Overview

Railway deployment allows you to:
- Access the MCP server remotely from anywhere
- Share the Salesforce integration across multiple users/clients  
- Scale automatically based on demand
- Accept tokens and instance URLs from third-party authentication
- Connect from Cursor AI, web applications, or other HTTP clients

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: For repository connection
3. **Third-party authentication system** that provides Salesforce access tokens

## 🛠 Step 1: Prepare for Token-Based Authentication

### Third-Party Authentication Setup

Your authentication system should provide:
- **Access Token**: Valid Salesforce access token
- **Instance URL**: Salesforce org URL (e.g., `https://your-org.my.salesforce.com`)

The MCP server will accept these via:
- HTTP headers for HTTP mode
- Environment variables for local MCP mode

## 🚀 Step 2: Deploy to Railway

### Method A: One-Click Deploy (Recommended)

1. **Click the Deploy Button:**
   [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/nVqzgE)

2. **Configure Repository:**
   - Fork the repository to your GitHub account
   - Connect your GitHub account to Railway

### Method B: Manual Deploy

1. **Fork Repository:**
   ```bash
   # Fork https://github.com/tsmztech/mcp-server-salesforce
   git clone https://github.com/YOUR_USERNAME/mcp-server-salesforce.git
   cd mcp-server-salesforce
   ```

2. **Connect to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your forked repository

## ⚙️ Step 3: Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

### Required Variables
```bash
# Security (Recommended)
API_KEY=your-secure-random-api-key-here

# Application Settings
NODE_ENV=production
```

### Optional Variables
```bash
# CORS Configuration (if connecting from web apps)
ALLOWED_ORIGINS=*

# Debug Settings (for troubleshooting)
DEBUG=false
```

**Note**: `PORT` is automatically set by Railway. No Salesforce credentials needed in environment - they're provided per request.

## 🔗 Step 4: Get Your Railway App URL

1. **Find Your URL:** After deployment, Railway provides a URL like:
   ```
   https://your-app-name.up.railway.app
   ```

2. **Test Deployment:**
   ```bash
   curl https://your-app-name.up.railway.app/health
   ```

## 🎯 Step 5: Connect from Cursor AI

### Option A: HTTP MCP Proxy (Recommended)

Add to your Cursor `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce-railway": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-http-proxy"],
      "env": {
        "MCP_HTTP_URL": "https://your-app-name.up.railway.app/mcp",
        "MCP_HTTP_HEADERS": "X-API-Key:your-secure-api-key-here"
      }
    }
  }
}
```

### Option B: Direct HTTP Requests

For direct HTTP integration with token-based auth:

```bash
# List available tools
curl -X POST https://your-app-name.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Salesforce-Credentials: {\"instanceUrl\":\"https://your-org.my.salesforce.com\",\"accessToken\":\"your_access_token\"}" \
  -d '{"method": "tools/list"}'

# Execute a tool
curl -X POST https://your-app-name.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Salesforce-Credentials: {\"instanceUrl\":\"https://your-org.my.salesforce.com\",\"accessToken\":\"your_access_token\"}" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "salesforce_search_objects",
      "arguments": {"searchPattern": "Account"}
    }
  }'
```

### Option C: Tool Endpoint (Simplified)

```bash
# Execute tool directly  
curl -X POST https://your-app-name.up.railway.app/tools/salesforce_search_objects \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Salesforce-Credentials: {\"instanceUrl\":\"https://your-org.my.salesforce.com\",\"accessToken\":\"your_access_token\"}" \
  -d '{"searchPattern": "Account"}'
```

## 🔐 Step 6: Token-Based Authentication

### Authentication Headers

Your third-party authentication system should provide these credentials for each request:

```bash
# Required headers for each API call
X-API-Key: your-secure-api-key-here
X-Salesforce-Credentials: {
  "instanceUrl": "https://your-org.my.salesforce.com",
  "accessToken": "00D7V0000004PQP!ARsAQ..."
}
```

### Token Requirements

- **Access Token**: Valid Salesforce session ID or OAuth access token
- **Instance URL**: Must include protocol (`https://`) and domain
- **Expiration**: Tokens typically valid for 2 hours (managed by your auth system)

## 📊 Step 7: Monitor Your Deployment

### Railway Dashboard Features:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs  
- **Variables**: Environment configuration
- **Deployments**: Version history and rollbacks

### Health Check Endpoints:
```bash
# Basic health check
GET https://your-app-name.up.railway.app/health

# Readiness check
GET https://your-app-name.up.railway.app/health/ready

# Available tools
GET https://your-app-name.up.railway.app/tools
```

## 🛡️ Security Best Practices

### 1. API Key Protection
```bash
# Generate secure API key
openssl rand -base64 32

# Set in Railway environment
API_KEY=your_generated_secure_key
```

### 2. CORS Configuration
```bash
# Restrict origins for production
ALLOWED_ORIGINS=https://yourdomain.com,https://your-auth-system.com
```

### 3. Environment Separation
- Use different Railway apps for dev/staging/production
- Different API keys per environment
- Your auth system handles org separation

## 🔧 Troubleshooting

### Common Issues

**Deployment Failed:**
```bash
# Check build logs in Railway dashboard
# Ensure all required environment variables are set
# Verify Node.js version compatibility
```

**Connection Refused:**
```bash
# Check if PORT is set correctly (Railway sets automatically)
# Verify health check endpoint returns 200
# Check Railway service logs
```

**Salesforce Authentication Errors:**
```bash
# Validate access token hasn't expired
# Check instance URL format (https://org.my.salesforce.com)
# Verify token has API access permissions
# Ensure X-Salesforce-Credentials header is properly formatted JSON
```

**CORS Errors:**
```bash
# Set ALLOWED_ORIGINS to include your domain
# For development, set ALLOWED_ORIGINS=*
# Check browser developer tools for specific errors
```

### Debug Commands

```bash
# View Railway logs
railway logs

# Test local build
npm run build
npm run serve

# Test with debug enabled
DEBUG=true npm run serve
```

## 📈 Scaling & Performance

### Railway Auto-Scaling:
- Automatic scaling based on CPU/memory usage
- Configure scaling settings in Railway dashboard
- Monitor metrics to optimize resource allocation

### Performance Tips:
```bash
# Enable compression
NODE_ENV=production

# Connection pooling (already configured)
# Caching headers for static content
# Database connection optimization
```

## 🔄 Updates & Maintenance

### Automatic Deployments:
```bash
# Push to main branch triggers auto-deploy
git push origin main

# Or deploy specific branch
railway up --service your-service-name
```

### Environment Updates:
```bash
# Update environment variables
railway variables set SALESFORCE_CLIENT_ID=new_value

# Restart service
railway service restart
```

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Salesforce Connected Apps](https://help.salesforce.com/articleView?id=sf.connected_app_overview.htm)
- [MCP HTTP Transport](https://modelcontextprotocol.io/docs/concepts/transports)
- [OAuth 2.0 Web Server Flow](https://help.salesforce.com/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)

## 🆘 Support

If you encounter issues:

1. **Check Railway Logs**: Dashboard → Service → Logs
2. **Verify Environment Variables**: Dashboard → Variables
3. **Test Health Endpoints**: Use curl or browser
4. **Check Salesforce Setup**: Connected App configuration
5. **Open GitHub Issue**: [Repository Issues](https://github.com/tsmztech/mcp-server-salesforce/issues)

---

## Quick Reference Commands

```bash
# Deploy to Railway
railway up

# Set environment variable
railway variables set API_KEY=your_key

# View logs  
railway logs

# Connect to shell
railway shell

# View service status
railway status
```

That's it! Your Salesforce MCP Server should now be running on Railway and accessible remotely. 🚀
