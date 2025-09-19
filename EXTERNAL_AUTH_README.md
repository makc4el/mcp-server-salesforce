# External Authentication Testing

This guide shows how to test the refactored MCP Salesforce server where authentication is handled externally.

## Architecture Change

**Before**: MCP server handled OAuth token exchange internally  
**After**: MCP server only receives pre-obtained access tokens

## Setup

1. **Create `.env` file** with your Salesforce OAuth app credentials:
   ```bash
   SALESFORCE_CLIENT_ID=your_client_id_here
   SALESFORCE_CLIENT_SECRET=your_client_secret_here
   SALESFORCE_REDIRECT_URI=http://localhost:3000/callback
   ```

2. **Update test credentials** in `external-auth-test.js`:
   ```javascript
   const testCredentials = {
     "instanceUrl": "https://your-org.lightning.force.com/",
     "authCode": "your_auth_code_here"
   };
   ```

## Running the Test

```bash
npm run test-external-auth
```

## What the Test Does

1. **External Auth**: Exchanges your authCode for an access token using Salesforce OAuth
2. **Token Format**: Converts the token to the format MCP expects (environment variables)
3. **MCP Test**: Starts MCP server with the token and creates a Lead record
4. **Validation**: Confirms the entire flow works end-to-end

## Expected Output

```
🚀 Starting External Authentication Test
=====================================

🔄 Step 1: Exchanging authorization code for access token
   Instance URL: https://your-org.lightning.force.com/
   OAuth URL: https://your-org.my.salesforce.com/
   Making OAuth request to: https://your-org.my.salesforce.com/services/oauth2/token
✅ Token exchange successful!
   Access Token: 00D...
   Instance URL: https://your-org.my.salesforce.com/
   Token Type: Bearer

🔧 Step 2: Testing MCP server with obtained token
   Starting MCP server: ./dist/index.js
✅ MCP server is ready!

🧪 Step 3: Testing Lead creation via MCP
   Lead data: { "LastName": "TestLead_1234", ... }
   Sending MCP request...

📬 MCP Response received:
✅ Lead creation result:
INSERT operation completed.
Processed 1 records:
- Successful: 1
- Failed: 0

🎉 SUCCESS: External auth + MCP integration working!
   1. Auth code exchanged for access token ✅
   2. MCP server received token via environment variables ✅
   3. Lead record created successfully ✅
```

## How This Differs from Before

### Old Way (Auth in MCP):
```
Client → MCP Server (handles OAuth) → Salesforce
```

### New Way (External Auth):
```
AI Agent → External Auth Service → Access Token → MCP Server → Salesforce
```

## Environment Variables for MCP

The MCP server now expects:
- `SALESFORCE_INSTANCE_URL`: Your Salesforce org URL
- `SALESFORCE_ACCESS_TOKEN`: Valid access token (no refresh logic in MCP)

## Benefits

1. **Separation of Concerns**: Auth logic is separate from business logic
2. **AI Agent Control**: AI agents handle authentication flows
3. **Stateless MCP**: MCP server doesn't manage token storage/refresh
4. **Security**: Tokens have shorter lifecycle, managed externally


