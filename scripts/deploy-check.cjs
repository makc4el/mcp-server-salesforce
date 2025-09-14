#!/usr/bin/env node

/**
 * Pre-deployment health check script
 * Verifies that all required files and configurations are ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-deployment Health Check\n');

const checks = [
  {
    name: 'package.json exists',
    check: () => fs.existsSync('package.json'),
    fix: 'package.json is required'
  },
  {
    name: 'package-lock.json exists', 
    check: () => fs.existsSync('package-lock.json'),
    fix: 'Run: npm install'
  },
  {
    name: 'dist/ directory exists',
    check: () => fs.existsSync('dist/'),
    fix: 'Run: npm run build'
  },
  {
    name: 'HTTP server built',
    check: () => fs.existsSync('dist/http-server.js'),
    fix: 'Run: npm run build'
  },
  {
    name: 'TypeScript config',
    check: () => fs.existsSync('tsconfig.json'),
    fix: 'tsconfig.json is required'
  },
  {
    name: 'Dockerfile exists',
    check: () => fs.existsSync('Dockerfile'),
    fix: 'Dockerfile created'
  },
  {
    name: '.env.example exists',
    check: () => fs.existsSync('.env.example'),
    fix: '.env.example created'
  }
];

let allPassed = true;

checks.forEach(({ name, check, fix }) => {
  const passed = check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  
  if (!passed) {
    console.log(`   💡 Fix: ${fix}`);
    allPassed = false;
  }
});

console.log('\n📦 Package.json scripts check:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'start:http'];

requiredScripts.forEach(script => {
  const exists = pkg.scripts && pkg.scripts[script];
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${script}: ${exists || 'missing'}`);
  if (!exists) allPassed = false;
});

console.log('\n🔧 Environment variables check:');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = [
    'SALESFORCE_CONNECTION_TYPE',
    'ALLOWED_ORIGINS'
  ];
  
  requiredVars.forEach(varName => {
    const exists = envContent.includes(varName);
    const status = exists ? '✅' : '⚠️';
    console.log(`${status} ${varName}: ${exists ? 'configured' : 'not set'}`);
  });
} else {
  console.log('⚠️  .env file not found (expected for production)');
}

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 All checks passed! Ready for deployment');
  console.log('\nNext steps:');
  console.log('1. git add . && git commit -m "Ready for deployment"');
  console.log('2. git push origin main');
  console.log('3. Deploy to your chosen platform');
} else {
  console.log('⚠️  Some issues need to be fixed before deployment');
  process.exit(1);
}
