#!/usr/bin/env node

/**
 * Example: Using Salesforce MCP Server with LangChain via HTTP (Node.js)
 * 
 * This example demonstrates how to integrate the Salesforce MCP Server 
 * with LangChain using HTTP requests for tool calling in Node.js.
 * 
 * Requirements:
 *     npm install langchain @langchain/openai axios dotenv
 * 
 * Usage:
 *     1. Start the MCP HTTP server: npm run start:http
 *     2. Set your OpenAI API key in environment or .env file  
 *     3. Run this script: node examples/langchain-integration.js
 */

import axios from 'axios';
import { DynamicTool } from 'langchain/tools';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

class SalesforceMCPTool extends DynamicTool {
    constructor(toolName, description, serverUrl = 'http://localhost:3000', apiKey = null) {
        super({
            name: toolName,
            description: description,
            func: async (input) => {
                try {
                    // Parse input if it's a string
                    let params;
                    if (typeof input === 'string') {
                        try {
                            params = JSON.parse(input);
                        } catch (e) {
                            // If not JSON, create a simple object
                            params = { input: input };
                        }
                    } else {
                        params = input;
                    }

                    const headers = { 'Content-Type': 'application/json' };
                    if (apiKey) {
                        headers['X-API-Key'] = apiKey;
                    }

                    const response = await axios.post(
                        `${serverUrl.replace(/\/$/, '')}/tools/${toolName}`,
                        params,
                        { 
                            headers,
                            timeout: 30000 
                        }
                    );

                    if (response.data.success) {
                        const data = response.data.data;
                        return typeof data === 'object' 
                            ? JSON.stringify(data, null, 2) 
                            : String(data);
                    } else {
                        return `Error: ${response.data.error || 'Unknown error'}`;
                    }
                } catch (error) {
                    if (error.response) {
                        return `HTTP Error ${error.response.status}: ${error.response.data?.error || error.message}`;
                    } else if (error.request) {
                        return `Network Error: Could not connect to MCP server at ${serverUrl}`;
                    } else {
                        return `Tool Error: ${error.message}`;
                    }
                }
            }
        });
    }
}

function createSalesforceTools(serverUrl = 'http://localhost:3000', apiKey = null) {
    return [
        new SalesforceMCPTool(
            'salesforce_search_objects',
            'Search for Salesforce objects by name pattern. Input should be JSON with "searchPattern" field.',
            serverUrl,
            apiKey
        ),
        new SalesforceMCPTool(
            'salesforce_describe_object',
            'Get detailed information about a Salesforce object. Input should be JSON with "objectName" field.',
            serverUrl,
            apiKey
        ),
        new SalesforceMCPTool(
            'salesforce_query_records',
            'Query Salesforce records. Input should be JSON with "objectName", "fields" array, and optional "whereClause", "orderBy", "limit".',
            serverUrl,
            apiKey
        ),
        new SalesforceMCPTool(
            'salesforce_dml_records',
            'Modify Salesforce records. Input should be JSON with "operation" (insert/update/delete/upsert), "objectName", "records" array.',
            serverUrl,
            apiKey
        ),
        new SalesforceMCPTool(
            'salesforce_search_all',
            'Search across multiple Salesforce objects. Input should be JSON with "searchTerm", "objects" array.',
            serverUrl,
            apiKey
        ),
    ];
}

async function testServerConnection(serverUrl, apiKey) {
    try {
        const headers = apiKey ? { 'X-API-Key': apiKey } : {};
        const response = await axios.get(`${serverUrl}/health`, { headers });
        console.log(`✓ Connected to MCP server at ${serverUrl}`);
        return true;
    } catch (error) {
        console.log(`✗ Failed to connect to MCP server: ${error.message}`);
        console.log(`Make sure the server is running with: npm run start:http`);
        return false;
    }
}

async function main() {
    // Configuration
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
    const MCP_API_KEY = process.env.MCP_API_KEY; // Optional

    if (!OPENAI_API_KEY) {
        console.error('Error: OPENAI_API_KEY environment variable is required');
        return;
    }

    // Test server connectivity
    const connected = await testServerConnection(MCP_SERVER_URL, MCP_API_KEY);
    if (!connected) {
        return;
    }

    // Initialize LangChain components
    const llm = new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0,
        openAIApiKey: OPENAI_API_KEY,
    });

    // Create Salesforce tools
    const tools = createSalesforceTools(MCP_SERVER_URL, MCP_API_KEY);

    // Create agent prompt
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', `You are a Salesforce expert assistant that can help users interact with their Salesforce org.
You have access to various Salesforce tools to:
- Search for objects and get their details
- Query records from any object  
- Create, update, and delete records
- Search across multiple objects

When using tools, make sure to provide proper JSON input format as described in the tool descriptions.
Always provide clear, helpful responses and explain what you're doing.
When querying records, start with a small limit (like 5-10) unless the user specifically asks for more.`],
        ['human', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
    ]);

    // Create agent
    const agent = await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: true,
    });

    console.log('\n🤖 Salesforce LangChain Agent Ready!');
    console.log('Example queries:');
    console.log("- 'Find all account records created this month'");
    console.log("- 'Show me the fields available in the Contact object'");
    console.log("- 'Search for opportunities with amount greater than 100000'");
    console.log("- 'Create a new account with name Test Company'");
    console.log("Type 'quit' to exit\n");

    // Interactive loop
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (question) => {
        return new Promise((resolve) => {
            rl.question(question, resolve);
        });
    };

    while (true) {
        try {
            const userInput = await askQuestion('🗣️  Ask me about your Salesforce org: ');

            if (userInput.trim().toLowerCase() === 'quit') {
                console.log('👋 Goodbye!');
                break;
            }

            if (!userInput.trim()) {
                continue;
            }

            console.log(`\n🔍 Processing: ${userInput}`);
            const result = await agentExecutor.invoke({ input: userInput });
            console.log(`\n✅ Result:\n${result.output}\n`);

        } catch (error) {
            console.log(`\n❌ Error: ${error.message}\n`);
        }
    }

    rl.close();
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye!');
    process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
