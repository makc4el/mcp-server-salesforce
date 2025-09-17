import jsforce from 'jsforce';

// Type definitions for user session data
interface UserCallbackData {
  timestamp: string;
  query: {
    code: string;
  };
  headers: {
    host: string;
    referer?: string;
  };
}

interface UserSessionData {
  userId: string;
  instanceUrl: string;
  callbackData: UserCallbackData;
  preferences?: Record<string, any>;
}

class UserSalesforceSession {
  userId: string;
  salesforceInstanceUrl: string;
  callbackData: UserCallbackData;
  userPreferences: Record<string, any>;

  constructor(userData: UserSessionData) {
    this.userId = userData.userId;
    this.salesforceInstanceUrl = userData.instanceUrl;
    this.callbackData = userData.callbackData;
    this.userPreferences = userData.preferences || {};
  }

  getAuthCode(): string {
    if (!this.callbackData || !this.callbackData.query || !this.callbackData.query.code) {
      throw new Error('Invalid callback data - missing authorization code');
    }
    return this.callbackData.query.code;
  }

  getTokenEndpoint(): string {
    return `${this.salesforceInstanceUrl}/services/oauth2/token`;
  }

  getRedirectUri(): string {
    const host = this.callbackData.headers?.host || 'localhost:3000';
    return `http://${host}/callback`;
  }
}

/**
 * Exchange user callback data for OAuth tokens
 * @param userSession - User session containing callback data
 * @returns Token response from Salesforce
 */
async function exchangeUserTokens(userSession: UserSalesforceSession) {
  console.log(`🔄 Exchanging tokens for user: ${userSession.userId}`);
  console.log(`🏢 User's Salesforce org: ${userSession.salesforceInstanceUrl}`);
  
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required for token exchange');
  }

  const tokenPayload = {
    grant_type: 'authorization_code',
    code: userSession.getAuthCode(),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: userSession.getRedirectUri()
  };

  const response = await fetch(userSession.getTokenEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams(tokenPayload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed for user ${userSession.userId}: ${response.status} - ${error}`);
  }

  const tokens = await response.json();
  
  console.log(`✅ Tokens obtained for user: ${userSession.userId}`);
  console.log(`🎯 Access Token: ${tokens.access_token.substring(0, 20)}...`);
  
  return tokens;
}

/**
 * Creates a Salesforce connection using user session data or Direct Token authentication
 * @param userSessionData - Optional user session data for OAuth token exchange
 * @returns Connected jsforce Connection instance
 */
export async function createSalesforceConnection(userSessionData?: UserSessionData) {
  try {
    let instanceUrl: string;
    let accessToken: string;

    if (userSessionData) {
      // Step 1: Exchange user tokens first (as required)
      console.log('🔐 Using user session data for OAuth token exchange');
      const userSession = new UserSalesforceSession(userSessionData);
      const tokens = await exchangeUserTokens(userSession);
      
      // Use tokens from the exchange
      instanceUrl = tokens.instance_url;
      accessToken = tokens.access_token;
      
      console.log('✅ Token exchange completed, proceeding with connection');
    } else {
      // Fallback to direct token authentication
      console.log('🔗 Using Direct Token authentication (fallback)');
      instanceUrl = process.env.SALESFORCE_INSTANCE_URL!;
      accessToken = process.env.SALESFORCE_ACCESS_TOKEN!;
      
      if (!instanceUrl || !accessToken) {
        throw new Error(
          'Either provide userSessionData or set SALESFORCE_INSTANCE_URL and SALESFORCE_ACCESS_TOKEN.\n' +
          'Get your token from: sf org display --verbose\n' +
          'Example:\n' +
          '  SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com\n' +
          '  SALESFORCE_ACCESS_TOKEN=your_access_token_here'
        );
      }
    }
    
    console.log('🔗 Creating Salesforce connection');
    console.log(`   Instance: ${instanceUrl}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    
    // Step 2: Create connection with the obtained token and instance URL
    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
      accessToken: accessToken
    });
    
    // Step 3: Verify connection by getting identity
    try {
      const identity = await conn.identity();
      console.log(`✅ Connected to Salesforce org: ${identity.username}`);
      console.log(`   Org ID: ${identity.organization_id}`);
    } catch (identityError) {
      throw new Error(`Connection failed - invalid token or instance URL: ${identityError}`);
    }
    
    return conn;
  } catch (error) {
    console.error('❌ Error connecting to Salesforce:', error);
    throw error;
  }
}

// Export the types and helper class for external use
export { UserSalesforceSession, exchangeUserTokens };
export type { UserSessionData, UserCallbackData };