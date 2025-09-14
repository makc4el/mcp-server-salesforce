#!/usr/bin/env python3
"""
Example: Using Salesforce MCP Server with LangChain via HTTP

This example demonstrates how to integrate the Salesforce MCP Server 
with LangChain using HTTP requests for tool calling.

Requirements:
    pip install langchain langchain-openai requests python-dotenv

Usage:
    1. Start the MCP HTTP server: npm run start:http
    2. Set your OpenAI API key in environment or .env file
    3. Run this script: python langchain-integration.py
"""

import os
import json
import requests
from typing import Dict, Any, List
from langchain.tools import BaseTool
from langchain.agents import create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor
from dotenv import load_dotenv

load_dotenv()

class SalesforceMCPTool(BaseTool):
    """LangChain tool that calls Salesforce MCP Server via HTTP"""
    
    def __init__(self, tool_name: str, description: str, server_url: str = "http://localhost:3000", api_key: str = None):
        super().__init__()
        self.name = tool_name
        self.description = description
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        
    def _run(self, **kwargs) -> str:
        """Execute the tool via HTTP request to MCP server"""
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
            
        try:
            response = requests.post(
                f"{self.server_url}/tools/{self.name}",
                json=kwargs,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            if result.get('success'):
                # Format the response for LangChain
                data = result.get('data', {})
                if isinstance(data, dict):
                    return json.dumps(data, indent=2)
                elif isinstance(data, list):
                    return json.dumps(data, indent=2)
                else:
                    return str(data)
            else:
                return f"Error: {result.get('error', 'Unknown error')}"
                
        except requests.exceptions.RequestException as e:
            return f"HTTP request failed: {str(e)}"
        except Exception as e:
            return f"Tool execution failed: {str(e)}"


def create_salesforce_tools(server_url: str = "http://localhost:3000", api_key: str = None) -> List[BaseTool]:
    """Create LangChain tools for common Salesforce operations"""
    
    return [
        SalesforceMCPTool(
            tool_name="salesforce_search_objects",
            description="Search for Salesforce objects by name pattern. Use this to find objects like Account, Contact, Opportunity, etc. Input: searchPattern (string)",
            server_url=server_url,
            api_key=api_key
        ),
        SalesforceMCPTool(
            tool_name="salesforce_describe_object", 
            description="Get detailed information about a Salesforce object including fields, relationships, and properties. Input: objectName (string)",
            server_url=server_url,
            api_key=api_key
        ),
        SalesforceMCPTool(
            tool_name="salesforce_query_records",
            description="Query Salesforce records with SOQL-like syntax. Input: objectName (string), fields (array of strings), whereClause (optional string), orderBy (optional string), limit (optional number)",
            server_url=server_url,
            api_key=api_key
        ),
        SalesforceMCPTool(
            tool_name="salesforce_dml_records",
            description="Insert, update, delete, or upsert Salesforce records. Input: operation (insert|update|delete|upsert), objectName (string), records (array of objects), externalIdField (optional string for upsert)",
            server_url=server_url,
            api_key=api_key
        ),
        SalesforceMCPTool(
            tool_name="salesforce_search_all",
            description="Search across multiple Salesforce objects using SOSL. Input: searchTerm (string), objects (array with name and fields), searchIn (optional scope)",
            server_url=server_url,
            api_key=api_key
        ),
    ]


def main():
    """Main example function"""
    
    # Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:3000")
    MCP_API_KEY = os.getenv("MCP_API_KEY")  # Optional API key for MCP server
    
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY environment variable is required")
        return
    
    # Test MCP server connectivity
    try:
        headers = {'X-API-Key': MCP_API_KEY} if MCP_API_KEY else {}
        response = requests.get(f"{MCP_SERVER_URL}/health", headers=headers)
        response.raise_for_status()
        print(f"✓ Connected to MCP server at {MCP_SERVER_URL}")
    except Exception as e:
        print(f"✗ Failed to connect to MCP server: {e}")
        print(f"Make sure the server is running with: npm run start:http")
        return
    
    # Initialize LangChain components
    llm = ChatOpenAI(
        model="gpt-4",
        temperature=0,
        api_key=OPENAI_API_KEY
    )
    
    # Create Salesforce tools
    tools = create_salesforce_tools(MCP_SERVER_URL, MCP_API_KEY)
    
    # Create agent prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a Salesforce expert assistant that can help users interact with their Salesforce org. 
        You have access to various Salesforce tools to:
        - Search for objects and get their details
        - Query records from any object
        - Create, update, and delete records
        - Search across multiple objects
        
        Always provide clear, helpful responses and explain what you're doing when using Salesforce tools.
        When querying records, start with a small limit (like 5-10) unless the user specifically asks for more.
        """),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # Create agent
    agent = create_openai_functions_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    print("\n🤖 Salesforce LangChain Agent Ready!")
    print("Example queries:")
    print("- 'Find all account records created this month'")
    print("- 'Show me the fields available in the Contact object'")
    print("- 'Search for opportunities with amount greater than 100000'")
    print("- 'Create a new account with name Test Company'")
    print("Type 'quit' to exit\n")
    
    # Interactive loop
    while True:
        try:
            user_input = input("🗣️  Ask me about your Salesforce org: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break
                
            if not user_input:
                continue
                
            print(f"\n🔍 Processing: {user_input}")
            result = agent_executor.invoke({"input": user_input})
            print(f"\n✅ Result:\n{result['output']}\n")
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}\n")


if __name__ == "__main__":
    main()
