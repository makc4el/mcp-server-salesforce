import jsforce from 'jsforce';

export interface DynamicSalesforceCredentials {
  instanceUrl: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Creates a Salesforce connection using dynamic credentials provided by AI agents
 * This allows the server to work with multiple orgs dynamically
 * @param credentials Dynamic credentials provided by the AI agent
 * @returns Connected jsforce Connection instance
 */
export async function createDynamicSalesforceConnection(credentials: DynamicSalesforceCredentials) {
  try {
    const { instanceUrl, accessToken, refreshToken, clientId, clientSecret } = credentials;
    
    if (!instanceUrl) {
      throw new Error('instanceUrl is required in credentials');
    }

    console.log('🔗 Creating dynamic Salesforce connection');
    console.log(`   Instance: ${instanceUrl}`);
    console.log(`   Has Access Token: ${!!accessToken}`);
    console.log(`   Has Refresh Token: ${!!refreshToken}`);
    
    // If we have access token, use it directly
    if (accessToken) {
      const conn = new jsforce.Connection({
        instanceUrl: instanceUrl,
        accessToken: accessToken
      });

      // Add refresh token if available for automatic token renewal
      if (refreshToken) {
        conn.refreshToken = refreshToken;
        
        // Set up automatic token refresh if we have client credentials
        if (clientId && clientSecret) {
          conn.clientId = clientId;
          conn.clientSecret = clientSecret;
          
          // Enable automatic refresh
          conn.on('refresh', (accessToken: string, res: any) => {
            console.log('🔄 Token refreshed automatically');
            console.log(`   New token: ${accessToken.substring(0, 20)}...`);
          });
        }
      }

      // Verify connection
      try {
        const identity = await conn.identity();
        console.log(`✅ Dynamic connection successful: ${identity.username}`);
        console.log(`   Org ID: ${identity.organization_id}`);
        return conn;
      } catch (identityError) {
        // If access token is expired and we have refresh token, try to refresh
        if (refreshToken && clientId && clientSecret) {
          console.log('🔄 Access token expired, attempting refresh...');
          
          try {
            conn.refreshToken = refreshToken;
            conn.clientId = clientId;
            conn.clientSecret = clientSecret;
            
            // Force refresh
            await new Promise((resolve, reject) => {
              conn.refresh(refreshToken, (err: any, result: any) => {
                if (err) reject(err);
                else resolve(result);
              });
            });
            
            // Verify refreshed connection
            const identity = await conn.identity();
            console.log(`✅ Connection refreshed successfully: ${identity.username}`);
            return conn;
            
          } catch (refreshError) {
            throw new Error(`Token refresh failed: ${refreshError}`);
          }
        }
        
        throw new Error(`Connection failed - invalid token: ${identityError}`);
      }
    }

    // If no access token but have refresh token, use it to get access token
    if (refreshToken && clientId && clientSecret) {
      console.log('🔄 No access token provided, using refresh token...');
      
      const conn = new jsforce.Connection({
        instanceUrl: instanceUrl,
        refreshToken: refreshToken,
        clientId: clientId,
        clientSecret: clientSecret
      });

      // Get access token using refresh token
      await new Promise((resolve, reject) => {
        conn.refresh(refreshToken, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const identity = await conn.identity();
      console.log(`✅ Connection via refresh token successful: ${identity.username}`);
      return conn;
    }

    throw new Error('Either accessToken or (refreshToken + clientId + clientSecret) must be provided');

  } catch (error) {
    console.error('❌ Error creating dynamic Salesforce connection:', error);
    throw error;
  }
}

/**
 * Validates dynamic credentials format
 */
export function validateDynamicCredentials(credentials: any): credentials is DynamicSalesforceCredentials {
  if (!credentials || typeof credentials !== 'object') {
    return false;
  }

  const { instanceUrl, accessToken, refreshToken, clientId, clientSecret } = credentials;

  // Must have instanceUrl
  if (!instanceUrl || typeof instanceUrl !== 'string') {
    return false;
  }

  // Must have either accessToken OR (refreshToken + clientId + clientSecret)
  const hasAccessToken = accessToken && typeof accessToken === 'string';
  const hasRefreshFlow = refreshToken && clientId && clientSecret &&
                        typeof refreshToken === 'string' && 
                        typeof clientId === 'string' && 
                        typeof clientSecret === 'string';

  return hasAccessToken || hasRefreshFlow;
}

/**
 * Extracts credentials from request headers for AI agent authentication
 */
export function extractCredentialsFromHeaders(headers: any): DynamicSalesforceCredentials | null {
  try {
    // Look for credentials in various header formats
    let credentialsData: any = null;

    // Option 1: JSON in X-Salesforce-Credentials header
    if (headers['x-salesforce-credentials']) {
      credentialsData = JSON.parse(headers['x-salesforce-credentials']);
    }
    
    // Option 2: Individual headers
    else if (headers['x-salesforce-instance-url']) {
      credentialsData = {
        instanceUrl: headers['x-salesforce-instance-url'],
        accessToken: headers['x-salesforce-access-token'],
        refreshToken: headers['x-salesforce-refresh-token'],
        clientId: headers['x-salesforce-client-id'],
        clientSecret: headers['x-salesforce-client-secret']
      };
    }

    // Option 3: Authorization header with Bearer token + instance URL header
    else if (headers.authorization?.startsWith('Bearer ') && headers['x-salesforce-instance-url']) {
      credentialsData = {
        instanceUrl: headers['x-salesforce-instance-url'],
        accessToken: headers.authorization.replace('Bearer ', '')
      };
    }

    if (credentialsData && validateDynamicCredentials(credentialsData)) {
      return credentialsData;
    }

    return null;
  } catch (error) {
    console.error('Error extracting credentials from headers:', error);
    return null;
  }
}
