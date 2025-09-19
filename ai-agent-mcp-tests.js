#!/usr/bin/env node

/**
 * AI Agent MCP Tests for Salesforce Server
 * 
 * This script tests all MCP tools using authentication data provided by an AI agent.
 * The AI agent handles OAuth and provides instanceUrl, accessToken, etc.
 * 
 * Usage: node ai-agent-mcp-tests.js
 * 
 * The AI agent should provide auth data in this format:
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

// Test configuration
const CONFIG = {
  timeout: 30000,
  mcpServerPath: null, // Will be set dynamically
  testAll: true, // Set to false to test specific tools only
  specificTools: [], // List of specific tools to test if testAll is false
};

/**
 * AI Agent Authentication Data Handler
 * Accepts the authentication data provided by the AI agent
 */
class AIAgentAuthHandler {
  constructor(authData) {
    if (!authData || !authData.success) {
      throw new Error('Invalid auth data provided by AI agent');
    }
    
    this.instanceUrl = authData.instanceUrl;
    this.accessToken = authData.accessToken;
    this.tokenType = authData.tokenType || 'Bearer';
    this.refreshToken = authData.refreshToken;
    this.scope = authData.scope;
    this.authCode = authData.authCode;
    
    this.validate();
  }
  
  validate() {
    if (!this.instanceUrl || !this.accessToken) {
      throw new Error('instanceUrl and accessToken are required from AI agent auth data');
    }
    
    console.log('✅ AI Agent Auth Data Validated');
    console.log(`   Instance URL: ${this.instanceUrl}`);
    console.log(`   Access Token: ${this.accessToken.substring(0, 30)}...`);
    console.log(`   Token Type: ${this.tokenType}`);
    console.log(`   Scope: ${this.scope}`);
  }
  
  getCredentials() {
    return {
      instanceUrl: this.instanceUrl,
      accessToken: this.accessToken
    };
  }
}

/**
 * MCP Tool Test Framework
 */
class MCPToolTester {
  constructor(authHandler) {
    this.authHandler = authHandler;
    this.mcpProcess = null;
    this.testResults = new Map();
    this.currentRequestId = 1;
  }
  
  async startMCPServer() {
    return new Promise((resolve, reject) => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const mcpServerPath = join(__dirname, 'dist', 'index.js');
      CONFIG.mcpServerPath = mcpServerPath;
      
      console.log('🚀 Starting MCP server...');
      console.log(`   Server path: ${mcpServerPath}`);
      
      this.mcpProcess = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });
      
      let serverReady = false;
      
      this.mcpProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`   MCP: ${output.trim()}`);
        
        if (output.includes('Salesforce MCP Server running')) {
          serverReady = true;
          console.log('✅ MCP server is ready!');
          resolve();
        }
      });
      
      this.mcpProcess.on('error', (error) => {
        console.error('❌ MCP server error:', error);
        reject(error);
      });
      
      // Timeout
      setTimeout(() => {
        if (!serverReady) {
          this.mcpProcess?.kill();
          reject(new Error('MCP server failed to start within timeout'));
        }
      }, CONFIG.timeout);
    });
  }
  
  async sendMCPRequest(toolName, toolArgs) {
    return new Promise((resolve, reject) => {
      const requestId = this.currentRequestId++;
      
      // Add auth credentials to tool arguments
      const credentials = this.authHandler.getCredentials();
      const mcpRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: {
            ...credentials,
            ...toolArgs
          }
        }
      };
      
      console.log(`📤 Sending request for ${toolName}...`);
      
      let responseBuffer = '';
      let responseReceived = false;
      
      const dataHandler = (data) => {
        responseBuffer += data.toString();
        
        try {
          const lines = responseBuffer.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.trim().startsWith('{')) {
              const response = JSON.parse(line);
              if (response.id === requestId && !responseReceived) {
                responseReceived = true;
                this.mcpProcess.stdout.off('data', dataHandler);
                resolve(response);
                return;
              }
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };
      
      this.mcpProcess.stdout.on('data', dataHandler);
      
      // Send the request
      this.mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      
      // Request timeout
      setTimeout(() => {
        if (!responseReceived) {
          this.mcpProcess.stdout.off('data', dataHandler);
          reject(new Error(`Request timeout for ${toolName}`));
        }
      }, 15000);
    });
  }
  
  stopMCPServer() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      console.log('🛑 MCP server stopped');
    }
  }
}

/**
 * Individual Tool Test Functions
 * Each function tests a specific MCP tool with appropriate test data
 */
