#!/usr/bin/env node

/**
 * Simple Lead Creation Test for AI Agent MCP Integration
 * 
 * This script creates one random lead record using authentication data 
 * provided by an AI agent. The AI agent handles OAuth completely.
 * 
 * Usage: node simple-lead-test.js
 * 
 * Expected AI Agent auth data format:
 * {
 *   "success": true,
 *   "instanceUrl": "https://your-org.my.salesforce.com",
 *   "accessToken": "YOUR_REAL_ACCESS_TOKEN_HERE",
 *   "tokenType": "Bearer",
 *   "refreshToken": "YOUR_REAL_REFRESH_TOKEN_HERE",
 *   "scope": "refresh_token api", 
 *   "authCode": "YOUR_REAL_AUTH_CODE_HERE"
 * }
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Simple test function to create a lead record via MCP
 */
async function testCreateLead(authData) {
  console.log('🚀 Starting Simple Lead Creation Test');
  console.log('====================================\n');
  
  // Validate auth data
  if (!authData || !authData.success || !authData.instanceUrl || !authData.accessToken) {
    throw new Error('Invalid auth data. Expected: { success: true, instanceUrl: "...", accessToken: "..." }');
  }
  
  console.log('✅ AI Agent auth data validated');
  console.log(`   Instance URL: ${authData.instanceUrl}`);
  console.log(`   Access Token: ${authData.accessToken.substring(0, 30)}...`);
  console.log(`   Token Type: ${authData.tokenType || 'Bearer'}`);
  
  return new Promise((resolve, reject) => {
    // Start MCP server
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const mcpServerPath = join(__dirname, 'dist', 'index.js');
    
    console.log('\n🔧 Starting MCP server...');
    
    const mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });
    
    let serverReady = false;
    let responseBuffer = '';
    
    // Handle server startup
    mcpProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`   MCP: ${output.trim()}`);
      
      if (output.includes('Salesforce MCP Server running') && !serverReady) {
        serverReady = true;
        console.log('✅ MCP server ready!\n');
        
        // Generate random lead data
        const randomId = Math.floor(Math.random() * 10000);
        const leadData = {
          LastName: `TestLead_AI_${randomId}`,
          FirstName: 'SimpleTest',
          Company: `AI Test Company ${randomId}`,
          Email: `simple.test.${randomId}@example.com`,
          Phone: `555-${randomId.toString().padStart(4, '0')}`,
          LeadSource: 'AI Agent Test'
        };
        
        console.log('📝 Creating lead with data:');
        console.log(JSON.stringify(leadData, null, 2));
        
        // Create MCP request for lead creation
        const mcpRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "salesforce_dml_records",
            arguments: {
              instanceUrl: authData.instanceUrl,
              accessToken: authData.accessToken,
              operation: "insert",
              objectName: "Lead",
              records: [leadData]
            }
          }
        };
        
        console.log('\n📤 Sending lead creation request to MCP...');
        
        // Send the request
        mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      }
    });
    
    // Handle response
    mcpProcess.stdout.on('data', (data) => {
      responseBuffer += data.toString();
      
      try {
        const lines = responseBuffer.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            const response = JSON.parse(line);
            if (response.id === 1) {
              console.log('\n📬 Received MCP response:');
              
              if (response.error) {
                console.error('❌ Lead creation failed:');
                console.error(JSON.stringify(response.error, null, 2));
                mcpProcess.kill();
                reject(new Error(`MCP Error: ${response.error.message || JSON.stringify(response.error)}`));
                return;
              }
              
              if (response.result && response.result.content) {
                const content = response.result.content[0];
                if (content && content.text) {
                  console.log('✅ Lead creation result:');
                  console.log(content.text);
                  
                  if (content.text.includes('Successful: 1')) {
                    console.log('\n🎉 SUCCESS! Lead record created successfully!');
                    console.log('   ✅ AI Agent provided valid authentication');
                    console.log('   ✅ MCP server processed the request');  
                    console.log('   ✅ Salesforce record created');
                  }
                }
              }
              
              mcpProcess.kill();
              resolve();
              return;
            }
          }
        }
      } catch (e) {
        // Continue collecting data
      }
    });
    
    // Handle errors
    mcpProcess.on('error', (error) => {
      console.error('❌ MCP server error:', error);
      reject(error);
    });
    
    // Timeout
    setTimeout(() => {
      if (!serverReady) {
        mcpProcess.kill();
        reject(new Error('MCP server failed to start within 30 seconds'));
      }
    }, 30000);
    
    setTimeout(() => {
      mcpProcess.kill();
      reject(new Error('Lead creation test timed out'));
    }, 45000);
  });
}

/**
 * Run the test with example data
 */
async function runExampleTest() {
  // Example auth data - replace with real data from your AI agent
  const exampleAuthData = {
    "success": true,
    "instanceUrl": "https://your-org.my.salesforce.com",
    "accessToken": "YOUR_REAL_ACCESS_TOKEN_HERE",
    "tokenType": "Bearer",
    "refreshToken": "YOUR_REAL_REFRESH_TOKEN_HERE",
    "scope": "refresh_token api",
    "authCode": "YOUR_REAL_AUTH_CODE_HERE"
  };
  
  console.log('⚠️  IMPORTANT: The example auth data above is not valid!');
  console.log('   Replace it with real authentication data from your AI agent.');
  console.log('   This script demonstrates the expected format and flow.\n');
  
  // Uncomment the next line when you have real auth data:
  // await testCreateLead(exampleAuthData);
  
  console.log('💡 To use this test:');
  console.log('   1. Get fresh auth data from your AI agent');
  console.log('   2. Call: testCreateLead(authDataFromAI)');
  console.log('   3. Watch the magic happen! 🪄');
}

/**
 * Function to be called by AI agent with real auth data
 */
async function createLeadWithAIAuth(authData) {
  try {
    await testCreateLead(authData);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

// Export for external usage
export { testCreateLead, createLeadWithAIAuth };

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExampleTest().catch(console.error);
}
