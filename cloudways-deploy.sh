#!/bin/bash

# Cloudways Deployment Script for Salesforce MCP Server
# This script helps deploy the MCP server to Cloudways hosting

echo "🚀 Starting Cloudways Deployment for Salesforce MCP Server..."

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please create one from .env.example"
    echo "   You can run: cp .env.example .env"
    echo "   Then edit .env with your actual values"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist/ folder not created."
    exit 1
fi

# Create logs directory
mkdir -p logs

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Start the application with PM2
echo "🎯 Starting application with PM2..."
npm run pm2:start

# Show PM2 status
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your Salesforce MCP Server should now be running at:"
echo "   Health Check: http://your-server-ip:3000/health"
echo "   Tools List: http://your-server-ip:3000/tools"
echo ""
echo "📋 Useful commands:"
echo "   npm run pm2:logs     - View application logs"
echo "   npm run pm2:restart  - Restart the application"
echo "   npm run pm2:stop     - Stop the application"
echo "   npm run pm2:monit    - Monitor application"
echo ""
echo "🔧 Next steps:"
echo "1. Configure your domain/subdomain to point to port 3000"
echo "2. Set up SSL certificate (recommended)"
echo "3. Configure firewall rules if needed"
echo "4. Test the API endpoints"
echo ""
echo "📖 API Usage:"
echo "   POST http://your-domain/tools/{tool_name}"
echo "   Headers: Content-Type: application/json"
echo "   Headers: X-API-Key: your-api-key (if configured)"
echo "   Body: JSON with tool arguments"
