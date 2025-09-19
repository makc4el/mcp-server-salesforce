#!/usr/bin/env node

/**
 * Live OAuth Testing Tool
 * Quickly test OAuth with fresh auth codes
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

async function testWithFreshCode() {
    console.log('🚀 Live OAuth Testing Tool');
    console.log('📋 Instructions:');
    console.log('   1. Generate a fresh auth code from your callback server');
    console.log('   2. Provide it when prompted');
    console.log('   3. Test will run immediately');
    console.log('');
    
    // Get fresh credentials from user input
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    function askQuestion(question) {
        return new Promise(resolve => {
            readline.question(question, resolve);
        });
    }
    
    try {
        const instanceUrl = 'https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com';
        const authCode = await askQuestion('🔑 Enter your FRESH auth code: ');
        
        console.log(`\n🧪 Testing immediately with fresh code...`);
        
        const response = await fetch('http://localhost:3000/mcp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Salesforce-Credentials': JSON.stringify({
                    instanceUrl: instanceUrl,
                    authCode: authCode.trim()
                })
            },
            body: JSON.stringify({
                method: 'tools/call',
                params: {
                    name: 'describe',
                    arguments: { objectName: 'Lead' }
                }
            })
        });
        
        console.log(`📥 Response Status: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ SUCCESS! OAuth and Salesforce operation completed!');
            console.log('📊 Result:', JSON.stringify(result, null, 2));
            
            // If we got exchanged token info, show it
            if (result.exchanged_token_info) {
                console.log(`\n🎯 Exchanged Token Info:`);
                console.log(`   Access Token: ${result.exchanged_token_info.access_token.substring(0, 30)}...`);
                console.log(`   Instance URL: ${result.exchanged_token_info.instance_url}`);
                console.log(`   Expires In: ${result.exchanged_token_info.expires_in} seconds`);
            }
        } else {
            const error = await response.text();
            console.log('❌ FAILED:', error);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    } finally {
        readline.close();
    }
}

// If auth code provided as argument, use it directly
const argAuthCode = process.argv[2];
if (argAuthCode) {
    console.log('🔑 Using auth code from command line argument');
    const instanceUrl = 'https://orgfarm-a3ae3ef50e-dev-ed.develop.lightning.force.com';
    
    (async () => {
        try {
            const response = await fetch('http://localhost:3000/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Salesforce-Credentials': JSON.stringify({
                        instanceUrl: instanceUrl,
                        authCode: argAuthCode
                    })
                },
                body: JSON.stringify({
                    method: 'tools/call',
                    params: {
                        name: 'describe',
                        arguments: { objectName: 'Lead' }
                    }
                })
            });
            
            console.log(`📥 Response Status: ${response.status}`);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ SUCCESS! OAuth and Salesforce operation completed!');
                
                if (result.exchanged_token_info) {
                    console.log(`🎯 Access Token: ${result.exchanged_token_info.access_token.substring(0, 30)}...`);
                }
            } else {
                const error = await response.text();
                console.log('❌ FAILED:', error);
            }
        } catch (error) {
            console.error('💥 Error:', error.message);
        }
    })();
} else {
    testWithFreshCode();
}
