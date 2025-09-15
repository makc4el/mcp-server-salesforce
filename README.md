# Salesforce MCP Server
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/tsmztech/mcp-server-salesforce/badge)](https://securityscorecards.dev/viewer/?uri=github.com/tsmztech/mcp-server-salesforce)


An MCP (Model Context Protocol) server implementation that integrates Claude with Salesforce, enabling natural language interactions with your Salesforce data and metadata. This server allows Claude to query, modify, and manage your Salesforce objects and records using everyday language.

**New in this version**: HTTP server support for deployment on cloud hosting platforms like Cloudways, with REST API endpoints for all Salesforce operations.

<a href="https://glama.ai/mcp/servers/kqeniawbr6">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/kqeniawbr6/badge" alt="Salesforce Server MCP server" />
</a>

## Features

* **Object and Field Management**: Create and modify custom objects and fields using natural language
* **Smart Object Search**: Find Salesforce objects using partial name matches
* **Detailed Schema Information**: Get comprehensive field and relationship details for any object
* **Flexible Data Queries**: Query records with relationship support and complex filters
* **Data Manipulation**: Insert, update, delete, and upsert records with ease
* **Cross-Object Search**: Search across multiple objects using SOSL
* **Apex Code Management**: Read, create, and update Apex classes and triggers
* **Intuitive Error Handling**: Clear feedback with Salesforce-specific error details
* **Switchable Authentication**: Supports multiple orgs. Easily switch your active Salesforce org based on the default org configured in your VS Code workspace (use Salesforce_CLI authentication for this feature).
* **HTTP Server Support**: Deploy as a REST API server on cloud platforms like Cloudways
* **Production Ready**: Includes PM2 process management, Nginx configuration, and deployment scripts

## Installation

### For Claude Desktop (MCP Protocol)
```bash
npm install -g @tsmztech/mcp-server-salesforce
```

### For HTTP Server Deployment
```bash
git clone https://github.com/tsmztech/mcp-server-salesforce.git
cd mcp-server-salesforce
npm install
npm run build
```

## Tools

### salesforce_search_objects
Search for standard and custom objects:
* Search by partial name matches
* Finds both standard and custom objects
* Example: "Find objects related to Account" will find Account, AccountHistory, etc.

### salesforce_describe_object
Get detailed object schema information:
* Field definitions and properties
* Relationship details
* Picklist values
* Example: "Show me all fields in the Account object"

### salesforce_query_records
Query records with relationship support:
* Parent-to-child relationships
* Child-to-parent relationships
* Complex WHERE conditions
* Example: "Get all Accounts with their related Contacts"
* Note: For queries with GROUP BY or aggregate functions, use salesforce_aggregate_query

### salesforce_aggregate_query
Execute aggregate queries with GROUP BY:
* GROUP BY single or multiple fields
* Aggregate functions: COUNT, COUNT_DISTINCT, SUM, AVG, MIN, MAX
* HAVING clauses for filtering grouped results
* Date/time grouping functions
* Example: "Count opportunities by stage" or "Find accounts with more than 10 opportunities"

### salesforce_dml_records
Perform data operations:
* Insert new records
* Update existing records
* Delete records
* Upsert using external IDs
* Example: "Update status of multiple accounts"

### salesforce_manage_object
Create and modify custom objects:
* Create new custom objects
* Update object properties
* Configure sharing settings
* Example: "Create a Customer Feedback object"

### salesforce_manage_field
Manage object fields:
* Add new custom fields
* Modify field properties
* Create relationships
* Automatically grants Field Level Security to System Administrator by default
* Use `grantAccessTo` parameter to specify different profiles
* Example: "Add a Rating picklist field to Account"

### salesforce_manage_field_permissions
Manage Field Level Security (Field Permissions):
* Grant or revoke read/edit access to fields for specific profiles
* View current field permissions
* Bulk update permissions for multiple profiles
* Useful for managing permissions after field creation or for existing fields
* Example: "Grant System Administrator access to Custom_Field__c on Account"

### salesforce_search_all
Search across multiple objects:
* SOSL-based search
* Multiple object support
* Field snippets
* Example: "Search for 'cloud' across Accounts and Opportunities"

### salesforce_read_apex
Read Apex classes:
* Get full source code of specific classes
* List classes matching name patterns
* View class metadata (API version, status, etc.)
* Support for wildcards (* and ?) in name patterns
* Example: "Show me the AccountController class" or "Find all classes matching Account*Cont*"

### salesforce_write_apex
Create and update Apex classes:
* Create new Apex classes
* Update existing class implementations
* Specify API versions
* Example: "Create a new Apex class for handling account operations"

### salesforce_read_apex_trigger
Read Apex triggers:
* Get full source code of specific triggers
* List triggers matching name patterns
* View trigger metadata (API version, object, status, etc.)
* Support for wildcards (* and ?) in name patterns
* Example: "Show me the AccountTrigger" or "Find all triggers for Contact object"

### salesforce_write_apex_trigger
Create and update Apex triggers:
* Create new Apex triggers for specific objects
* Update existing trigger implementations
* Specify API versions and event operations
* Example: "Create a new trigger for the Account object" or "Update the Lead trigger"

### salesforce_execute_anonymous
Execute anonymous Apex code:
* Run Apex code without creating a permanent class
* View debug logs and execution results
* Useful for data operations not directly supported by other tools
* Example: "Execute Apex code to calculate account metrics" or "Run a script to update related records"

### salesforce_manage_debug_logs
Manage debug logs for Salesforce users:
* Enable debug logs for specific users
* Disable active debug log configurations
* Retrieve and view debug logs
* Configure log levels (NONE, ERROR, WARN, INFO, DEBUG, FINE, FINER, FINEST)
* Example: "Enable debug logs for user@example.com" or "Retrieve recent logs for an admin user"

## Setup

### Salesforce Authentication
You can connect to Salesforce using one of three authentication methods:

#### 1. Username/Password Authentication (Default)
1. Set up your Salesforce credentials
2. Get your security token (Reset from Salesforce Settings)

#### 2. OAuth 2.0 Client Credentials Flow
1. Create a Connected App in Salesforce
2. Enable OAuth settings and select "Client Credentials Flow"
3. Set appropriate scopes (typically "api" is sufficient)
4. Save the Client ID and Client Secret
5. **Important**: Note your instance URL (e.g., `https://your-domain.my.salesforce.com`) as it's required for authentication

#### 3. Salesforce CLI Authentication (Recommended for local/dev) (contribution by @andrea9293)
1. Install and authenticate Salesforce CLI (`sf`).
2. Make sure your org is authenticated and accessible via `sf org display --json` in the root of your Salesforce project.
3. The server will automatically retrieve the access token and instance url using the CLI.



## Usage

### Option 1: Claude Desktop (MCP Protocol)

Add to your `claude_desktop_config.json`:


#### For Salesforce CLI Authentication:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_CONNECTION_TYPE": "Salesforce_CLI"
      }
    }
  }
}
```

#### For Username/Password Authentication:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_CONNECTION_TYPE": "User_Password",
        "SALESFORCE_USERNAME": "your_username",
        "SALESFORCE_PASSWORD": "your_password",
        "SALESFORCE_TOKEN": "your_security_token",
        "SALESFORCE_INSTANCE_URL": "org_url"        // Optional. Default value: https://login.salesforce.com
      }
    }
  }
}
```

