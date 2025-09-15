module.exports = {
  apps: [{
    name: 'salesforce-mcp-server',
    script: 'dist/http-server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // PM2 settings
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Cloudways specific settings
    min_uptime: '10s',
    max_restarts: 10,
    
    // Health check settings
    health_check_grace_period: 3000,
    health_check_interval: 30000,
    
    // Environment variables for Cloudways
    env_file: '.env'
  }]
};
