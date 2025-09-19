#!/usr/bin/env node

/**
 * Railway Compatibility Test Script
 * Tests MCP server endpoints for Railway deployment compatibility
 */

import fetch from 'node-fetch';

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
    console.log(`\n🧪 Testing ${name}...`);
    
    try {
        const response = await fetch(url, {
            timeout: 10000,
            ...options
        });
        
        const data = await response.json();
        
        console.log(`✅ ${name}: HTTP ${response.status}`);
        if (response.status === 200) {
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        } else {
            console.log(`   Error: ${data.error || 'Unknown error'}`);
        }
        
        return response.status === 200;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        return false;
    }
}

async function testMCPEndpoint() {
    console.log(`\n🧪 Testing MCP tools/list endpoint...`);
    
    try {
        const response = await fetch(`${SERVER_URL}/mcp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Salesforce-Credentials': JSON.stringify({
                    instanceUrl: 'https://test.my.salesforce.com',
                    accessToken: 'mock_token_123456789'
                })
            },
            body: JSON.stringify({
                method: 'tools/list'
            }),
            timeout: 10000
        });
        
        const data = await response.json();
        
        console.log(`✅ MCP tools/list: HTTP ${response.status}`);
        if (response.status === 200 && data.result && data.result.tools) {
            console.log(`   Available tools: ${data.result.tools.length}`);
            console.log(`   Tools: ${data.result.tools.map(t => t.name).join(', ')}`);
        } else {
            console.log(`   Error: ${data.error || 'Unknown error'}`);
        }
        
        return response.status === 200;
    } catch (error) {
        console.log(`❌ MCP tools/list: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log(`🚀 Railway Compatibility Test for MCP Salesforce Server`);
    console.log(`📡 Testing server at: ${SERVER_URL}`);
    console.log(`${'='.repeat(60)}`);
    
    const tests = [];
    
    // Health check endpoints
    tests.push(await testEndpoint('Health Check', `${SERVER_URL}/health`));
    tests.push(await testEndpoint('Liveness Probe', `${SERVER_URL}/health/live`));
    tests.push(await testEndpoint('Readiness Probe', `${SERVER_URL}/health/ready`));
    
    // Tools endpoint
    tests.push(await testEndpoint('Tools List', `${SERVER_URL}/tools`));
    
    // MCP endpoint
    tests.push(await testMCPEndpoint());
    
    // CORS preflight test
    console.log(`\n🧪 Testing CORS preflight...`);
    try {
        const response = await fetch(`${SERVER_URL}/mcp`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://smith.langchain.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,X-Salesforce-Credentials'
            },
            timeout: 10000
        });
        
        console.log(`✅ CORS Preflight: HTTP ${response.status}`);
        console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
        console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
        console.log(`   Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
        
        tests.push(response.status === 200 || response.status === 204);
    } catch (error) {
        console.log(`❌ CORS Preflight: ${error.message}`);
        tests.push(false);
    }
    
    // Summary
    const passed = tests.filter(Boolean).length;
    const total = tests.length;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log(`✅ All tests passed! Server is ready for Railway deployment.`);
        console.log(`\n🚀 Next steps:`);
        console.log(`   1. Set environment variables in Railway dashboard`);
        console.log(`   2. Deploy to Railway`);
        console.log(`   3. Update LangChain Platform with Railway URL`);
        process.exit(0);
    } else {
        console.log(`❌ Some tests failed. Check configuration and try again.`);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

main().catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
});