#### For OAuth 2.0 Client Credentials Flow:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_CONNECTION_TYPE": "OAuth_2.0_Client_Credentials",
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret",
        "SALESFORCE_INSTANCE_URL": "https://your-domain.my.salesforce.com"  // REQUIRED: Must be your exact Salesforce instance URL
      }
    }
  }
}
```

> **Note**: For OAuth 2.0 Client Credentials Flow, the `SALESFORCE_INSTANCE_URL` must be your exact Salesforce instance URL (e.g., `https://your-domain.my.salesforce.com`). The token endpoint will be constructed as `<instance_url>/services/oauth2/token`.

### Option 2: HTTP Server Deployment

Deploy the server as a REST API on cloud platforms like Cloudways, AWS, or any Node.js hosting provider.

#### Quick Start with HTTP Server

1. **Environment Setup**:
```bash
cp env.example .env
# Edit .env with your Salesforce credentials
```

2. **Start Local Development Server**:
```bash
npm run start:http
```

3. **Production Deployment**:
```bash
npm run start:prod
```

#### API Endpoints

- **Health Check**: `GET /health`
- **List Tools**: `GET /tools`
- **Execute Tool**: `POST /tools/{toolName}`

#### Example HTTP API Usage

```bash
# Health Check
curl https://your-server.com/health

# List available tools
curl https://your-server.com/tools

# Search for Salesforce objects
curl -X POST https://your-server.com/tools/salesforce_search_objects \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"searchPattern": "Account"}'

# Query records
curl -X POST https://your-server.com/tools/salesforce_query_records \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "objectName": "Account",
    "fields": ["Id", "Name", "Type"],
    "limit": 10
  }'
```

