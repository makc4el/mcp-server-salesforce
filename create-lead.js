#!/usr/bin/env node

// Clean Lead Creation with Token Exchange Flow
// Only requirement: Update SALESFORCE_AUTH_CODE in .env from your login flow
import { createSalesforceConnection } from './dist/utils/connection.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Generate random lead data
function generateLeadData() {
  const firstNames = ['Alex', 'Taylor', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Blake', 'Quinn'];
  const lastNames = ['Anderson', 'Martinez', 'Thompson', 'Wilson', 'Rodriguez', 'Lee', 'Walker', 'Hall'];
  const companies = ['NextGen Solutions', 'Digital Innovators', 'Future Technologies', 'Smart Systems Inc', 'Progressive Enterprises'];
  const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const industry = industries[Math.floor(Math.random() * industries.length)];
  
  return {
    FirstName: firstName,
    LastName: lastName,
    Company: company,
    Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '').replace(/inc$/i, '')}.com`,
    Phone: `555-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    LeadSource: 'Web',
    Status: 'Open - Not Contacted',
    Industry: industry,
    Title: 'Sales Prospect',
    Description: `Lead created via token exchange on ${new Date().toISOString()}`
  };
}

async function createLead() {
  console.log('🚀 Salesforce Lead Creation');
  console.log('==========================\n');

  try {
    // Check for required auth code
    const authCode = process.env.SALESFORCE_AUTH_CODE;
    
    if (!authCode) {
      console.log('❌ SALESFORCE_AUTH_CODE not found in .env');
      console.log('\n💡 To get authorization code:');
      console.log('1. Complete your login flow');
      console.log('2. Extract the "code" parameter from callback data');
      console.log('3. Update SALESFORCE_AUTH_CODE in .env file');
      console.log('4. Run this script again\n');
      return;
    }

    console.log(`✅ Using authorization code: ${authCode.substring(0, 20)}...\n`);

    // Step 1: Create user session data (automatically from env vars)
    const userSessionData = {
      userId: 'lead_creator',
      instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
      callbackData: {
        timestamp: new Date().toISOString(),
        query: {
          code: authCode
        },
        headers: {
          host: 'localhost:3000',
          referer: process.env.SALESFORCE_INSTANCE_URL + '/'
        }
      }
    };

    // Step 2: Create connection (calls exchangeUserTokens first, then connects)
    console.log('🔐 Step 1: Creating connection with token exchange...');
    console.log('   → Calling exchangeUserTokens(userSession) first');
    console.log('   → Then proceeding with connection\n');
    
    const conn = await createSalesforceConnection(userSessionData);
    console.log('✅ Connection established!\n');

    // Step 3: Generate lead data
    const leadData = generateLeadData();
    console.log('📋 Step 2: Generated lead data:');
    console.log(JSON.stringify(leadData, null, 2));
    console.log('');

    // Step 4: Create lead
    console.log('🔨 Step 3: Creating lead in Salesforce...');
    const result = await conn.sobject('Lead').create(leadData);
    
    if (result.success) {
      console.log('\n🎉 SUCCESS: Lead created!');
      console.log('========================');
      console.log(`🆔 Lead ID: ${result.id}`);
      console.log(`👤 Name: ${leadData.FirstName} ${leadData.LastName}`);
      console.log(`🏢 Company: ${leadData.Company}`);
      console.log(`📧 Email: ${leadData.Email}`);
      console.log(`📱 Phone: ${leadData.Phone}`);
      console.log(`🏭 Industry: ${leadData.Industry}`);
      
      // Verify the lead
      const verifiedLead = await conn.sobject('Lead').retrieve(result.id);
      console.log(`📅 Created: ${verifiedLead.CreatedDate}`);
      
      console.log(`\n🔗 View in Salesforce: ${conn.instanceUrl}/lightning/r/Lead/${result.id}/view`);
      
    } else {
      console.error('❌ Lead creation failed:', result);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Authorization code expired. Get a fresh code from your login flow.');
    }
  }
}

// Check required environment variables
const required = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_INSTANCE_URL'];
const missing = required.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nThese should be static in your .env file.');
  process.exit(1);
}

// Run lead creation
createLead();
