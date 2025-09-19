#!/usr/bin/env node

// Multi-User Salesforce Lead Creator
// Supports dynamic users with their own Salesforce orgs

import { config } from 'dotenv';
config();

// ================================================================
// STATIC DATA (FROM .ENV) - Shared across all users
// ================================================================
const SHARED_CONFIG = {
  // Your app's Connected App credentials (same for all users)
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  
  // Your app configuration
  defaultRedirectUri: process.env.DEFAULT_REDIRECT_URI || 'http://localhost:3000/callback',
  appPort: process.env.PORT || 3000,
  
  // Optional: API versioning
  salesforceApiVersion: process.env.SALESFORCE_API_VERSION || 'v60.0'
};

// ================================================================
// DYNAMIC DATA (PROVIDED BY USER) - Per user/org specific
// ================================================================
class UserSalesforceSession {
  constructor(userData) {
    // USER-SPECIFIC DATA REQUIRED:
    this.userId = userData.userId;                    // Your app's user ID
    this.salesforceInstanceUrl = userData.instanceUrl; // User's Salesforce org URL
    this.callbackData = userData.callbackData;        // User's OAuth callback data
    this.userPreferences = userData.preferences || {};
  }

  // Extract auth code from user's callback data
  getAuthCode() {
    if (!this.callbackData || !this.callbackData.query || !this.callbackData.query.code) {
      throw new Error('Invalid callback data - missing authorization code');
    }
    return this.callbackData.query.code;
  }

  // Get user's token endpoint
  getTokenEndpoint() {
    return `${this.salesforceInstanceUrl}/services/oauth2/token`;
  }

  // Get user's redirect URI (from their callback data)
  getRedirectUri() {
    const host = this.callbackData.headers?.host || 'localhost:3000';
    return `http://${host}/callback`;
  }
}

// ================================================================
// OAUTH TOKEN EXCHANGE (User-specific)
// ================================================================
async function exchangeUserTokens(userSession) {
  console.log(`🔄 Exchanging tokens for user: ${userSession.userId}`);
  console.log(`🏢 User's Salesforce org: ${userSession.salesforceInstanceUrl}`);
  
  const tokenPayload = {
    grant_type: 'authorization_code',
    code: userSession.getAuthCode(),
    client_id: SHARED_CONFIG.clientId,        // ← FROM .ENV (shared)
    client_secret: SHARED_CONFIG.clientSecret, // ← FROM .ENV (shared)
    redirect_uri: userSession.getRedirectUri() // ← FROM USER DATA
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

// ================================================================
// LEAD CREATION (User-specific with their tokens)
// ================================================================
async function createLeadForUser(userSession, leadData, accessToken) {
  console.log(`🔨 Creating lead for user: ${userSession.userId}`);
  
  const createUrl = `${userSession.salesforceInstanceUrl}/services/data/${SHARED_CONFIG.salesforceApiVersion}/sobjects/Lead/`;
  
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leadData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lead creation failed for user ${userSession.userId}: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Lead created for user ${userSession.userId}: ${result.id}`);
  
  return result;
}

// ================================================================
// MAIN FUNCTION - Multi-user lead creation
// ================================================================
async function processUserLeadCreation(userData, leadData) {
  console.log('\n🚀 Multi-User Salesforce Lead Creation');
  console.log('======================================');
  
  try {
    // 1. Create user session with their data
    const userSession = new UserSalesforceSession(userData);
    
    // 2. Exchange their callback for tokens
    const tokens = await exchangeUserTokens(userSession);
    
    // 3. Create lead in their Salesforce org
    const leadResult = await createLeadForUser(userSession, leadData, tokens.access_token);
    
    // 4. Return success result
    return {
      success: true,
      userId: userSession.userId,
      leadId: leadResult.id,
      salesforceUrl: `${userSession.salesforceInstanceUrl}/lightning/r/Lead/${leadResult.id}/view`,
      tokens: {
        accessToken: tokens.access_token.substring(0, 20) + '...',
        refreshToken: tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : null,
        instanceUrl: tokens.instance_url
      }
    };
    
  } catch (error) {
    console.error(`❌ Failed to process user ${userData.userId}:`, error.message);
    
    return {
      success: false,
      userId: userData.userId,
      error: error.message
    };
  }
}

// ================================================================
// EXAMPLE USAGE
// ================================================================
console.log('📋 MULTI-USER CONFIGURATION BREAKDOWN');
console.log('=====================================\n');

console.log('🔧 STATIC DATA (FROM .ENV) - Shared across all users:');
console.log('-------------------------------------------------------');
console.log('✅ SALESFORCE_CLIENT_ID     - Your Connected App Consumer Key');
console.log('✅ SALESFORCE_CLIENT_SECRET - Your Connected App Consumer Secret');
console.log('✅ DEFAULT_REDIRECT_URI     - Your app\'s callback URL');
console.log('✅ PORT                     - Your app server port');
console.log('✅ SALESFORCE_API_VERSION   - API version to use');

console.log('\n📊 DYNAMIC DATA (PROVIDED BY USER) - Per user/org:');
console.log('---------------------------------------------------');
console.log('❗ userId                   - Your app\'s user identifier');
console.log('❗ instanceUrl              - User\'s Salesforce org URL');
console.log('❗ callbackData             - User\'s OAuth callback data');
console.log('❗ preferences              - User-specific settings (optional)');

console.log('\n🎯 EXAMPLE USER DATA STRUCTURE:');
console.log('--------------------------------');

const exampleUserData = {
  userId: 'user_12345',
  instanceUrl: 'https://user-org.my.salesforce.com', // ← USER'S ORG
  callbackData: {
    timestamp: '2025-09-16T22:12:35.304Z',
    query: {
      code: 'aPrx.ppuB8UlvcFDyjAB7jdDs8YwZyVMdC2CIxMktZEpr0pIC8jKGkMaWxwdC24A1rsmob2KlA=='
    },
    headers: {
      host: 'localhost:3000',
      referer: 'https://user-org.my.salesforce.com/' // ← USER'S ORG
    }
  },
  preferences: {
    defaultLeadSource: 'Web',
    timezone: 'America/New_York'
  }
};

console.log(JSON.stringify(exampleUserData, null, 2));

console.log('\n🚀 INTEGRATION SUMMARY:');
console.log('========================');
console.log('1. User logs into YOUR app');
console.log('2. User goes through OAuth flow with THEIR Salesforce org');
console.log('3. Your app captures THEIR callback data');
console.log('4. You call processUserLeadCreation() with USER data + lead data');
console.log('5. System uses SHARED credentials but connects to USER\'s org');
console.log('6. Lead is created in USER\'s Salesforce org');

console.log('\n✨ This enables unlimited users, each with their own Salesforce org!');

// Export for use in other modules
export { processUserLeadCreation, UserSalesforceSession, SHARED_CONFIG };
