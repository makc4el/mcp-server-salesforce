# Salesforce MCP Server
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/tsmztech/mcp-server-salesforce/badge)](https://securityscorecards.dev/viewer/?uri=github.com/tsmztech/mcp-server-salesforce)


An MCP (Model Context Protocol) server implementation that integrates Claude with Salesforce, enabling natural language interactions with your Salesforce data and metadata. This server allows Claude to query, modify, and manage your Salesforce objects and records using everyday language.

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

## Installation

```bash
npm install -g @tsmztech/mcp-server-salesforce
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
The server uses **Direct Token Authentication** only, which is the simplest and most reliable method.

#### Direct Token Authentication (Only Supported Method)
1. Obtain your Salesforce instance URL and access token
2. You can get an access token from:
   - **Salesforce CLI**: `sf org display --verbose` (look for Access Token)
   - Connected App authentication flow
   - OAuth authorization flow
3. This method is simple, reliable, and perfect for both development and production use



### Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_INSTANCE_URL": "https://your-domain.my.salesforce.com",
        "SALESFORCE_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

### Usage as HTTP Server (Alternative to Claude Desktop)

The Salesforce MCP Server can also run as a standalone HTTP server, making it accessible to any application that can make HTTP requests. This is especially useful for web applications, custom integrations, or when you want to use the server independently from Claude Desktop.

#### Quick Start (HTTP Server)

1. **Install dependencies:**
   ```bash
   npm install -g @tsmztech/mcp-server-salesforce
   ```

2. **Create configuration file:**
   Copy the example configuration:
   ```bash
   cp example.env .env
   ```

3. **Configure your Salesforce connection:**
   Edit `.env` file:
   ```bash
   # Direct Token authentication (only supported method)
   SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com
   SALESFORCE_ACCESS_TOKEN=your_access_token_here

   # HTTP Server settings
   PORT=3000
   # API_KEY=your-secret-api-key  # Optional authentication
   ```

4. **Start the HTTP server:**
   ```bash
   npm run build && npm run serve
   ```

5. **Test the server:**
   ```bash
   # Health check
   curl http://localhost:3000/health
   
   # List available tools
   curl http://localhost:3000/tools
   ```

#### HTTP API Usage

The HTTP server exposes all MCP tools as REST endpoints:

- **GET /health** - Health check endpoint
- **GET /tools** - List all available tools
- **POST /tools/{toolName}** - Execute a specific tool

#### Example HTTP Requests

**Query Salesforce records:**
```bash
curl -X POST http://localhost:3000/tools/salesforce_query_records \
  -H "Content-Type: application/json" \
  -d '{
    "objectName": "Account",
    "fields": ["Id", "Name", "Industry"],
    "limit": 5
  }'
```

**Search for objects:**
```bash
curl -X POST http://localhost:3000/tools/salesforce_search_objects \
  -H "Content-Type: application/json" \
  -d '{
    "searchPattern": "Account"
  }'
```

**Describe an object:**
```bash
curl -X POST http://localhost:3000/tools/salesforce_describe_object \
  -H "Content-Type: application/json" \
  -d '{
    "objectName": "Contact"
  }'
```

#### Authentication for HTTP Server

The HTTP server supports optional API key authentication:

```bash
# Set API key in .env file
API_KEY=your-secret-api-key

# Include API key in requests
curl -X POST http://localhost:3000/tools/salesforce_query_records \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{"objectName": "Account", "fields": ["Id", "Name"]}'
```

#### CORS Configuration

Configure allowed origins for browser-based applications:

```bash
# In .env file
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### Available Scripts

```bash
npm run build    # Build TypeScript to JavaScript
npm run serve    # Start HTTP server (requires build first)
npm run dev      # Build and start server in one command
npm run watch    # Watch for TypeScript changes
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