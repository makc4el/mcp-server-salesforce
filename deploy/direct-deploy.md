# Direct Deployment (No Docker)

## 🚀 For Platforms that Support Node.js Directly

Some platforms (Railway, Render, Heroku) can deploy directly from your code without Docker.

### Prerequisites Fixed:
✅ **package-lock.json**: Now generated and committed
✅ **Build process**: Properly configured in package.json
✅ **Start script**: HTTP server ready

### Quick Deploy to Railway (Easiest):

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Fix deployment issues and add HTTP server"
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Connect GitHub repo
   - Railway auto-detects Node.js and uses package.json scripts
   - No Docker needed!

3. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   SALESFORCE_CONNECTION_TYPE=User_Password
   SALESFORCE_USERNAME=your-username@company.com
   SALESFORCE_PASSWORD=your-password
   SALESFORCE_TOKEN=your-security-token
   API_KEY=your-random-api-key
   ALLOWED_ORIGINS=https://mcp-11c20ca34323550094cf6caa7cb4d446.us.langgraph.app
   ```

### What Gets Deployed:
- ✅ HTTP server on port from environment
- ✅ All 15 Salesforce tools via REST API
- ✅ CORS configured for your LangGraph agent
- ✅ Optional API key authentication
- ✅ Health check endpoint

### Test Your Deployment:
```bash
# Replace YOUR-APP-URL with your Railway app URL
curl https://your-app.railway.app/health
curl https://your-app.railway.app/tools

# Test Salesforce integration
curl -X POST https://your-app.railway.app/tools/salesforce_search_objects \
  -H "Content-Type: application/json" \
  -d '{"searchPattern": "Account"}'
```

### Alternative: Render.com
1. Connect GitHub repo to Render
2. Choose "Web Service"
3. Build Command: `npm run build`
4. Start Command: `npm run start:http`
5. Add environment variables in Render dashboard
