# Simple Lead Creation Flow

## Quick Start

1. **Get fresh authorization code from your login flow**
2. **Run the script with dynamic credentials:**
   ```bash
   node create-lead.js https://your-org.my.salesforce.com your_auth_code_here
   ```

## What Happens

The script automatically:
- ✅ Calls `exchangeUserTokens(userSession)` first
- ✅ Exchanges authorization code for fresh access tokens  
- ✅ Creates Salesforce connection
- ✅ Generates random lead data
- ✅ Creates lead in Salesforce
- ✅ Verifies creation and provides Salesforce link

## Required Environment Variables

These should be static in your `.env` file:
```bash
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret  
```

## Dynamic Arguments (Provided Each Time)

Instance URL and authorization code are now passed as command-line arguments:
```bash
node create-lead.js <instance_url> <auth_code>
```

## Files

- **`create-lead.js`** - Main script (only one you need)
- **`src/utils/connection.ts`** - Updated connection logic with token exchange
- **`multi-user-lead-creator.js`** - Reference implementation (kept for reference)

## Notes

- Authorization codes expire quickly (~10 minutes)
- Instance URL and auth code are now provided as dynamic command-line arguments
- Only client ID/secret need to be configured in environment variables
- Everything else is automatic
