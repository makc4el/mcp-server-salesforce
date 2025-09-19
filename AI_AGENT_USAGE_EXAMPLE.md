# AI Agent MCP Integration - Usage Example

This example shows how an AI agent can use the MCP Salesforce server with pre-obtained authentication credentials.

## How It Works

1. **AI Agent handles OAuth** - Gets tokens from Salesforce
2. **AI Agent calls MCP tools** - Passes tokens with each request
3. **MCP server executes** - Uses provided tokens for Salesforce operations

## Simple Lead Creation Test

The `simple-lead-test.js` file provides a minimal test that creates one random lead record.

### AI Agent Usage Pattern

```javascript
import { createLeadWithAIAuth } from './simple-lead-test.js';

// AI Agent obtains auth data from Salesforce OAuth
const authDataFromSalesforce = {
  "success": true,
  "instanceUrl": "https://your-org.develop.my.salesforce.com", 
  "accessToken": "00D...your-access-token",
  "tokenType": "Bearer",
  "refreshToken": "5Ae...your-refresh-token",
  "scope": "refresh_token api",
  "authCode": "aPr...your-auth-code"
};

// AI Agent calls the test function
try {
  await createLeadWithAIAuth(authDataFromSalesforce);
  console.log('✅ Lead created successfully!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
```

### Direct MCP Tool Usage

For direct tool usage, AI agents can also call MCP tools directly:

```javascript
import { spawn } from 'child_process';

// Start MCP server
const mcpProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send MCP request with auth data
const mcpRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call", 
  params: {
    name: "salesforce_dml_records",
    arguments: {
      instanceUrl: "https://your-org.my.salesforce.com",
      accessToken: "your-access-token",
      operation: "insert",
      objectName: "Lead", 
      records: [
        {
          LastName: "TestLead",
          FirstName: "AI",
          Company: "AI Test Company",
          Email: "ai.test@example.com"
        }
      ]
    }
  }
};

mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
```

## Available MCP Tools

All tools require `instanceUrl` and `accessToken` in their arguments:

- `salesforce_search_objects` - Search for Salesforce objects
- `salesforce_describe_object` - Get object metadata  
- `salesforce_query_records` - Query records with SOQL
- `salesforce_aggregate_query` - Aggregate queries with GROUP BY
- `salesforce_dml_records` - Insert/Update/Delete records
- `salesforce_search_all` - SOSL search across multiple objects
- `salesforce_read_apex` - Read Apex classes
- `salesforce_write_apex` - Write/Deploy Apex classes
- `salesforce_read_apex_trigger` - Read Apex triggers
- `salesforce_write_apex_trigger` - Write/Deploy Apex triggers
- `salesforce_execute_anonymous` - Execute anonymous Apex code
- `salesforce_manage_debug_logs` - Manage debug logs
- `salesforce_manage_object` - Create/Modify custom objects
- `salesforce_manage_field` - Create/Modify custom fields
- `salesforce_manage_field_permissions` - Manage field permissions

## Expected Auth Data Format

```typescript
interface AIAgentAuthData {
  success: true;
  instanceUrl: string;     // Required - Salesforce org URL
  accessToken: string;     // Required - Valid access token
  tokenType: string;       // Optional - defaults to "Bearer"
  refreshToken?: string;   // Optional - for token refresh
  scope?: string;          // Optional - token scope
  authCode?: string;       // Optional - original auth code
}
```

## Benefits of This Approach

1. **🔒 Security**: Tokens are short-lived and managed by AI agent
2. **🎯 Separation**: Auth logic separate from business logic
3. **⚡ Performance**: No OAuth overhead in MCP server
4. **🔄 Stateless**: MCP server doesn't store any auth state
5. **🤖 AI Control**: AI agent has full control over authentication flow

## Running the Test

```bash
# With real auth data from your AI agent
node simple-lead-test.js

# Or import and use programmatically
import { createLeadWithAIAuth } from './simple-lead-test.js';
await createLeadWithAIAuth(yourAuthData);
```

The test will:
1. ✅ Validate the auth data
2. 🚀 Start the MCP server  
3. 📝 Generate random lead data
4. 📤 Send creation request
5. 🎉 Confirm successful creation
