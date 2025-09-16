# AI Agent Integration Guide

## Overview

This Salesforce MCP Server supports **dynamic configuration**, allowing AI agents to connect to different Salesforce orgs by providing credentials at runtime. This enables multi-tenant usage where each AI agent can work with its own Salesforce org.

## Deployment

### Railway Deployment (Recommended)

1. **Deploy to Railway:**
   ```bash
   # Connect your repo to Railway
   railway login
   railway link
   railway up
   ```

2. **Set optional environment variables:**
   ```bash
   # Optional: Default credentials (fallback)
   railway variables set SALESFORCE_INSTANCE_URL=https://your-org.my.salesforce.com
   railway variables set SALESFORCE_ACCESS_TOKEN=your_default_token
   
   # Optional: API security
   railway variables set API_KEY=your_secret_api_key
   railway variables set ALLOWED_ORIGINS=https://your-app.com
   
   # Server config
   railway variables set PORT=3000
   ```

3. **Get your deployment URL:**
   ```
   https://your-app.railway.app
   ```

## AI Agent Usage

### Method 1: JSON Credentials Header (Recommended)

```javascript
// AI Agent HTTP request
const response = await fetch('https://your-app.railway.app/tools/salesforce_query_records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Salesforce-Credentials': JSON.stringify({
      instanceUrl: 'https://client-org.my.salesforce.com',
      accessToken: 'client_access_token_here',
      // Optional: for automatic token refresh
      refreshToken: 'client_refresh_token_here',
      clientId: 'client_connected_app_id',
      clientSecret: 'client_connected_app_secret'
    })
  },
  body: JSON.stringify({
    objectName: 'Lead',
    fields: ['Id', 'Name', 'Email'],
    limit: 10
  })
});
```

### Method 2: Individual Headers

```javascript
const response = await fetch('https://your-app.railway.app/tools/salesforce_dml_records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Salesforce-Instance-Url': 'https://client-org.my.salesforce.com',
    'X-Salesforce-Access-Token': 'client_access_token_here',
    'X-Salesforce-Refresh-Token': 'client_refresh_token_here',
    'X-Salesforce-Client-Id': 'client_connected_app_id',
    'X-Salesforce-Client-Secret': 'client_connected_app_secret'
  },
  body: JSON.stringify({
    operation: 'insert',
    objectName: 'Lead',
    records: [{
      FirstName: 'AI',
      LastName: 'Generated',
      Company: 'AI Corp',
      Email: 'ai@example.com'
    }]
  })
});
```

### Method 3: Bearer Token (Simple)

```javascript
const response = await fetch('https://your-app.railway.app/tools/salesforce_search_objects', {
  method: 'POST', 
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer client_access_token_here',
    'X-Salesforce-Instance-Url': 'https://client-org.my.salesforce.com'
  },
  body: JSON.stringify({
    searchPattern: 'Account'
  })
});
```

## API Endpoints

### Connection Testing

**Test AI Agent Credentials:**
```bash
curl -X POST https://your-app.railway.app/ai-agent/test-connection \
  -H "Content-Type: application/json" \
  -H "X-Salesforce-Credentials: {\"instanceUrl\":\"https://your-org.my.salesforce.com\",\"accessToken\":\"your_token\"}"
```

**Validate Credentials Format:**
```bash
curl -X POST https://your-app.railway.app/ai-agent/validate-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "instanceUrl": "https://your-org.my.salesforce.com",
    "accessToken": "your_access_token_here"
  }'
```

### Salesforce Operations

All standard MCP tools work with dynamic credentials:

- **Query Records:** `POST /tools/salesforce_query_records`
- **Create/Update/Delete:** `POST /tools/salesforce_dml_records`  
- **Search Objects:** `POST /tools/salesforce_search_objects`
- **Describe Objects:** `POST /tools/salesforce_describe_object`
- **Aggregate Queries:** `POST /tools/salesforce_aggregate_query`
- **Apex Operations:** `POST /tools/salesforce_execute_anonymous`
- **And 10+ more tools...**

**List all tools:**
```bash
curl https://your-app.railway.app/tools
```

## MCP Client Integration

For MCP clients (like Claude Desktop), you can still use static configuration:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "SALESFORCE_INSTANCE_URL": "https://your-org.my.salesforce.com",
        "SALESFORCE_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

Or point to your deployed server:

```json
{
  "mcpServers": {
    "salesforce-remote": {
      "command": "curl",
      "args": ["-X", "POST", "https://your-app.railway.app/tools/"],
      "env": {
        "SALESFORCE_HEADERS": "X-Salesforce-Instance-Url: https://your-org.my.salesforce.com"
      }
    }
  }
}
```

## Security Considerations

1. **Use HTTPS:** Always use HTTPS for production deployments
2. **API Keys:** Set `API_KEY` environment variable for additional security
3. **CORS:** Configure `ALLOWED_ORIGINS` to limit access
4. **Token Security:** AI agents should securely store and transmit tokens
5. **Refresh Tokens:** Use refresh tokens for long-running applications

## Error Handling

The server provides detailed error messages:

```javascript
{
  "success": false,
  "error": "Connection failed - invalid token",
  "timestamp": "2025-09-16T13:30:00.000Z"
}
```

Common errors:
- `No dynamic credentials provided` - Missing headers
- `Connection failed - invalid token` - Token expired/invalid  
- `Invalid credentials format` - Malformed credential structure

## Multi-Tenant Architecture

```
AI Agent 1 → [Dynamic Creds for Org A] → Railway Server → Salesforce Org A
AI Agent 2 → [Dynamic Creds for Org B] → Railway Server → Salesforce Org B  
AI Agent 3 → [Dynamic Creds for Org C] → Railway Server → Salesforce Org C
```

Each request can use different Salesforce org credentials, enabling true multi-tenancy.

## Example: Complete AI Agent Integration

```javascript
class SalesforceAgent {
  constructor(serverUrl, salesforceCredentials) {
    this.serverUrl = serverUrl;
    this.credentials = salesforceCredentials;
  }

  async makeRequest(tool, args) {
    const response = await fetch(`${this.serverUrl}/tools/${tool}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Salesforce-Credentials': JSON.stringify(this.credentials)
      },
      body: JSON.stringify(args)
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  async queryLeads() {
    return await this.makeRequest('salesforce_query_records', {
      objectName: 'Lead',
      fields: ['Id', 'Name', 'Email', 'Company'],
      limit: 50
    });
  }

  async createLead(leadData) {
    return await this.makeRequest('salesforce_dml_records', {
      operation: 'insert',
      objectName: 'Lead',
      records: [leadData]
    });
  }
}

// Usage
const agent = new SalesforceAgent('https://your-app.railway.app', {
  instanceUrl: 'https://client-org.my.salesforce.com',
  accessToken: 'client_token_here'
});

const leads = await agent.queryLeads();
console.log('Found leads:', leads);
```

## Next Steps

1. Deploy to Railway using the provided configuration
2. Test with the `/ai-agent/test-connection` endpoint
3. Integrate into your AI agent with dynamic credentials
4. Scale to support multiple Salesforce orgs simultaneously!
