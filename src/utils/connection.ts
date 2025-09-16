import jsforce from 'jsforce';

/**
 * Creates a Salesforce connection using Direct Token authentication
 * This is the only supported authentication method for simplicity and reliability
 * @returns Connected jsforce Connection instance
 */
export async function createSalesforceConnection() {
  try {
    // Get required environment variables
    const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
    const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
    
    if (!instanceUrl || !accessToken) {
      throw new Error(
        'SALESFORCE_INSTANCE_URL and SALESFORCE_ACCESS_TOKEN are required.\n' +
        'Get your token from: sf org display --verbose\n' +
        'Example:\n' +
        '  SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com\n' +
        '  SALESFORCE_ACCESS_TOKEN=your_access_token_here'
      );
    }
    
    console.log('🔗 Connecting to Salesforce using Direct Token authentication');
    console.log(`   Instance: ${instanceUrl}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    
    // Create connection with the provided token and instance URL
    const conn = new jsforce.Connection({
      instanceUrl: instanceUrl,
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