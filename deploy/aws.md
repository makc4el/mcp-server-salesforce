# AWS Deployment Guide

## ☁️ Deploy to AWS (Enterprise Choice)

AWS provides enterprise-grade hosting with full control, VPC security, and compliance options.

### Deployment Options

#### Option 1: AWS ECS (Recommended)
Container orchestration with auto-scaling

#### Option 2: AWS EC2
Virtual machines with full control

#### Option 3: AWS App Runner  
Fully managed container service

### ECS Deployment (Recommended)

1. **Prerequisites**
   - AWS CLI configured
   - ECR repository for Docker images
   - ECS cluster

2. **Push Docker Image to ECR**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name mcp-salesforce-server
   
   # Get login token
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and push
   docker build -t mcp-salesforce-server .
   docker tag mcp-salesforce-server:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-salesforce-server:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-salesforce-server:latest
   ```

3. **Create ECS Task Definition**
   ```json
   {
     "family": "mcp-salesforce-server",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "mcp-salesforce-server",
         "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/mcp-salesforce-server:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "essential": true,
         "environment": [
           {"name": "NODE_ENV", "value": "production"},
           {"name": "PORT", "value": "3000"}
         ],
         "secrets": [
           {"name": "SALESFORCE_USERNAME", "valueFrom": "arn:aws:ssm:us-east-1:<account>:parameter/mcp/salesforce/username"},
           {"name": "SALESFORCE_PASSWORD", "valueFrom": "arn:aws:ssm:us-east-1:<account>:parameter/mcp/salesforce/password"},
           {"name": "SALESFORCE_TOKEN", "valueFrom": "arn:aws:ssm:us-east-1:<account>:parameter/mcp/salesforce/token"},
           {"name": "API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:<account>:parameter/mcp/api-key"}
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/mcp-salesforce-server",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

4. **Store Secrets in Parameter Store**
   ```bash
   aws ssm put-parameter --name "/mcp/salesforce/username" --value "your-username@company.com" --type "SecureString"
   aws ssm put-parameter --name "/mcp/salesforce/password" --value "your-password" --type "SecureString"  
   aws ssm put-parameter --name "/mcp/salesforce/token" --value "your-security-token" --type "SecureString"
   aws ssm put-parameter --name "/mcp/api-key" --value "$(openssl rand -base64 32)" --type "SecureString"
   ```

5. **Create ECS Service with ALB**
   - Application Load Balancer for HTTPS
   - Target Group pointing to ECS tasks
   - Auto Scaling Group for high availability

### AWS Benefits
- ✅ Enterprise-grade security and compliance
- ✅ VPC networking and security groups
- ✅ Auto-scaling and high availability  
- ✅ Deep integration with other AWS services
- ✅ Parameter Store for secure secrets management

### AWS Drawbacks
- ❌ Complex setup and configuration
- ❌ Higher costs ($20-50+/month minimum)
- ❌ Requires AWS expertise
- ❌ More moving parts to manage
