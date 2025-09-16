# Deployment Guide

## Railway Deployment (Ultra Simple!)

Railway automatically detects and deploys Node.js projects with **ZERO configuration needed**:

```bash
# 1. Connect to Railway
railway login
railway link  # or railway new if creating new project

# 2. Deploy (that's it!)
railway up
```

**That's literally it!** 🎉

Railway will automatically:
- ✅ Detect this is a Node.js project
- ✅ Run `npm ci` to install dependencies
- ✅ Run `npm run build` to compile TypeScript
- ✅ Start with `npm start` 
- ✅ Handle port assignment
- ✅ Set up health checks at `/health`

## Optional: Environment Variables

For production security, you can optionally set:

```bash
# Optional security (recommended for production)
railway variables set API_KEY=your-secret-api-key
railway variables set ALLOWED_ORIGINS=https://your-ai-app.com

# Port is automatically set by Railway, but you can override:
railway variables set PORT=3000
```

## Deployment Verification

After deployment, test your endpoints:

```bash
# Replace with your Railway URL
RAILWAY_URL="https://your-app.railway.app"

# Test health
curl $RAILWAY_URL/health

# Test with AI agent credentials
curl -X POST $RAILWAY_URL/tools/salesforce_search_objects \
  -H "Content-Type: application/json" \
  -H "X-Salesforce-Credentials: {\"instanceUrl\":\"https://your-org.my.salesforce.com\",\"accessToken\":\"your_token\"}" \
  -d '{"searchPattern": "Account"}'
```

## Environment Variables

For production, set these optional variables:

```bash
# Security (recommended)
railway variables set API_KEY=your-secret-api-key
railway variables set ALLOWED_ORIGINS=https://your-ai-app.com

# Server config
railway variables set PORT=3000  # usually not needed, Railway sets this
```

## Troubleshooting

**Build fails with npm ci error:**
- ✅ Fixed! Updated Dockerfile to properly copy package-lock.json
- ✅ Added .dockerignore for cleaner builds

**Health check fails:**
- Verify the app is responding on the correct port
- Check Railway logs: `railway logs`

**No Salesforce credentials error:**
- ✅ Expected! This is dynamic-only mode
- AI agents must provide credentials via headers

## Success Indicators

Your deployment is successful when:

```bash
curl https://your-app.railway.app/health
```

Returns:
```json
{
  "status": "ok",
  "server": "mcp-salesforce-ai-agent-server",
  "mode": "dynamic-only",
  "features": {
    "dynamicCredentials": true,
    "aiAgentCompatible": true,
    "multiTenant": true
  }
}
```

## AI Agent Integration

Share this URL with AI agents:
```
https://your-app.railway.app
```

They can then use it with dynamic credentials:
```javascript
fetch('https://your-app.railway.app/tools/salesforce_query_records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Salesforce-Credentials': JSON.stringify({
      instanceUrl: 'https://client-org.my.salesforce.com',
      accessToken: 'client_access_token_here'
    })
  },
  body: JSON.stringify({
    objectName: 'Lead',
    fields: ['Id', 'Name', 'Email'],
    limit: 10
  })
})
```
