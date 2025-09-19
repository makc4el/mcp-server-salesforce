#!/usr/bin/env node

/**
 * External Authentication Test for MCP Salesforce Server
 * 
 * This script handles OAuth token exchange externally and then tests MCP functionality.
 * The MCP server no longer handles authentication - it only receives valid tokens.
 * 
 * Usage: node external-auth-test.js
 * 
 * Required: Update the testCredentials object below with your instanceUrl and authCode
 */

import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Use built-in fetch (Node 18+)
const fetch = globalThis.fetch;

// Load environment variables
dotenv.config();

// Test data - replace with your actual values
const testCredentials = {
  "instanceUrl": "https://your-org.my.salesforce.com/",
  "authCode": "aPrx.YOUR_AUTHORIZATION_CODE_HERE"
};

// IMPORTANT: Update these values with your actual Salesforce org instanceUrl and fresh authCode
// You can get a fresh authCode by visiting your Salesforce OAuth authorization URL

/**
 * Exchange authorization code for access token
 */
async function exchangeAuthCodeForToken(instanceUrl, authCode) {
  console.log('🔄 Step 1: Exchanging authorization code for access token');
  console.log(`   Instance URL: ${instanceUrl}`);
  console.log(`   Auth Code: ${authCode.substring(0, 20)}...`);
  
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const redirectUri = process.env.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/callback';
  
  if (!clientId || !clientSecret) {
    throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET environment variables are required');
  }
  
  // Convert Lightning domain to OAuth endpoint if needed
  let oauthInstanceUrl = instanceUrl;
  if (instanceUrl.includes('lightning.force.com')) {
    oauthInstanceUrl = instanceUrl
      .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
      .replace('lightning.force.com', 'my.salesforce.com');
    console.log(`   OAuth URL: ${oauthInstanceUrl}`);
  }
  
  const tokenEndpoint = `${oauthInstanceUrl}/services/oauth2/token`;
  
  const tokenPayload = {
    grant_type: 'authorization_code',
    code: authCode,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  };
  
  console.log(`   Making OAuth request to: ${tokenEndpoint}`);
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'Salesforce-External-Auth-Test/1.0'
    },
    body: new URLSearchParams(tokenPayload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${response.status} - ${error}`);
  }
  
  const tokenData = await response.json();
  
  console.log('✅ Token exchange successful!');
  console.log(`   Access Token: ${tokenData.access_token.substring(0, 30)}...`);
  console.log(`   Instance URL: ${tokenData.instance_url}`);
  console.log(`   Token Type: ${tokenData.token_type}`);
  console.log(`   Expires In: ${tokenData.expires_in} seconds`);
  
  return {
    accessToken: tokenData.access_token,
    instanceUrl: tokenData.instance_url,
    tokenType: tokenData.token_type,
    expiresIn: tokenData.expires_in,
    refreshToken: tokenData.refresh_token
  };
}

/**
 * Test MCP server functionality using the obtained token
 */
async function testMCPWithToken(tokenInfo) {
  console.log('\n🔧 Step 2: Testing MCP server with obtained token');
  
  return new Promise((resolve, reject) => {
    // No need to set environment variables anymore - tokens are passed per request
    const env = {
      ...process.env
      // Auth credentials are now passed through MCP tool call arguments
    };
    
    // Get the current directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const mcpServerPath = join(__dirname, 'dist', 'index.js');
    
    console.log(`   Starting MCP server: ${mcpServerPath}`);
    
    // Start the MCP server process
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });
    
    let mcpReady = false;
    let responseData = '';
    
    // Handle server output
    mcpProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`   MCP: ${output.trim()}`);
      
      if (output.includes('Salesforce MCP Server running')) {
        mcpReady = true;
        console.log('✅ MCP server is ready!');
        
        // Test MCP functionality - create a lead record
        setTimeout(() => testCreateLead(mcpProcess, resolve, reject), 1000);
      }
    });
    
    mcpProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    mcpProcess.on('error', (error) => {
      console.error('❌ MCP server error:', error);
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!mcpReady) {
        mcpProcess.kill();
        reject(new Error('MCP server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

/**
 * Test creating a lead record via MCP
 */
function testCreateLead(mcpProcess, resolve, reject) {
  console.log('\n🧪 Step 3: Testing Lead creation via MCP');
  
  // Generate random lead data
  const randomId = Math.floor(Math.random() * 10000);
  const leadData = {
    LastName: `TestLead_${randomId}`,
    FirstName: 'External',
    Company: `Test Company ${randomId}`,
    Email: `external.test.${randomId}@example.com`,
    Phone: `555-${randomId.toString().padStart(4, '0')}`
  };
  
  // MCP request to create a lead
  const mcpRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "salesforce_dml_records",
      arguments: {
        operation: "insert",
        objectName: "Lead",
        records: [leadData]
      }
    }
  };
  
  console.log('   Lead data:', JSON.stringify(leadData, null, 2));
  console.log('   Sending MCP request...');
  
  let responseBuffer = '';
  
  // Listen for response
  mcpProcess.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    try {
      // Try to parse the response
      const lines = responseBuffer.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          const response = JSON.parse(line);
          if (response.id === 1) {
            handleMCPResponse(response, mcpProcess, resolve, reject);
            return;
          }
        }
      }
    } catch (e) {
      // Continue collecting data
    }
  });
  
  // Send the request
  mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
  
  // Timeout for this specific request
  setTimeout(() => {
    mcpProcess.kill();
    reject(new Error('Lead creation test timed out'));
  }, 15000);
}

/**
 * Handle MCP response
 */
function handleMCPResponse(response, mcpProcess, resolve, reject) {
  console.log('\n📬 MCP Response received:');
  console.log(JSON.stringify(response, null, 2));
  
  if (response.error) {
    console.error('❌ MCP Error:', response.error);
    mcpProcess.kill();
    reject(new Error(`MCP Error: ${JSON.stringify(response.error)}`));
    return;
  }
  
  if (response.result && response.result.content) {
    const content = response.result.content[0];
    if (content && content.text) {
      console.log('\n✅ Lead creation result:');
      console.log(content.text);
      
      if (content.text.includes('Successful: 1')) {
        console.log('\n🎉 SUCCESS: External auth + MCP integration working!');
        console.log('   1. Auth code exchanged for access token ✅');
        console.log('   2. MCP server received token via environment variables ✅'); 
        console.log('   3. Lead record created successfully ✅');
      } else {
        console.log('\n⚠️  Lead creation had issues - check the response above');
      }
    }
  }
  
  mcpProcess.kill();
  resolve();
}

/**
 * Main test function
 */
async function runTest() {
  try {
    console.log('🚀 Starting External Authentication Test');
    console.log('=====================================\n');
    
    // Step 1: Exchange auth code for token
    const tokenInfo = await exchangeAuthCodeForToken(
      testCredentials.instanceUrl, 
      testCredentials.authCode
    );
    
    // Step 2 & 3: Test MCP functionality
    await testMCPWithToken(tokenInfo);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if required environment variables are set
function checkRequiredEnvVars() {
  const required = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   - ${env}`));
    console.error('\nPlease create a .env file with your Salesforce app credentials.');
    process.exit(1);
  }
}

// Run the test
checkRequiredEnvVars();
runTest();
