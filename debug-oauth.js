#!/usr/bin/env node

/**
 * OAuth Debug Tool for Salesforce Connected App
 * Tests OAuth token exchange to identify configuration issues
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

async function testOAuthExchange(instanceUrl, authCode) {
    console.log('🔍 Testing OAuth Token Exchange...');
    console.log(`📍 Instance URL: ${instanceUrl}`);
    console.log(`🔑 Auth Code: ${authCode.substring(0, 20)}...`);
    
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const redirectUri = process.env.SALESFORCE_REDIRECT_URI || 'http://localhost:3000/callback';
    
    console.log(`\n🔧 OAuth Configuration:`);
    console.log(`   Client ID: ${clientId?.substring(0, 20)}...`);
    console.log(`   Client Secret: ${clientSecret ? 'Present' : 'Missing'}`);
    console.log(`   Redirect URI: ${redirectUri}`);
    
    if (!clientId || !clientSecret) {
        console.error('❌ Missing SALESFORCE_CLIENT_ID or SALESFORCE_CLIENT_SECRET');
        return;
    }
    
    const tokenPayload = {
        grant_type: 'authorization_code',
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
    };
    
    // Convert Lightning domain to proper OAuth endpoint if needed
    let oauthInstanceUrl = instanceUrl;
    if (instanceUrl.includes('lightning.force.com')) {
      oauthInstanceUrl = instanceUrl
        .replace('develop.lightning.force.com', 'develop.my.salesforce.com')
        .replace('lightning.force.com', 'my.salesforce.com');
      console.log(`🔄 Converted Lightning URL to OAuth URL: ${oauthInstanceUrl}`);
    }
    
    const tokenEndpoint = `${oauthInstanceUrl}/services/oauth2/token`;
    
    console.log(`\n📤 Making request to: ${tokenEndpoint}`);
    console.log(`📋 Payload:`, {
        grant_type: tokenPayload.grant_type,
        client_id: tokenPayload.client_id,
        redirect_uri: tokenPayload.redirect_uri,
        code_length: authCode.length
    });
    
    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'Salesforce-OAuth-Debug/1.0'
            },
            body: new URLSearchParams(tokenPayload)
        });
        
        console.log(`\n📥 Response Status: ${response.status}`);
        console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`📄 Response Body:`, responseText);
        
        if (response.ok) {
            const tokens = JSON.parse(responseText);
            console.log(`\n✅ SUCCESS! Token Exchange Completed`);
            console.log(`🎯 Access Token: ${tokens.access_token.substring(0, 30)}...`);
            console.log(`🌐 Instance URL: ${tokens.instance_url}`);
            console.log(`⏰ Expires In: ${tokens.expires_in} seconds`);
            
            // Test the token by making a simple identity call
            console.log(`\n🧪 Testing access token validity...`);
            const identityResponse = await fetch(`${tokens.instance_url}/services/oauth2/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (identityResponse.ok) {
                const identity = await identityResponse.json();
                console.log(`✅ Token is valid! User: ${identity.name} (${identity.email})`);
            } else {
                console.log(`❌ Token validation failed: ${identityResponse.status}`);
            }
            
        } else {
            try {
                const errorData = JSON.parse(responseText);
                console.log(`\n❌ FAILURE! OAuth Error Details:`);
                console.log(`   Error: ${errorData.error}`);
                console.log(`   Description: ${errorData.error_description}`);
                
                // Provide specific guidance based on error
                if (errorData.error === 'unsupported_grant_type') {
                    console.log(`\n🛠️  FIX: This error means your Connected App doesn't support the Authorization Code flow.`);
                    console.log(`   1. Go to Setup → Apps → App Manager in Salesforce`);
                    console.log(`   2. Find your Connected App and click "Edit"`);
                    console.log(`   3. Ensure "Enable OAuth Settings" is checked`);
                    console.log(`   4. In "Selected OAuth Scopes", include:`);
                    console.log(`      - Access and manage your data (api)`);
                    console.log(`      - Perform requests on your behalf at any time (refresh_token, offline_access)`);
                    console.log(`   5. Set "Callback URL" to exactly: ${redirectUri}`);
                    console.log(`   6. Save and wait 2-10 minutes for changes to propagate`);
                }
                
            } catch (e) {
                console.log(`\n❌ FAILURE! Raw error: ${responseText}`);
            }
        }
        
    } catch (error) {
        console.error(`\n💥 Network Error:`, error.message);
    }
}

// Test with the provided credentials - UPDATE THESE VALUES
const instanceUrl = 'https://your-org.lightning.force.com/';
const authCode = 'aPrx.your_authorization_code_here';

testOAuthExchange(instanceUrl, authCode).catch(console.error);
