#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";

import { createSalesforceConnection, type SalesforceCredentials } from "./utils/connection.js";
import { SEARCH_OBJECTS, handleSearchObjects } from "./tools/search.js";
import { DESCRIBE_OBJECT, handleDescribeObject } from "./tools/describe.js";
import { QUERY_RECORDS, handleQueryRecords, QueryArgs } from "./tools/query.js";
import { AGGREGATE_QUERY, handleAggregateQuery, AggregateQueryArgs } from "./tools/aggregateQuery.js";
import { DML_RECORDS, handleDMLRecords, DMLArgs } from "./tools/dml.js";
import { MANAGE_OBJECT, handleManageObject, ManageObjectArgs } from "./tools/manageObject.js";
import { MANAGE_FIELD, handleManageField, ManageFieldArgs } from "./tools/manageField.js";
import { MANAGE_FIELD_PERMISSIONS, handleManageFieldPermissions, ManageFieldPermissionsArgs } from "./tools/manageFieldPermissions.js";
import { SEARCH_ALL, handleSearchAll, SearchAllArgs, WithClause } from "./tools/searchAll.js";
import { READ_APEX, handleReadApex, ReadApexArgs } from "./tools/readApex.js";
import { WRITE_APEX, handleWriteApex, WriteApexArgs } from "./tools/writeApex.js";
import { READ_APEX_TRIGGER, handleReadApexTrigger, ReadApexTriggerArgs } from "./tools/readApexTrigger.js";
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger, WriteApexTriggerArgs } from "./tools/writeApexTrigger.js";
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous, ExecuteAnonymousArgs } from "./tools/executeAnonymous.js";
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs, ManageDebugLogsArgs } from "./tools/manageDebugLogs.js";

dotenv.config();

// Global connection for classic MCP server (configured once)
let globalConnection: any;
let globalCredentials: SalesforceCredentials | undefined;

// Initialize connection from environment variables
async function initializeConnection() {
  try {
    // Check for required credentials
    const accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("❌ SALESFORCE_ACCESS_TOKEN is required for classic MCP server");
      console.error("💡 Get it from: sf org display --verbose (look for 'Access Token')");
      process.exit(1);
    }

    // We need instance URL - try to get from access token or require it
    let instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
    if (!instanceUrl) {
      console.error("❌ SALESFORCE_INSTANCE_URL is required for classic MCP server");
      console.error("💡 Example: https://your-org.my.salesforce.com");
      process.exit(1);
    }

    globalCredentials = {
      instanceUrl,
      accessToken
    };

    globalConnection = await createSalesforceConnection(globalCredentials);
    console.error(`✅ Connected to Salesforce: ${instanceUrl}`);
  } catch (error) {
    console.error("❌ Failed to initialize Salesforce connection:", error);
    process.exit(1);
  }
}