#### Environment Variables for HTTP Server

Create a `.env` file (copy from `env.example`):

```env
# Salesforce Connection
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_USERNAME=your-username@company.com
SALESFORCE_PASSWORD=your-password
SALESFORCE_SECURITY_TOKEN=your-security-token

# Server Configuration
PORT=3000
NODE_ENV=production

# Security (recommended for production)
API_KEY=your-secure-api-key-here

# CORS Settings
ALLOWED_ORIGINS=*
```

#### Cloudways Deployment

For detailed Cloudways deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick Deploy to Cloudways**:

1. Upload your code to Cloudways application
2. Run the deployment script:
```bash
chmod +x cloudways-deploy.sh
./cloudways-deploy.sh
```

The script will:
- Install dependencies
- Build the project
- Configure PM2 process management
- Start the HTTP server
- Provide monitoring commands

#### Production Management

```bash
# Process Management with PM2
npm run pm2:start    # Start the server
npm run pm2:stop     # Stop the server
npm run pm2:restart  # Restart the server
npm run pm2:logs     # View logs
npm run pm2:monit    # Monitor resources

# Direct server commands
npm run start:http   # Development server
npm run start:prod   # Production server
```

## Example Usage

### Searching Objects
```
"Find all objects related to Accounts"
"Show me objects that handle customer service"
"What objects are available for order management?"
```

### Getting Schema Information
```
"What fields are available in the Account object?"
"Show me the picklist values for Case Status"
"Describe the relationship fields in Opportunity"
```

### Querying Records
```
"Get all Accounts created this month"
"Show me high-priority Cases with their related Contacts"
"Find all Opportunities over $100k"
```

### Aggregate Queries
```
"Count opportunities by stage"
"Show me the total revenue by account"
"Find accounts with more than 10 opportunities"
"Calculate average deal size by sales rep and quarter"
"Get the number of cases by priority and status"
```

### Managing Custom Objects
```
"Create a Customer Feedback object"
"Add a Rating field to the Feedback object"
"Update sharing settings for the Service Request object"
```
Examples with Field Level Security:
```
# Default - grants access to System Administrator automatically
"Create a Status picklist field on Custom_Object__c"

# Custom profiles - grants access to specified profiles
"Create a Revenue currency field on Account and grant access to Sales User and Marketing User profiles"
```

### Managing Field Permissions
```
"Grant System Administrator access to Custom_Field__c on Account"
"Give read-only access to Rating__c field for Sales User profile"
"View which profiles have access to the Custom_Field__c"
"Revoke field access for specific profiles"
```

### Searching Across Objects
```
"Search for 'cloud' in Accounts and Opportunities"
"Find mentions of 'network issue' in Cases and Knowledge Articles"
"Search for customer name across all relevant objects"
```

### Managing Apex Code
```
"Show me all Apex classes with 'Controller' in the name"
"Get the full code for the AccountService class"
"Create a new Apex utility class for handling date operations"
"Update the LeadConverter class to add a new method"
```

### Managing Apex Triggers
```
"List all triggers for the Account object"
"Show me the code for the ContactTrigger"
"Create a new trigger for the Opportunity object"
"Update the Case trigger to handle after delete events"
```

### Executing Anonymous Apex Code
```
"Execute Apex code to calculate account metrics"
"Run a script to update related records"
"Execute a batch job to process large datasets"
```

### Managing Debug Logs
```
"Enable debug logs for user@example.com"
"Retrieve recent logs for an admin user"
"Disable debug logs for a specific user"
"Configure log level to DEBUG for a user"
```

## Development

### Building from source
```bash
# Clone the repository
git clone https://github.com/tsmztech/mcp-server-salesforce.git

# Navigate to directory
cd mcp-server-salesforce

# Install dependencies
npm install

# Build the project
npm run build
```

## Contributing
Contributions are welcome! Feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Issues and Support
If you encounter any issues or need support, please file an issue on the [GitHub repository](https://github.com/tsmztech/mcp-server-salesforce/issues).