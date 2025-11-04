from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import openai
import json
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Workflow Builder API")

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

class WorkflowRequest(BaseModel):
    user_query: str
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 2000

class ToolNode(BaseModel):
    id: str
    type: str
    name: str
    next_tools: List[str] = []

class WorkflowResponse(BaseModel):
    agent_id: str
    tools: List[ToolNode]
    has_sequential_execution: bool
    description: str
    raw_response: Optional[str] = None

# Available tools in the platform
AVAILABLE_TOOLS = [
    "transfer",
    "swap",
    "stt_balance_fetch",
    "deploy_erc20",
    "deploy_erc721",
    "create_dao",
    "airdrop",
    "fetch_token_price",
    "deposit_with_yield_prediction",
    "wallet_analytics"
]

SYSTEM_PROMPT = """You are an AI that converts natural language descriptions of blockchain agent workflows into structured JSON.

Available tools:
- transfer: Transfer tokens between wallets
- swap: Swap one token for another
- stt_balance_fetch: Fetch balance of tokens
- deploy_erc20: Deploy ERC-20 tokens
- deploy_erc721: Deploy ERC-721 NFT tokens
- create_dao: Create a decentralized autonomous organization
- airdrop: Distribute tokens to multiple addresses
- fetch_token_price: Get the current price of any token
- deposit_with_yield_prediction: Deposit tokens with APY prediction
- wallet_analytics: Analyze wallet statistics and performance

Your task is to analyze the user's request and create a workflow structure with:
1. An agent node (always present, id: "agent_1")
2. Tool nodes that the agent can use
3. Sequential connections when tools should execute in order
4. Parallel connections when tools are independent

Rules:
- The agent node always has id "agent_1" and type "agent"
- Each tool gets a unique id like "tool_1", "tool_2", etc.
- If tools should execute sequentially (one after another), set the next_tools field
- If tools are independent, they connect directly to the agent with empty next_tools
- Sequential execution examples: "airdrop then deposit", "deploy token and then airdrop"
- Parallel execution examples: "agent with multiple tools", "various tools available"
- IMPORTANT: Set has_sequential_execution to true if ANY tool has non-empty next_tools array
- IMPORTANT: Set has_sequential_execution to false ONLY if ALL tools have empty next_tools arrays

Return ONLY valid JSON matching this exact structure:
{
  "agent_id": "agent_1",
  "tools": [
    {
      "id": "tool_1",
      "type": "airdrop",
      "name": "Airdrop Tool",
      "next_tools": ["tool_2"]
    },
    {
      "id": "tool_2",
      "type": "deposit_with_yield_prediction",
      "name": "Deposit with Yield Prediction",
      "next_tools": []
    }
  ],
  "has_sequential_execution": true,
  "description": "Brief description of the workflow"
}"""

@app.post("/create-workflow", response_model=WorkflowResponse)
async def create_workflow(request: WorkflowRequest):
    """
    Convert natural language workflow description to structured JSON
    """
    try:
        logger.info(f"Processing workflow request: {request.user_query}")
        logger.info(f"Temperature: {request.temperature}, Max Tokens: {request.max_tokens}")
        
        # Call OpenAI API with structured output
        response = openai.chat.completions.create(
            model="gpt-4o-2024-08-06",  # Model that supports structured outputs
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.user_query}
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "workflow_schema",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "agent_id": {
                                "type": "string",
                                "description": "The agent node ID"
                            },
                            "tools": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {
                                            "type": "string",
                                            "description": "Unique tool identifier"
                                        },
                                        "type": {
                                            "type": "string",
                                            "enum": AVAILABLE_TOOLS,
                                            "description": "Tool type from available tools"
                                        },
                                        "name": {
                                            "type": "string",
                                            "description": "Human-readable tool name"
                                        },
                                        "next_tools": {
                                            "type": "array",
                                            "items": {
                                                "type": "string"
                                            },
                                            "description": "IDs of tools that execute after this one"
                                        }
                                    },
                                    "required": ["id", "type", "name", "next_tools"],
                                    "additionalProperties": False
                                }
                            },
                            "has_sequential_execution": {
                                "type": "boolean",
                                "description": "Whether workflow has sequential tool execution"
                            },
                            "description": {
                                "type": "string",
                                "description": "Brief description of the workflow"
                            }
                        },
                        "required": ["agent_id", "tools", "has_sequential_execution", "description"],
                        "additionalProperties": False
                    }
                }
            }
        )
        
        # Log raw response
        raw_content = response.choices[0].message.content
        logger.info(f"Raw OpenAI Response: {raw_content}")
        
        # Parse the response
        workflow_data = json.loads(raw_content)
        workflow_data["raw_response"] = raw_content
        
        logger.info(f"Parsed workflow data: {json.dumps(workflow_data, indent=2)}")
        
        return WorkflowResponse(**workflow_data)
    
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invalid JSON response: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.get("/available-tools")
async def get_available_tools():
    """
    Get list of available tools in the platform
    """
    return {"tools": AVAILABLE_TOOLS}

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}

# Example usage
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)