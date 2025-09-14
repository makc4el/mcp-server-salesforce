# Fly.io Deployment Guide

## 🛸 Deploy to Fly.io (Best Performance)

Fly.io offers global edge deployment with excellent performance and a generous free tier.

### Prerequisites
- Fly.io CLI: `curl -L https://fly.io/install.sh | sh`
- Fly.io account (free tier includes 3 shared-cpu-1x VMs)

### Step-by-Step Deployment

1. **Initialize Fly App**
   ```bash
   cd /Users/max.odarchenko/Projects/mcp-server-salesforce
   flyctl auth login
   flyctl launch --name mcp-salesforce-server
   ```
   
   This creates a `fly.toml` configuration file.

2. **Configure fly.toml**
   ```toml
   app = "mcp-salesforce-server"
   primary_region = "sjc"  # Choose closest region
   
   [build]
     dockerfile = "Dockerfile"
   
   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
   
   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 512
   
   [env]
     PORT = "3000"
     NODE_ENV = "production"
   ```

3. **Set Environment Variables (Secrets)**
   ```bash
   # Salesforce credentials
   flyctl secrets set SALESFORCE_CONNECTION_TYPE=User_Password
   flyctl secrets set SALESFORCE_USERNAME=your-username@company.com
   flyctl secrets set SALESFORCE_PASSWORD=your-password  
   flyctl secrets set SALESFORCE_TOKEN=your-security-token
   flyctl secrets set SALESFORCE_INSTANCE_URL=https://login.salesforce.com
   
   # Security
   flyctl secrets set API_KEY=$(openssl rand -base64 32)
   flyctl secrets set ALLOWED_ORIGINS=*
   ```

4. **Deploy**
   ```bash
   flyctl deploy
   ```

5. **Test Deployment**
   ```bash
   flyctl status
   flyctl logs
   
   # Test endpoints
   curl https://mcp-salesforce-server.fly.dev/health
   curl https://mcp-salesforce-server.fly.dev/tools
   ```

### Fly.io Benefits
- ✅ Global edge deployment (low latency)
- ✅ Generous free tier (3 VMs)
- ✅ Automatic HTTPS
- ✅ Auto sleep/wake (cost savings)
- ✅ Great Docker support

### Fly.io Drawbacks
- ❌ Learning curve for flyctl
- ❌ Less GUI than Railway
- ❌ Cold starts with auto-sleep
