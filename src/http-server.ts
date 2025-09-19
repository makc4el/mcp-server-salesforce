#!/usr/bin/env node

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

const app = express();
const port = process.env.PORT || 3000;

// Middleware - Enhanced CORS for LangChain Platform compatibility
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from LangChain Platform domains and configured origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const langchainDomains = [
      'https://smith.langchain.com',
      'https://api.smith.langchain.com',
      /^https:\/\/.*\.smith\.langchain\.com$/,
      /^https:\/\/.*\.langchain\.com$/
    ];
    
    // Allow all origins if no specific origins configured
    if (!origin || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check if origin matches LangChain domains
    const isLangChainDomain = langchainDomains.some(domain => {
      if (domain instanceof RegExp) {
        return domain.test(origin);
      }
      return origin === domain;
    });
    
    if (isLangChainDomain) {
      return callback(null, true);
    }
    
    // Reject origin
    callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key', 
    'X-Salesforce-Credentials',  // Our custom header
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
  credentials: true,
  maxAge: 86400  // 24 hours preflight cache
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request details in development/debug mode
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
    console.log(`[${requestId}] ${req.method} ${req.path} - Headers:`, {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? '[PRESENT]' : '[MISSING]',
      'x-salesforce-credentials': req.get('x-salesforce-credentials') ? '[PRESENT]' : '[MISSING]',
      'origin': req.get('origin')
    });
  }
  
  // Add response time logging
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.log(`[${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });

  // Set response time header before response is sent
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Authentication middleware (optional API key protection)
const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.API_KEY;
  
  // If no API key is configured, skip authentication
  if (!apiKey) {
    return next();
  }
  
  const providedKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!providedKey || providedKey !== apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API key'
    });
  }
  
  next();
};

// Apply authentication to all routes
app.use(authenticateRequest);

// Helper function to parse dynamic Salesforce credentials from headers
function parseSalesforceCredentials(req: Request): SalesforceCredentials | undefined {
  const credentialsHeader = req.header('X-Salesforce-Credentials');
  
  if (!credentialsHeader) {
    return undefined;
  }
  
  try {
    const parsed = JSON.parse(credentialsHeader);
    
    // Validate required fields
    if (!parsed.instanceUrl) {
      console.warn('Missing instanceUrl in X-Salesforce-Credentials header');
      return undefined;
    }
    
    // Must have accessToken (auth codes no longer supported)
    if (!parsed.accessToken) {
      console.warn('Missing accessToken in X-Salesforce-Credentials header. Auth codes are no longer supported - please exchange for access token externally.');
      return undefined;
    }
    
    console.log(`📋 Parsed dynamic credentials: instanceUrl=${parsed.instanceUrl}, hasAccessToken=${!!parsed.accessToken}`);
    
    return {
      instanceUrl: parsed.instanceUrl,
      accessToken: parsed.accessToken
    };
  } catch (error) {
    console.error('Failed to parse X-Salesforce-Credentials header:', error);
    return undefined;
  }
}

// Enhanced health check endpoint for monitoring
app.get('/health', (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'mcp-salesforce-http-server',
    version: process.env.npm_package_version || '1.0.0',
    uptime: {
      seconds: uptime,
      human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      port: port,
      hasApiKey: !!process.env.API_KEY,
      hasOAuthConfig: !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET)
    },
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
      supportsLangChain: true
    },
    endpoints: {
      mcp: '/mcp',
      tools: '/tools',
      toolExecution: '/tools/{toolName}',
      health: '/health'
    }
  });
});

// Liveness probe for Kubernetes/Railway
app.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe for Kubernetes/Railway
app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Test basic functionality - can we create a connection?
    // This doesn't actually connect to Salesforce, just tests our setup
    const hasRequiredConfig = process.env.SALESFORCE_CLIENT_ID || process.env.SALESFORCE_CLIENT_SECRET;
    
    res.status(200).json({
      status: 'ready',
      checks: {
        server: 'ok',
        config: hasRequiredConfig ? 'ok' : 'partial',
        memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024 ? 'ok' : 'high' // 500MB threshold
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// List all available tools
app.get('/tools', (req: Request, res: Response) => {
  const tools = [
    SEARCH_OBJECTS,
    DESCRIBE_OBJECT,
    QUERY_RECORDS,
    AGGREGATE_QUERY,
    DML_RECORDS,
    MANAGE_OBJECT,
    MANAGE_FIELD,
    MANAGE_FIELD_PERMISSIONS,
    SEARCH_ALL,
    READ_APEX,
    WRITE_APEX,
    READ_APEX_TRIGGER,
    WRITE_APEX_TRIGGER,
    EXECUTE_ANONYMOUS,
    MANAGE_DEBUG_LOGS
  ];

  res.json({
    success: true,
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  });
});

// Generic tool execution endpoint
app.post('/tools/:toolName', async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    if (!args) {
      return res.status(400).json({
        success: false,
        error: 'Request body with arguments is required'
      });
    }

    // Parse dynamic Salesforce credentials from headers
    const dynamicCredentials = parseSalesforceCredentials(req);
    
    if (!dynamicCredentials) {
      return res.status(401).json({
        error: 'X-Salesforce-Credentials header is required with instanceUrl and accessToken'
      });
    }
    
    // Create Salesforce connection with dynamic credentials
    const conn = await createSalesforceConnection(dynamicCredentials);
    let result: any;

    switch (toolName) {
      case "salesforce_search_objects": {
        const { searchPattern } = args as { searchPattern: string };
        if (!searchPattern) throw new Error('searchPattern is required');
        result = await handleSearchObjects(conn, searchPattern);
        break;
      }

      case "salesforce_describe_object": {
        const { objectName } = args as { objectName: string };
        if (!objectName) throw new Error('objectName is required');
        result = await handleDescribeObject(conn, objectName);
        break;
      }

      case "salesforce_query_records": {
        const queryArgs = args as Record<string, unknown>;
        if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
          throw new Error('objectName and fields array are required for query');
        }
        const validatedArgs: QueryArgs = {
          instanceUrl: dynamicCredentials.instanceUrl,
          accessToken: dynamicCredentials.accessToken,
          objectName: queryArgs.objectName as string,
          fields: queryArgs.fields as string[],
          whereClause: queryArgs.whereClause as string | undefined,
          orderBy: queryArgs.orderBy as string | undefined,
          limit: queryArgs.limit as number | undefined
        };
        result = await handleQueryRecords(conn, validatedArgs);
        break;
      }

      case "salesforce_aggregate_query": {
        const aggregateArgs = args as Record<string, unknown>;
        if (!aggregateArgs.objectName || !Array.isArray(aggregateArgs.selectFields) || !Array.isArray(aggregateArgs.groupByFields)) {
          throw new Error('objectName, selectFields array, and groupByFields array are required for aggregate query');
        }
        const validatedArgs: AggregateQueryArgs = {
          objectName: aggregateArgs.objectName as string,
          selectFields: aggregateArgs.selectFields as string[],
          groupByFields: aggregateArgs.groupByFields as string[],
          whereClause: aggregateArgs.whereClause as string | undefined,
          havingClause: aggregateArgs.havingClause as string | undefined,
          orderBy: aggregateArgs.orderBy as string | undefined,
          limit: aggregateArgs.limit as number | undefined
        };
        result = await handleAggregateQuery(conn, validatedArgs);
        break;
      }

      case "salesforce_dml_records": {
        const dmlArgs = args as Record<string, unknown>;
        if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
          throw new Error('operation, objectName, and records array are required for DML');
        }
        const validatedArgs: DMLArgs = {
          operation: dmlArgs.operation as 'insert' | 'update' | 'delete' | 'upsert',
          objectName: dmlArgs.objectName as string,
          records: dmlArgs.records as Record<string, any>[],
          externalIdField: dmlArgs.externalIdField as string | undefined
        };
        result = await handleDMLRecords(conn, validatedArgs);
        break;
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
        result = await handleManageObject(conn, validatedArgs);
        break;
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
        result = await handleManageField(conn, validatedArgs);
        break;
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
        result = await handleManageFieldPermissions(conn, validatedArgs);
        break;
      }

      case "salesforce_search_all": {
        const searchArgs = args as Record<string, unknown>;
        if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
          throw new Error('searchTerm and objects array are required for search');
        }

        const objects = searchArgs.objects as Array<Record<string, unknown>>;
        if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
          throw new Error('Each object must specify name and fields array');
        }

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

        result = await handleSearchAll(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex": {
        const apexArgs = args as Record<string, unknown>;
        const validatedArgs: ReadApexArgs = {
          className: apexArgs.className as string | undefined,
          namePattern: apexArgs.namePattern as string | undefined,
          includeMetadata: apexArgs.includeMetadata as boolean | undefined
        };
        result = await handleReadApex(conn, validatedArgs);
        break;
      }

      case "salesforce_write_apex": {
        const apexArgs = args as Record<string, unknown>;
        if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
          throw new Error('operation, className, and body are required for writing Apex');
        }
        const validatedArgs: WriteApexArgs = {
          operation: apexArgs.operation as 'create' | 'update',
          className: apexArgs.className as string,
          apiVersion: apexArgs.apiVersion as string | undefined,
          body: apexArgs.body as string
        };
        result = await handleWriteApex(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        const validatedArgs: ReadApexTriggerArgs = {
          triggerName: triggerArgs.triggerName as string | undefined,
          namePattern: triggerArgs.namePattern as string | undefined,
          includeMetadata: triggerArgs.includeMetadata as boolean | undefined
        };
        result = await handleReadApexTrigger(conn, validatedArgs);
        break;
      }

      case "salesforce_write_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
          throw new Error('operation, triggerName, and body are required for writing Apex trigger');
        }
        const validatedArgs: WriteApexTriggerArgs = {
          operation: triggerArgs.operation as 'create' | 'update',
          triggerName: triggerArgs.triggerName as string,
          objectName: triggerArgs.objectName as string | undefined,
          apiVersion: triggerArgs.apiVersion as string | undefined,
          body: triggerArgs.body as string
        };
        result = await handleWriteApexTrigger(conn, validatedArgs);
        break;
      }

      case "salesforce_execute_anonymous": {
        const executeArgs = args as Record<string, unknown>;
        if (!executeArgs.apexCode) {
          throw new Error('apexCode is required for executing anonymous Apex');
        }
        const validatedArgs: ExecuteAnonymousArgs = {
          apexCode: executeArgs.apexCode as string,
          logLevel: executeArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined
        };
        result = await handleExecuteAnonymous(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_debug_logs": {
        const debugLogsArgs = args as Record<string, unknown>;
        if (!debugLogsArgs.operation || !debugLogsArgs.username) {
          throw new Error('operation and username are required for managing debug logs');
        }
        const validatedArgs: ManageDebugLogsArgs = {
          operation: debugLogsArgs.operation as 'enable' | 'disable' | 'retrieve',
          username: debugLogsArgs.username as string,
          logLevel: debugLogsArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined,
          expirationTime: debugLogsArgs.expirationTime as number | undefined,
          limit: debugLogsArgs.limit as number | undefined,
          logId: debugLogsArgs.logId as string | undefined,
          includeBody: debugLogsArgs.includeBody as boolean | undefined
        };
        result = await handleManageDebugLogs(conn, validatedArgs);
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown tool: ${toolName}`
        });
    }

    // Extract content from MCP response format
    let responseData: any;
    if (result && result.content && Array.isArray(result.content)) {
      // Handle MCP format response
      responseData = result.content.map((item: any) => {
        if (item.type === 'text') {
          try {
            // Try to parse as JSON if possible
            return JSON.parse(item.text);
          } catch {
            // Return as text if not JSON
            return { text: item.text };
          }
        }
        return item;
      });

      // If there's only one content item, unwrap it
      if (responseData.length === 1) {
        responseData = responseData[0];
      }
    } else {
      responseData = result;
    }

    res.json({
      success: true,
      tool: toolName,
      data: responseData
    });

  } catch (error) {
    console.error(`Error executing tool ${req.params.toolName}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      tool: req.params.toolName
    });
  }
});

// MCP-style endpoint for LangChain integration
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const { method, params } = req.body;

    if (!method) {
      return res.status(400).json({
        error: 'Method is required'
      });
    }

    // Parse dynamic Salesforce credentials from headers
    const dynamicCredentials = parseSalesforceCredentials(req);

    if (method === 'tools/list') {
      const tools = [
        SEARCH_OBJECTS,
        DESCRIBE_OBJECT,
        QUERY_RECORDS,
        AGGREGATE_QUERY,
        DML_RECORDS,
        MANAGE_OBJECT,
        MANAGE_FIELD,
        MANAGE_FIELD_PERMISSIONS,
        SEARCH_ALL,
        READ_APEX,
        WRITE_APEX,
        READ_APEX_TRIGGER,
        WRITE_APEX_TRIGGER,
        EXECUTE_ANONYMOUS,
        MANAGE_DEBUG_LOGS
      ];

      return res.json({
        result: {
          tools: tools
        }
      });
    }

    if (method === 'tools/call') {
      const { name: toolName, arguments: args } = params;

      if (!toolName || !args) {
        return res.status(400).json({
          error: 'Tool name and arguments are required for tools/call'
        });
      }

      if (!dynamicCredentials) {
        return res.status(401).json({
          error: 'X-Salesforce-Credentials header is required with instanceUrl and accessToken'
        });
      }
      
      // Create Salesforce connection with dynamic credentials
      const conn = await createSalesforceConnection(dynamicCredentials);
      let result: any;

      // Use consistent tool names with /tools endpoint
      switch (toolName) {
        case "salesforce_search_objects": {
          const { searchPattern } = args as { searchPattern: string };
          if (!searchPattern) throw new Error('searchPattern is required');
          result = await handleSearchObjects(conn, searchPattern);
          break;
        }

        case "salesforce_describe_object": {
          const { objectName } = args as { objectName: string };
          if (!objectName) throw new Error('objectName is required');
          result = await handleDescribeObject(conn, objectName);
          break;
        }

        case "salesforce_query_records": {
          const queryArgs = args as Record<string, unknown>;
          if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
            throw new Error('objectName and fields array are required for query');
          }
          const validatedArgs: QueryArgs = {
            instanceUrl: dynamicCredentials.instanceUrl,
            accessToken: dynamicCredentials.accessToken,
            objectName: queryArgs.objectName as string,
            fields: queryArgs.fields as string[],
            whereClause: queryArgs.whereClause as string | undefined,
            orderBy: queryArgs.orderBy as string | undefined,
            limit: queryArgs.limit as number | undefined
          };
          result = await handleQueryRecords(conn, validatedArgs);
          break;
        }

        case "salesforce_aggregate_query": {
          const aggregateArgs = args as Record<string, unknown>;
          if (!aggregateArgs.objectName || !Array.isArray(aggregateArgs.selectFields) || !Array.isArray(aggregateArgs.groupByFields)) {
            throw new Error('objectName, selectFields array, and groupByFields array are required for aggregate query');
          }
          const validatedArgs: AggregateQueryArgs = {
            objectName: aggregateArgs.objectName as string,
            selectFields: aggregateArgs.selectFields as string[],
            groupByFields: aggregateArgs.groupByFields as string[],
            whereClause: aggregateArgs.whereClause as string | undefined,
            havingClause: aggregateArgs.havingClause as string | undefined,
            orderBy: aggregateArgs.orderBy as string | undefined,
            limit: aggregateArgs.limit as number | undefined
          };
          result = await handleAggregateQuery(conn, validatedArgs);
          break;
        }

        case "salesforce_dml_records": {
          const dmlArgs = args as Record<string, unknown>;
          if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
            throw new Error('operation, objectName, and records array are required for DML');
          }
          const validatedArgs: DMLArgs = {
            operation: dmlArgs.operation as 'insert' | 'update' | 'delete' | 'upsert',
            objectName: dmlArgs.objectName as string,
            records: dmlArgs.records as Record<string, any>[],
            externalIdField: dmlArgs.externalIdField as string | undefined
          };
          result = await handleDMLRecords(conn, validatedArgs);
          break;
        }

        case "salesforce_search_all": {
          const searchArgs = args as Record<string, unknown>;
          if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
            throw new Error('searchTerm and objects array are required for search');
          }

          const objects = searchArgs.objects as Array<Record<string, unknown>>;
          if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
            throw new Error('Each object must specify name and fields array');
          }

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

          result = await handleSearchAll(conn, validatedArgs);
          break;
        }

        // Backward compatibility with old tool names (for existing integrations)
        case "search": {
          const { searchTerm } = args as { searchTerm: string };
          if (!searchTerm) throw new Error('searchTerm is required');
          result = await handleSearchObjects(conn, searchTerm);
          break;
        }

        case "describe": {
          const { objectName } = args as { objectName: string };
          if (!objectName) throw new Error('objectName is required');
          result = await handleDescribeObject(conn, objectName);
          break;
        }

        case "query": {
          const { query } = args as { query: string };
          if (!query) throw new Error('query is required');
          
          // For simple SOQL queries, use handleQueryRecords with parsed query
          const queryResult = await conn.query(query);
          result = {
            content: [{
              type: "text",
              text: JSON.stringify(queryResult.records, null, 2)
            }]
          };
          break;
        }

        case "dml": {
          const dmlArgs = args as Record<string, unknown>;
          if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
            throw new Error('operation, objectName, and records array are required for DML');
          }
          const validatedArgs: DMLArgs = {
            operation: dmlArgs.operation as 'insert' | 'update' | 'delete' | 'upsert',
            objectName: dmlArgs.objectName as string,
            records: dmlArgs.records as Record<string, any>[],
            externalIdField: dmlArgs.externalIdField as string | undefined
          };
          result = await handleDMLRecords(conn, validatedArgs);
          break;
        }

        default:
          return res.status(400).json({
            error: `Unknown tool: ${toolName}. Available tools: salesforce_search_objects, salesforce_describe_object, salesforce_query_records, salesforce_aggregate_query, salesforce_dml_records, salesforce_search_all`
          });
      }

      // Return in MCP format, including any exchanged token info
      const response: any = {
        result: result
      };
      
      // If we exchanged an auth code for an access token, include that info
      if ((global as any).lastExchangedTokenInfo) {
        response.exchanged_token_info = (global as any).lastExchangedTokenInfo;
        // Clear it after including it in the response
        delete (global as any).lastExchangedTokenInfo;
      }
      
      return res.json(response);
    }

    return res.status(400).json({
      error: `Unknown method: ${method}`
    });

  } catch (error) {
    console.error(`Error in MCP endpoint:`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Salesforce MCP HTTP Server running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Tools list: http://localhost:${port}/tools`);
  console.log(`📖 API Documentation: Use POST /tools/{toolName} with JSON body containing tool arguments`);
  
  if (process.env.API_KEY) {
    console.log(`🔑 API Key authentication enabled`);
  } else {
    console.log(`⚠️  No API key configured - server running without authentication`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
