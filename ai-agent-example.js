#!/usr/bin/env node

/**
 * MINIMAL AI Agent Example - Create One Lead
 * 
 * This is the simplest possible example showing how an AI agent
 * should call the MCP server with authentication data.
 * 
 * AI Agent flow:
 * 1. Get auth data from Salesforce OAuth
 * 2. Call this function with that data
 * 3. Done!
 */

import { createLeadWithAIAuth } from './simple-lead-test.js';

/**
 * Example function showing exactly what AI agent needs to do
 */
async function aiAgentCreateLead() {
  // Step 1: AI Agent gets this data from Salesforce OAuth (EXAMPLE - REPLACE WITH REAL CREDENTIALS)
  const authDataFromSalesforceOAuth = {
    "success": true,
    "instanceUrl": "https://orgfarm-a3ae3ef50e-dev-ed.develop.my.salesforce.com",
    "accessToken": "YOUR_REAL_ACCESS_TOKEN_HERE",
    "tokenType": "Bearer", 
    "refreshToken": "YOUR_REAL_REFRESH_TOKEN_HERE",
    "scope": "refresh_token api",
    "authCode": "YOUR_REAL_AUTH_CODE_HERE"
  };

  // Step 2: AI Agent calls MCP function
  try {
    console.log('🤖 AI Agent: Creating lead with MCP...');
    await createLeadWithAIAuth(authDataFromSalesforceOAuth);
    console.log('🤖 AI Agent: Success! Lead created.');
  } catch (error) {
    console.error('🤖 AI Agent: Failed to create lead:', error.message);
  }
}

// IMPORTANT: Replace placeholder credentials with real ones from your AI agent
console.log('⚠️  EXAMPLE FILE: Replace placeholder credentials with real tokens from your AI agent!');
console.log('   The current tokens are placeholders and will not work.');
console.log('   This file demonstrates the expected auth data format.');
console.log('');
console.log('💡 To run the test:');
console.log('   1. Replace "YOUR_REAL_*_HERE" with actual tokens');
console.log('   2. Uncomment the line below');
console.log('   3. Run: node ai-agent-example.js');
console.log('');
console.log('// aiAgentCreateLead().catch(console.error);');