const server = new Server(
  {
    name: "salesforce-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Classic MCP tool definitions (without auth parameters)
const CLASSIC_MCP_TOOLS = [
  {
    ...SEARCH_OBJECTS,
    inputSchema: {
      type: "object",
      properties: {
        searchPattern: {
          type: "string",
          description: "Search pattern to find objects (e.g., 'Account Coverage' will find objects like 'AccountCoverage__c')"
        }
      },
      required: ["searchPattern"]
    }
  },
  {
    ...DESCRIBE_OBJECT,
    inputSchema: {
      type: "object",
      properties: {
        objectName: {
          type: "string",
          description: "API name of the Salesforce object to describe"
        }
      },
      required: ["objectName"]
    }
  },
  {
    ...QUERY_RECORDS,
    inputSchema: {
      type: "object",
      properties: {
        objectName: {
          type: "string",
          description: "API name of the object to query"
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "List of fields to select"
        },
        whereClause: {
          type: "string",
          description: "Optional WHERE clause for filtering"
        },
        orderBy: {
          type: "string",
          description: "Optional ORDER BY clause"
        },
        limit: {
          type: "number",
          description: "Optional limit for number of records"
        }
      },
      required: ["objectName", "fields"]
    }
  },
  {
    ...AGGREGATE_QUERY,
    inputSchema: {
      type: "object",
      properties: {
        objectName: {
          type: "string",
          description: "API name of the object to query"
        },
        selectFields: {
          type: "array",
          items: { type: "string" },
          description: "List of select fields (including aggregate functions)"
        },
        groupByFields: {
          type: "array",
          items: { type: "string" },
          description: "List of fields to group by"
        },
        whereClause: {
          type: "string",
          description: "Optional WHERE clause for filtering"
        },
        havingClause: {
          type: "string",
          description: "Optional HAVING clause for grouped data filtering"
        },
        orderBy: {
          type: "string",
          description: "Optional ORDER BY clause"
        },
        limit: {
          type: "number",
          description: "Optional limit for number of records"
        }
      },
      required: ["objectName", "selectFields", "groupByFields"]
    }
  },
  {
    ...DML_RECORDS,
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["insert", "update", "delete", "upsert"],
          description: "Type of DML operation to perform"
        },
        objectName: {
          type: "string",
          description: "API name of the object"
        },
        records: {
          type: "array",
          items: { type: "object" },
          description: "Array of records to process"
        },
        externalIdField: {
          type: "string",
          description: "External ID field name for upsert operations"
        }
      },
      required: ["operation", "objectName", "records"]
    }
  },
  {
    ...SEARCH_ALL,
    inputSchema: {
      type: "object",
      properties: {
        searchTerm: {
          type: "string",
          description: "The search term to find across objects"
        },
        searchIn: {
          type: "string",
          enum: ["ALL FIELDS", "NAME FIELDS", "EMAIL FIELDS", "PHONE FIELDS", "SIDEBAR FIELDS"],
          description: "Where to search"
        },
        objects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              fields: { type: "array", items: { type: "string" } },
              where: { type: "string" },
              orderBy: { type: "string" },
              limit: { type: "number" }
            },
            required: ["name", "fields"]
          },
          description: "Objects to search in"
        },
        withClauses: {
          type: "array",
          description: "Optional WITH clauses"
        },
        updateable: {
          type: "boolean",
          description: "Only return updateable objects"
        },
        viewable: {
          type: "boolean", 
          description: "Only return viewable objects"
        }
      },
      required: ["searchTerm", "objects"]
    }
  },
  {
    ...READ_APEX,
    inputSchema: {
      type: "object",
      properties: {
        className: {
          type: "string",
          description: "Name of the Apex class to read"
        },
        namePattern: {
          type: "string",
          description: "Pattern to match class names (supports wildcards * and ?)"
        },
        includeMetadata: {
          type: "boolean",
          description: "Include metadata information"
        }
      }
    }
  },
  {
    ...WRITE_APEX,
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["create", "update"],
          description: "Whether to create new class or update existing"
        },
        className: {
          type: "string",
          description: "Name of the Apex class"
        },
        apiVersion: {
          type: "string",
          description: "API version for the class"
        },
        body: {
          type: "string",
          description: "Apex class source code"
        }
      },
      required: ["operation", "className", "body"]
    }
  },
  {
    ...READ_APEX_TRIGGER,
    inputSchema: {
      type: "object",
      properties: {
        triggerName: {
          type: "string",
          description: "Name of the Apex trigger to read"
        },
        namePattern: {
          type: "string",
          description: "Pattern to match trigger names (supports wildcards * and ?)"
        },
        includeMetadata: {
          type: "boolean",
          description: "Include metadata information"
        }
      }
    }
  },
  {
    ...WRITE_APEX_TRIGGER,
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["create", "update"],
          description: "Whether to create new trigger or update existing"
        },
        triggerName: {
          type: "string",
          description: "Name of the Apex trigger"
        },
        objectName: {
          type: "string",
          description: "Name of the object the trigger is for"
        },
        apiVersion: {
          type: "string",
          description: "API version for the trigger"
        },
        body: {
          type: "string",
          description: "Apex trigger source code"
        }
      },
      required: ["operation", "triggerName", "body"]
    }
  },
  {
    ...EXECUTE_ANONYMOUS,
    inputSchema: {
      type: "object",
      properties: {
        apexCode: {
          type: "string",
          description: "Apex code to execute"
        },
        logLevel: {
          type: "string",
          enum: ["NONE", "ERROR", "WARN", "INFO", "DEBUG", "FINE", "FINER", "FINEST"],
          description: "Debug log level"
        }
      },
      required: ["apexCode"]
    }
  },
  {
    ...MANAGE_DEBUG_LOGS,
    inputSchema: {
      type: "object", 
      properties: {
        operation: {
          type: "string",
          enum: ["enable", "disable", "retrieve"],
          description: "Debug log operation to perform"
        },
        username: {
          type: "string",
          description: "Username for debug log management"
        },
        logLevel: {
          type: "string",
          enum: ["NONE", "ERROR", "WARN", "INFO", "DEBUG", "FINE", "FINER", "FINEST"],
          description: "Debug log level"
        },
        expirationTime: {
          type: "number",
          description: "Expiration time in minutes"
        },
        limit: {
          type: "number",
          description: "Number of logs to retrieve"
        },
        logId: {
          type: "string",
          description: "Specific log ID to retrieve"
        },
        includeBody: {
          type: "boolean",
          description: "Include log body content"
        }
      },
      required: ["operation", "username"]
    }
  }
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: CLASSIC_MCP_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    if (!args) throw new Error('Arguments are required');

    // Use global connection for classic MCP server
    if (!globalConnection || !globalCredentials) {
      throw new Error('Salesforce connection not initialized. Check your environment variables.');
    }

    switch (name) {
      case "salesforce_search_objects": {
        const { searchPattern } = args as { searchPattern: string };
        if (!searchPattern) throw new Error('searchPattern is required');
        return await handleSearchObjects(globalConnection, searchPattern);
      }

      case "salesforce_describe_object": {
        const { objectName } = args as { objectName: string };
        if (!objectName) throw new Error('objectName is required');
        return await handleDescribeObject(globalConnection, objectName);
      }

      case "salesforce_query_records": {
        if (!args.objectName || !Array.isArray(args.fields)) {
          throw new Error('objectName and fields array are required for query');
        }
        // Type check and conversion - include auth parameters for the handler
        const validatedArgs: QueryArgs = {
          instanceUrl: globalCredentials.instanceUrl,
          accessToken: globalCredentials.accessToken,
          objectName: args.objectName as string,
          fields: args.fields as string[],
          whereClause: args.whereClause as string | undefined,
          orderBy: args.orderBy as string | undefined,
          limit: args.limit as number | undefined
        };
        return await handleQueryRecords(globalConnection, validatedArgs);
      }

      case "salesforce_aggregate_query": {
        const aggregateArgs = args as Record<string, unknown>;
        if (!aggregateArgs.objectName || !Array.isArray(aggregateArgs.selectFields) || !Array.isArray(aggregateArgs.groupByFields)) {
          throw new Error('objectName, selectFields array, and groupByFields array are required for aggregate query');
        }
        // Type check and conversion
        const validatedArgs: AggregateQueryArgs = {
          objectName: aggregateArgs.objectName as string,
          selectFields: aggregateArgs.selectFields as string[],
          groupByFields: aggregateArgs.groupByFields as string[],
          whereClause: aggregateArgs.whereClause as string | undefined,
          havingClause: aggregateArgs.havingClause as string | undefined,
          orderBy: aggregateArgs.orderBy as string | undefined,
          limit: aggregateArgs.limit as number | undefined
        };
        return await handleAggregateQuery(globalConnection, validatedArgs);
      }

      case "salesforce_dml_records": {
        if (!args.operation || !args.objectName || !Array.isArray(args.records)) {
          throw new Error('operation, objectName, and records array are required for DML');
        }
        const validatedArgs: DMLArgs = {
          operation: args.operation as 'insert' | 'update' | 'delete' | 'upsert',
          objectName: args.objectName as string,
          records: args.records as Record<string, any>[],
          externalIdField: args.externalIdField as string | undefined
        };
        return await handleDMLRecords(globalConnection, validatedArgs);
      }

      case "salesforce_manage_object": {
        const objectArgs = args as Record<string, unknown>;
        if (!objectArgs.operation || !objectArgs.objectName) {
          throw new Error('operation and objectName are required for object management');
        }
        const validatedArgs: ManageObjectArgs = {
          operation: objectArgs.operation as 'create' | 'update',
          objectName: objectArgs.objectName as string,
          label: objectArgs.label as string | undefined,
          pluralLabel: objectArgs.pluralLabel as string | undefined,
          description: objectArgs.description as string | undefined,
          nameFieldLabel: objectArgs.nameFieldLabel as string | undefined,
          nameFieldType: objectArgs.nameFieldType as 'Text' | 'AutoNumber' | undefined,
          nameFieldFormat: objectArgs.nameFieldFormat as string | undefined,
          sharingModel: objectArgs.sharingModel as 'ReadWrite' | 'Read' | 'Private' | 'ControlledByParent' | undefined
        };
        return await handleManageObject(globalConnection, validatedArgs);
      }

      case "salesforce_manage_field": {
        const fieldArgs = args as Record<string, unknown>;
        if (!fieldArgs.operation || !fieldArgs.objectName || !fieldArgs.fieldName) {
          throw new Error('operation, objectName, and fieldName are required for field management');
        }
        const validatedArgs: ManageFieldArgs = {
          operation: fieldArgs.operation as 'create' | 'update',
          objectName: fieldArgs.objectName as string,
          fieldName: fieldArgs.fieldName as string,
          label: fieldArgs.label as string | undefined,
          type: fieldArgs.type as string | undefined,
          required: fieldArgs.required as boolean | undefined,
          unique: fieldArgs.unique as boolean | undefined,
          externalId: fieldArgs.externalId as boolean | undefined,
          length: fieldArgs.length as number | undefined,
          precision: fieldArgs.precision as number | undefined,
          scale: fieldArgs.scale as number | undefined,
          referenceTo: fieldArgs.referenceTo as string | undefined,
          relationshipLabel: fieldArgs.relationshipLabel as string | undefined,
          relationshipName: fieldArgs.relationshipName as string | undefined,
          deleteConstraint: fieldArgs.deleteConstraint as 'Cascade' | 'Restrict' | 'SetNull' | undefined,
          picklistValues: fieldArgs.picklistValues as Array<{ label: string; isDefault?: boolean }> | undefined,
          description: fieldArgs.description as string | undefined,
          grantAccessTo: fieldArgs.grantAccessTo as string[] | undefined
        };
        return await handleManageField(globalConnection, validatedArgs);
      }

      case "salesforce_manage_field_permissions": {
        const permArgs = args as Record<string, unknown>;
        if (!permArgs.operation || !permArgs.objectName || !permArgs.fieldName) {
          throw new Error('operation, objectName, and fieldName are required for field permissions management');
        }
        const validatedArgs: ManageFieldPermissionsArgs = {
          operation: permArgs.operation as 'grant' | 'revoke' | 'view',
          objectName: permArgs.objectName as string,
          fieldName: permArgs.fieldName as string,
          profileNames: permArgs.profileNames as string[] | undefined,
          readable: permArgs.readable as boolean | undefined,
          editable: permArgs.editable as boolean | undefined
        };
        return await handleManageFieldPermissions(globalConnection, validatedArgs);
      }

      case "salesforce_search_all": {
        const searchArgs = args as Record<string, unknown>;
        if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
          throw new Error('searchTerm and objects array are required for search');
        }

        // Validate objects array
        const objects = searchArgs.objects as Array<Record<string, unknown>>;
        if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
          throw new Error('Each object must specify name and fields array');
        }

        // Type check and conversion
        const validatedArgs: SearchAllArgs = {
          searchTerm: searchArgs.searchTerm as string,
          searchIn: searchArgs.searchIn as "ALL FIELDS" | "NAME FIELDS" | "EMAIL FIELDS" | "PHONE FIELDS" | "SIDEBAR FIELDS" | undefined,
          objects: objects.map(obj => ({
            name: obj.name as string,
            fields: obj.fields as string[],
            where: obj.where as string | undefined,
            orderBy: obj.orderBy as string | undefined,
            limit: obj.limit as number | undefined
          })),
          withClauses: searchArgs.withClauses as WithClause[] | undefined,
          updateable: searchArgs.updateable as boolean | undefined,
          viewable: searchArgs.viewable as boolean | undefined
        };

        return await handleSearchAll(globalConnection, validatedArgs);
      }

      case "salesforce_read_apex": {
        const apexArgs = args as Record<string, unknown>;
        
        // Type check and conversion
        const validatedArgs: ReadApexArgs = {
          className: apexArgs.className as string | undefined,
          namePattern: apexArgs.namePattern as string | undefined,
          includeMetadata: apexArgs.includeMetadata as boolean | undefined
        };

        return await handleReadApex(globalConnection, validatedArgs);
      }

      case "salesforce_write_apex": {
        const apexArgs = args as Record<string, unknown>;
        if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
          throw new Error('operation, className, and body are required for writing Apex');
        }
        
        // Type check and conversion
        const validatedArgs: WriteApexArgs = {
          operation: apexArgs.operation as 'create' | 'update',
          className: apexArgs.className as string,
          apiVersion: apexArgs.apiVersion as string | undefined,
          body: apexArgs.body as string
        };

        return await handleWriteApex(globalConnection, validatedArgs);
      }

      case "salesforce_read_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        
        // Type check and conversion
        const validatedArgs: ReadApexTriggerArgs = {
          triggerName: triggerArgs.triggerName as string | undefined,
          namePattern: triggerArgs.namePattern as string | undefined,
          includeMetadata: triggerArgs.includeMetadata as boolean | undefined
        };

        return await handleReadApexTrigger(globalConnection, validatedArgs);
      }

      case "salesforce_write_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
          throw new Error('operation, triggerName, and body are required for writing Apex trigger');
        }
        
        // Type check and conversion
        const validatedArgs: WriteApexTriggerArgs = {
          operation: triggerArgs.operation as 'create' | 'update',
          triggerName: triggerArgs.triggerName as string,
          objectName: triggerArgs.objectName as string | undefined,
          apiVersion: triggerArgs.apiVersion as string | undefined,
          body: triggerArgs.body as string
        };

        return await handleWriteApexTrigger(globalConnection, validatedArgs);
      }

      case "salesforce_execute_anonymous": {
        const executeArgs = args as Record<string, unknown>;
        if (!executeArgs.apexCode) {
          throw new Error('apexCode is required for executing anonymous Apex');
        }
        
        // Type check and conversion
        const validatedArgs: ExecuteAnonymousArgs = {
          apexCode: executeArgs.apexCode as string,
          logLevel: executeArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined
        };

        return await handleExecuteAnonymous(globalConnection, validatedArgs);
      }

      case "salesforce_manage_debug_logs": {
        const debugLogsArgs = args as Record<string, unknown>;
        if (!debugLogsArgs.operation || !debugLogsArgs.username) {
          throw new Error('operation and username are required for managing debug logs');
        }
        
        // Type check and conversion
        const validatedArgs: ManageDebugLogsArgs = {
          operation: debugLogsArgs.operation as 'enable' | 'disable' | 'retrieve',
          username: debugLogsArgs.username as string,
          logLevel: debugLogsArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined,
          expirationTime: debugLogsArgs.expirationTime as number | undefined,
          limit: debugLogsArgs.limit as number | undefined,
          logId: debugLogsArgs.logId as string | undefined,
          includeBody: debugLogsArgs.includeBody as boolean | undefined
        };

        return await handleManageDebugLogs(globalConnection, validatedArgs);
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

async function runServer() {
  // Initialize connection first
  await initializeConnection();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Salesforce MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("❌ Fatal error running server:", error);
  process.exit(1);
});