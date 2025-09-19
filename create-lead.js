#!/usr/bin/env node

// Clean Lead Creation with Dynamic Credentials
// Usage: node create-lead.js <instance_url> <auth_code>
// Example: node create-lead.js https://myorg.my.salesforce.com aCRM5_abcd123...
import { createSalesforceConnection } from './dist/utils/connection.js';
import { config } from 'dotenv';

// Load environment variables (for client ID/secret only)
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
    // Get command-line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('❌ Missing required arguments');
      console.log('\n📋 Usage: node create-lead.js <instance_url> <auth_code>');
      console.log('Example: node create-lead.js https://myorg.my.salesforce.com aCRM5_abcd123...\n');
      console.log('💡 To get authorization code:');
      console.log('1. Complete your OAuth login flow');
      console.log('2. Extract the "code" parameter from callback URL');
      console.log('3. Use it as the second argument to this script\n');
      return;
    }

    const [instanceUrl, authCode] = args;
    console.log(`✅ Using instance URL: ${instanceUrl}`);
    console.log(`✅ Using authorization code: ${authCode.substring(0, 20)}...\n`);

    // Step 1: Create connection using dynamic credentials
    console.log('🔐 Step 1: Creating connection with dynamic credentials...');
    console.log('   → Using OAuth code exchange flow\n');
    
    const dynamicCredentials = {
      instanceUrl: instanceUrl,
      authCode: authCode
    };
    
    const conn = await createSalesforceConnection(undefined, dynamicCredentials);
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

// Check required environment variables (only client credentials needed now)
const required = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'];
const missing = required.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nThese should be configured in your .env file.');
  console.log('Instance URL and auth code are now provided as command-line arguments.');
  process.exit(1);
}

// Run lead creation
createLead();
