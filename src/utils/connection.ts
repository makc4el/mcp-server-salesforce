import jsforce from 'jsforce';

// Simplified credentials interface - MCP only needs these two values
interface SalesforceCredentials {
  instanceUrl: string;
  accessToken: string;
}

/**
 * Creates a simplified Salesforce connection using pre-obtained access token
 * Auth logic is handled externally - MCP only receives valid tokens
 * @param credentials - instanceUrl and accessToken (both required)
 * @returns Connected jsforce Connection instance
 */
export async function createSalesforceConnection(credentials: SalesforceCredentials) {
  try {
    const { instanceUrl, accessToken } = credentials;
    
    if (!instanceUrl || !accessToken) {
      throw new Error(
        'Both instanceUrl and accessToken are required. ' +
        'Authentication must be handled externally.'
      );
    }
    
    console.log('🔗 Creating Salesforce connection with provided credentials');
    console.log(`   Instance: ${instanceUrl}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    
    // Normalize instance URL - convert Lightning URLs to proper Salesforce instance URLs
    let normalizedInstanceUrl = instanceUrl;
    if (instanceUrl.includes('lightning.force.com')) {
      normalizedInstanceUrl = instanceUrl
        .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
        .replace('lightning.force.com', 'my.salesforce.com');
      console.log(`🔄 Converted Lightning URL to proper instance URL: ${normalizedInstanceUrl}`);
    }
    
    const conn = new jsforce.Connection({
      instanceUrl: normalizedInstanceUrl,
      accessToken: accessToken
    });
    
    // Verify connection by getting identity
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

// Export the simplified type
export type { SalesforceCredentials };