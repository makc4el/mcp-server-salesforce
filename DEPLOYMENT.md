# Cloudways Deployment Guide

This guide will help you deploy the Salesforce MCP Server on Cloudways hosting.

## Prerequisites

1. **Cloudways Account**: Sign up at [Cloudways](https://www.cloudways.com)
2. **Salesforce Org**: Access to a Salesforce org with API enabled
3. **Domain** (optional): Custom domain for your API

## Step 1: Create Cloudways Application

1. Log into your Cloudways account
2. Click "Launch" to create a new server
3. Choose:
   - **Application**: Node.js
   - **Server Size**: Start with 1GB (can scale up)
   - **Location**: Choose closest to your users
   - **Cloud Provider**: AWS, DigitalOcean, or Google Cloud

4. Wait for server provisioning (5-10 minutes)

## Step 2: Deploy Your Code

### Option A: Git Deployment (Recommended)

1. In Cloudways panel, go to your application
2. Navigate to **Deployment via Git**
3. Add your repository URL
4. Set branch (usually `main` or `master`)
5. Deploy

### Option B: Manual Upload

1. Upload your project files via SFTP or File Manager
2. Ensure all files are in the application's public_html directory

## Step 3: Server Configuration

### 3.1 Install Dependencies

Connect to your server via SSH (available in Cloudways panel):

```bash
cd /home/master/applications/[app-id]/public_html
npm install
```

### 3.2 Environment Configuration

1. Copy the environment template:
```bash
cp env.example .env
```

2. Edit `.env` with your actual values:
```bash
nano .env
```

Required variables:
```env
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_USERNAME=your-username@company.com
SALESFORCE_PASSWORD=your-password
SALESFORCE_SECURITY_TOKEN=your-security-token
API_KEY=your-secure-api-key-here
PORT=3000
NODE_ENV=production
```

### 3.3 Build the Application

```bash
npm run build
```

## Step 4: PM2 Process Management

### 4.1 Install PM2

```bash
sudo npm install -g pm2
```

### 4.2 Start the Application

```bash
npm run pm2:start
```

### 4.3 Configure PM2 for Auto-restart

```bash
pm2 startup
pm2 save
```

## Step 5: Nginx Configuration (Optional but Recommended)

1. Access Nginx configuration in Cloudways panel
2. Go to **Server Management** > **Services** > **Nginx**
3. Add the configuration from `nginx.conf` file
4. Update `your-domain.com` with your actual domain
5. Restart Nginx

## Step 6: SSL Certificate

1. In Cloudways panel, go to **SSL Certificate**
2. Choose **Let's Encrypt** (free) or upload custom certificate
3. Enable **Force HTTPS Redirect**

## Step 7: Domain Configuration

1. Point your domain's A record to your Cloudways server IP
2. In Cloudways, go to **Domain Management**
3. Add your domain
4. Update SSL certificate for the new domain

## Step 8: Testing

### Health Check
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "server": "mcp-salesforce-http-server"
}
```

### API Test
```bash
curl -X POST https://your-domain.com/tools/salesforce_search_objects \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"searchPattern": "Account"}'
```

## Monitoring and Maintenance

### Check Application Status
```bash
npm run pm2:logs    # View logs
npm run pm2:monit   # Monitor resources
pm2 list           # List running processes
```

### Restart Application
```bash
npm run pm2:restart
```

### Update Application
1. Pull latest changes (if using Git deployment)
2. Run build: `npm run build`
3. Restart: `npm run pm2:restart`

## Firewall Configuration

In Cloudways panel:
1. Go to **Server Management** > **Security**
2. Ensure ports 80 and 443 are open
3. Port 3000 should NOT be open externally (accessed via Nginx proxy)

## Troubleshooting

### Common Issues

1. **Application not starting**
   - Check logs: `npm run pm2:logs`
   - Verify environment variables in `.env`
   - Ensure all dependencies installed: `npm install`

2. **Salesforce connection errors**
   - Verify Salesforce credentials
   - Check if API access is enabled in Salesforce org
   - Verify security token is current

3. **502 Bad Gateway**
   - Check if PM2 process is running: `pm2 list`
   - Verify port 3000 is configured correctly
   - Check Nginx configuration

4. **High memory usage**
   - Monitor with: `npm run pm2:monit`
   - Consider upgrading server size
   - Check for memory leaks in logs

### Log Locations

- Application logs: `./logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`

## Security Best Practices

1. **API Key**: Use a strong, unique API key
2. **Environment Variables**: Never commit `.env` to version control
3. **SSL**: Always use HTTPS in production
4. **Firewall**: Only open necessary ports
5. **Updates**: Keep dependencies updated
6. **Monitoring**: Set up monitoring and alerts

## Support

- **Cloudways Support**: Available 24/7 via chat/tickets
- **Application Issues**: Check logs and GitHub issues
- **Salesforce Issues**: Verify org configuration and API limits
