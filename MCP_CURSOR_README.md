# Salesforce MCP Server for Cursor AI Agents

This is a **Model Context Protocol (MCP) server** that connects Cursor AI Agents to Salesforce, enabling natural language interactions with your Salesforce data, objects, and Apex code.

## 🚀 Quick Start for Cursor AI Agents

### Option 1: Local MCP Server (Recommended)

**Step 1: Install & Configure**
```bash
npm install -g @tsmztech/mcp-server-salesforce
```

**Step 2: Get Salesforce Credentials**
```bash
# Get access token from Salesforce CLI
sf org display --verbose
# Copy the "Access Token" value
```

**Step 3: Configure Cursor**
Add to your Cursor `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_ACCESS_TOKEN": "00D7V0000004PQP!ARsAQ...",
        "SALESFORCE_INSTANCE_URL": "https://your-org.my.salesforce.com"
      }
    }
  }
}
```

### Option 2: Remote MCP Server (Railway Deployment)

**Deploy to Railway:**
1. [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/salesforce-mcp)
2. Set environment variables in Railway dashboard
3. Connect via HTTP from Cursor

**Railway Environment Variables:**
```bash
SALESFORCE_CLIENT_ID=your_connected_app_consumer_key
SALESFORCE_CLIENT_SECRET=your_connected_app_consumer_secret  
SALESFORCE_REDIRECT_URI=https://your-app.railway.app/callback
API_KEY=your_secure_api_key_for_authentication
```

**Use HTTP MCP in Cursor:**
```json
{
  "mcpServers": {
    "salesforce-remote": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-http-proxy", "https://your-app.railway.app/mcp"],
      "env": {
        "HTTP_PROXY_AUTHORIZATION": "Bearer your_api_key_here"
      }
    }
  }
}
```

## 🛠 Available Tools for AI Agents

### Data Query & Management
- **`salesforce_search_objects`** - Find Salesforce objects by name pattern
- **`salesforce_describe_object`** - Get detailed schema information for any object
- **`salesforce_query_records`** - Query records with relationship support
- **`salesforce_aggregate_query`** - Execute aggregate queries with GROUP BY
- **`salesforce_dml_records`** - Insert, update, delete, or upsert records

### Object & Field Management  
- **`salesforce_manage_object`** - Create or modify custom objects
- **`salesforce_manage_field`** - Add or update custom fields
- **`salesforce_manage_field_permissions`** - Manage field-level security

### Search & Discovery
- **`salesforce_search_all`** - Cross-object SOSL search

### Apex Code Management
- **`salesforce_read_apex`** - Read Apex classes and metadata
- **`salesforce_write_apex`** - Create or update Apex classes  
- **`salesforce_read_apex_trigger`** - Read Apex triggers
- **`salesforce_write_apex_trigger`** - Create or update Apex triggers
- **`salesforce_execute_anonymous`** - Execute anonymous Apex code
- **`salesforce_manage_debug_logs`** - Manage debug logs for users

## 💬 Example AI Agent Prompts

### Data Analysis
```
"Show me all high-value opportunities created this quarter"
"Find all accounts with more than 10 related contacts"  
"What's the average deal size by sales rep this year?"
```

### Object Management
```
"Create a Customer Feedback custom object with Rating and Comments fields"
"Add a Priority picklist field to the Case object"
"Show me all custom fields on the Account object"
```

### Code Development
```
"Create an Apex class to handle lead assignment logic"
"Show me all triggers on the Opportunity object"
"Execute Apex code to bulk update account ratings"
```

### System Administration
```
"Grant the Sales User profile access to the Custom_Score__c field"  
"Enable debug logs for user@example.com"
"Search for 'integration error' across all objects"
```

## 🔐 Authentication Methods

### Method 1: Salesforce CLI (Simplest)
```bash
sf org login web -a myorg
sf org display --verbose -u myorg
# Copy Access Token and Instance URL
```

### Method 2: Connected App (Production)
1. Create Connected App in Salesforce Setup
2. Enable OAuth settings
3. Get Consumer Key/Secret  
4. Implement OAuth flow or use refresh tokens

### Method 3: Direct Token Exchange
Use Salesforce REST API to exchange credentials for access token

## 🚢 Deployment Options

### Local Development
```bash
git clone https://github.com/tsmztech/mcp-server-salesforce.git
cd mcp-server-salesforce
npm install
npm run build

# MCP Mode (for Cursor)
SALESFORCE_ACCESS_TOKEN=your_token SALESFORCE_INSTANCE_URL=your_url npm run mcp

# HTTP Server Mode  
npm run serve
```

### Railway Deployment
1. Connect GitHub repository to Railway
2. Set environment variables
3. Deploy automatically on push
4. Access via HTTPS endpoint

### Docker Deployment
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "serve"]
```

## 🔧 Configuration Reference

### Environment Variables
```bash
# Required for MCP mode
SALESFORCE_ACCESS_TOKEN=your_access_token
SALESFORCE_INSTANCE_URL=https://your-org.my.salesforce.com

# Required for HTTP mode
SALESFORCE_CLIENT_ID=connected_app_consumer_key
SALESFORCE_CLIENT_SECRET=connected_app_consumer_secret
SALESFORCE_REDIRECT_URI=callback_url

# Optional
API_KEY=secure_api_key_for_authentication
PORT=3000
NODE_ENV=production
DEBUG=false
```

### Cursor Configuration Locations
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/storage.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\storage.json`  
- **Linux**: `~/.config/Cursor/User/globalStorage/storage.json`

## 🔍 Troubleshooting

### Common Issues

**"Connection not initialized" error:**
- Verify `SALESFORCE_ACCESS_TOKEN` and `SALESFORCE_INSTANCE_URL` are set
- Check token hasn't expired (typically valid for 2 hours)
- Ensure instance URL format: `https://your-org.my.salesforce.com`

**"Invalid token" error:**
- Refresh your access token using `sf org display --verbose`
- Check Connected App settings in Salesforce
- Verify OAuth scopes include API access

**"Tool not found" error:**  
- Ensure MCP server is running and configured in Cursor
- Check Cursor logs for connection errors
- Verify tool names match exactly (case-sensitive)

### Debug Mode
```bash
DEBUG=true npm run mcp
```

## 📚 Additional Resources

- [MCP Specification](https://modelcontextprotocol.io/docs)
- [Salesforce API Documentation](https://developer.salesforce.com/docs/apis)
- [Cursor AI Documentation](https://cursor.sh/docs)
- [jsforce Documentation](https://jsforce.github.io/)

## 🤝 Contributing

Contributions welcome! See [GitHub repository](https://github.com/tsmztech/mcp-server-salesforce) for issues and pull requests.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