class ToolTests {
  static async testSearchObjects(tester) {
    console.log('\n🔍 Testing: salesforce_search_objects');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_search_objects', {
        searchPattern: 'Account'
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Search Objects test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Search Objects test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testDescribeObject(tester) {
    console.log('\n📋 Testing: salesforce_describe_object');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_describe_object', {
        objectName: 'Account'
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Describe Object test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Describe Object test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testQueryRecords(tester) {
    console.log('\n📊 Testing: salesforce_query_records');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_query_records', {
        objectName: 'Account',
        selectFields: ['Id', 'Name'],
        limit: 5
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Query Records test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Query Records test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testAggregateQuery(tester) {
    console.log('\n📈 Testing: salesforce_aggregate_query');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_aggregate_query', {
        objectName: 'Account',
        selectFields: ['Type', 'COUNT(Id) AccountCount'],
        groupByFields: ['Type']
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Aggregate Query test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Aggregate Query test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testDMLRecords(tester) {
    console.log('\n✏️  Testing: salesforce_dml_records (INSERT)');
    
    const randomId = Math.floor(Math.random() * 10000);
    const testData = {
      LastName: `TestLead_AI_${randomId}`,
      FirstName: 'AI Agent',
      Company: `AI Test Company ${randomId}`,
      Email: `ai.agent.test.${randomId}@example.com`,
      Phone: `555-${randomId.toString().padStart(4, '0')}`
    };
    
    try {
      const response = await tester.sendMCPRequest('salesforce_dml_records', {
        operation: 'insert',
        objectName: 'Lead',
        records: [testData]
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ DML Records test passed');
      console.log('   Test Lead created:', JSON.stringify(testData, null, 2));
      return { success: true, response };
    } catch (error) {
      console.error('❌ DML Records test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testSearchAll(tester) {
    console.log('\n🔍 Testing: salesforce_search_all');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_search_all', {
        searchTerm: 'Test',
        objects: [
          { name: 'Account', fields: ['Name'], limit: 3 },
          { name: 'Contact', fields: ['FirstName', 'LastName'], limit: 3 }
        ]
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Search All test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Search All test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testReadApex(tester) {
    console.log('\n📖 Testing: salesforce_read_apex');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_read_apex', {
        namePattern: '*',
        includeMetadata: true
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Read Apex test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Read Apex test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testExecuteAnonymous(tester) {
    console.log('\n⚡ Testing: salesforce_execute_anonymous');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_execute_anonymous', {
        apexCode: 'System.debug(\'AI Agent MCP Test - Hello from Anonymous Apex!\'); List<Account> accounts = [SELECT Id FROM Account LIMIT 1]; System.debug(\'Found \' + accounts.size() + \' accounts\');',
        logLevel: 'DEBUG'
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Execute Anonymous test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Execute Anonymous test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  static async testReadApexTrigger(tester) {
    console.log('\n🔧 Testing: salesforce_read_apex_trigger');
    
    try {
      const response = await tester.sendMCPRequest('salesforce_read_apex_trigger', {
        namePattern: '*',
        includeMetadata: true
      });
      
      if (response.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }
      
      console.log('✅ Read Apex Trigger test passed');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Read Apex Trigger test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Main Test Runner
 */
class MCPTestRunner {
  static async runAllTests(authData) {
    console.log('🚀 Starting AI Agent MCP Tests');
    console.log('================================\n');
    
    let authHandler, tester;
    
    try {
      // Initialize auth handler
      authHandler = new AIAgentAuthHandler(authData);
      
      // Initialize test framework
      tester = new MCPToolTester(authHandler);
      
      // Start MCP server
      await tester.startMCPServer();
      
      // Define all available tests
      const allTests = [
        { name: 'Search Objects', func: ToolTests.testSearchObjects },
        { name: 'Describe Object', func: ToolTests.testDescribeObject },
        { name: 'Query Records', func: ToolTests.testQueryRecords },
        { name: 'Aggregate Query', func: ToolTests.testAggregateQuery },
        { name: 'DML Records', func: ToolTests.testDMLRecords },
        { name: 'Search All', func: ToolTests.testSearchAll },
        { name: 'Read Apex', func: ToolTests.testReadApex },
        { name: 'Execute Anonymous', func: ToolTests.testExecuteAnonymous },
        { name: 'Read Apex Trigger', func: ToolTests.testReadApexTrigger }
      ];
      
      const results = new Map();
      
      // Run tests
      for (const test of allTests) {
        try {
          console.log(`\n${'='.repeat(50)}`);
          const result = await test.func(tester);
          results.set(test.name, result);
          
          // Short delay between tests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Test ${test.name} failed with error:`, error);
          results.set(test.name, { success: false, error: error.message });
        }
      }
      
      // Print summary
      MCPTestRunner.printTestSummary(results);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      // Cleanup
      if (tester) {
        tester.stopMCPServer();
      }
    }
  }
  
  static printTestSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    for (const [testName, result] of results) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${testName}`);
      
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error}`);
      }
      
      result.success ? passed++ : failed++;
    }
    
    console.log('\n' + '-'.repeat(40));
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! AI Agent MCP integration is working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above for details.');
    }
  }
}

// Example usage and test execution
async function runExampleTest() {
  // Example AI Agent auth data - replace with actual data from your AI agent
  const exampleAuthData = {
    "success": true,
    "instanceUrl": "https://your-org.my.salesforce.com",
    "accessToken": "YOUR_REAL_ACCESS_TOKEN_HERE",
    "tokenType": "Bearer",
    "refreshToken": "YOUR_REAL_REFRESH_TOKEN_HERE",
    "scope": "refresh_token api",
    "authCode": "YOUR_REAL_AUTH_CODE_HERE"
  };
  
  // Note: The above tokens are examples - replace with real tokens from your AI agent
  console.log('⚠️  IMPORTANT: Replace the example auth data with real tokens from your AI agent!');
  console.log('   The current example tokens are not valid and tests will fail.');
  console.log('   This script demonstrates how to structure the auth data and run tests.\n');
  
  // Uncomment the line below when you have real auth data:
  // await MCPTestRunner.runAllTests(exampleAuthData);
}

// Export classes for external usage
export { MCPTestRunner, AIAgentAuthHandler, MCPToolTester, ToolTests };

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExampleTest().catch(console.error);
}
