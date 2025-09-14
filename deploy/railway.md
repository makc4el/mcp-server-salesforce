# Railway Deployment Guide

## 🚀 Deploy to Railway (Recommended for Beginners)

Railway offers the easiest deployment experience with automatic HTTPS and GitHub integration.

### Prerequisites
- GitHub account
- Railway account (free tier available)
- Your Salesforce credentials

### Step-by-Step Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add HTTP server support"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your mcp-server-salesforce repository
   - Railway will auto-detect Node.js and deploy

3. **Configure Environment Variables**
   In Railway dashboard → Settings → Variables, add:
   ```
   PORT=3000
   NODE_ENV=production
   
   # Salesforce Auth (choose one method)
   SALESFORCE_CONNECTION_TYPE=User_Password
   SALESFORCE_USERNAME=your-username@company.com
   SALESFORCE_PASSWORD=your-password
   SALESFORCE_TOKEN=your-security-token
   SALESFORCE_INSTANCE_URL=https://login.salesforce.com
   
   # Security (recommended)
   API_KEY=your-secure-random-api-key
   ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
   ```

4. **Custom Domain (Optional)**
   - Railway Settings → Networking
   - Add custom domain or use Railway's generated URL

5. **Test Deployment**
   ```bash
   curl https://your-app.railway.app/health
   curl https://your-app.railway.app/tools
   ```

### Railway Benefits
- ✅ $5/month after free tier
- ✅ Automatic HTTPS certificates
- ✅ GitHub integration for auto-deploys
- ✅ Built-in monitoring and logs
- ✅ Easy scaling

### Railway Drawbacks
- ❌ Limited free tier hours
- ❌ Less control than AWS/GCP
- ❌ Vendor lock-in
