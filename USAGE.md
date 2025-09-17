# Simple Lead Creation Flow

## Quick Start

1. **Get fresh authorization code from your login flow**
2. **Add it to .env file:**
   ```bash
   echo "SALESFORCE_AUTH_CODE=your_auth_code_here" >> .env
   ```
3. **Run the script:**
   ```bash
   node create-lead.js
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
SALESFORCE_INSTANCE_URL=your_instance_url
```

## Dynamic Variable (Update Each Time)

```bash
SALESFORCE_AUTH_CODE=fresh_code_from_login_flow
```

## Files

- **`create-lead.js`** - Main script (only one you need)
- **`src/utils/connection.ts`** - Updated connection logic with token exchange
- **`multi-user-lead-creator.js`** - Reference implementation (kept for reference)

## Notes

- Authorization codes expire quickly (~10 minutes)
- You only need to update `SALESFORCE_AUTH_CODE` each time
- Everything else is automatic
