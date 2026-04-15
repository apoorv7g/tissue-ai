import json
import httpx
from typing import List, Dict, Any, Optional
from agents_config import Agent, get_enabled_agents

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"

# API endpoints mapping for different models
API_ENDPOINTS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    # "openai": "https://api.openai.com/v1/chat/completions",
}

# JSON Schema for Flowchart structured outputs
FLOWCHART_SCHEMA = {
    "type": "object",
    "properties": {
        "nodes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "type": {"type": "string", "enum": ["start", "process", "decision", "end"]}
                },
                "required": ["id", "label", "type"],
                "additionalProperties": False
            }
        },
        "edges": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "from": {"type": "string"},
                    "to": {"type": "string"},
                    "label": {"type": "string"}
                },
                "required": ["from", "to", "label"],
                "additionalProperties": False
            }
        }
    },
    "required": ["nodes", "edges"],
    "additionalProperties": False
}

# JSON Schema for Mindmap structured outputs (with recursive children)
MINDMAP_NODE_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "label": {"type": "string"},
        "children": {
            "type": "array",
            "items": {"$ref": "#/$defs/node"}
        }
    },
    "required": ["id", "label", "children"],
    "additionalProperties": False
}

MINDMAP_SCHEMA = {
    "type": "object",
    "properties": {
        "root": MINDMAP_NODE_SCHEMA
    },
    "required": ["root"],
    "additionalProperties": False,
    "$defs": {
        "node": MINDMAP_NODE_SCHEMA
    }
}


def build_flowchart_prompt(text: str, complexity: str = "brief") -> str:
    if complexity == "simple":
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a simple JSON flowchart with 3-5 nodes: start, basic process, and end. Minimal.

Format: {{"nodes":[{{"id":"1","label":"Start","type":"start"}},{{"id":"2","label":"Process","type":"process"}},{{"id":"3","label":"End","type":"end"}}],"edges":[{{"from":"1","to":"2","label":""}},{{"from":"2","to":"3","label":""}}]}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text.

Text: {text}"""
    elif complexity == "detailed":
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a detailed JSON flowchart with 8-12 nodes including start, processes, decisions, and end. More depth.

Format: {{"nodes":[{{"id":"1","label":"Start","type":"start"}},{{"id":"2","label":"Process","type":"process"}},{{"id":"3","label":"Decision","type":"decision"}},{{"id":"4","label":"End","type":"end"}}],"edges":[{{"from":"1","to":"2","label":""}},{{"from":"2","to":"3","label":""}}]}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text.

Text: {text}"""
    elif complexity == "extensive":
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a comprehensive JSON flowchart with 15+ nodes including start, multiple processes, decisions, loops, and end. Very detailed.

Format: {{"nodes":[{{"id":"1","label":"Start","type":"start"}},{{"id":"2","label":"Process","type":"process"}},{{"id":"3","label":"Decision","type":"decision"}},{{"id":"4","label":"End","type":"end"}}],"edges":[{{"from":"1","to":"2","label":""}},{{"from":"2","to":"3","label":""}},{{"from":"3","to":"2","label":"Loop"}}]}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text. ONLY JSON.

Text: {text}"""
    else:  # brief (default)
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a balanced JSON flowchart with 5-8 nodes: start, 2-3 processes/decisions, and end. Concise.

Format: {{"nodes":[{{"id":"1","label":"Start","type":"start"}},{{"id":"2","label":"Process","type":"process"}},{{"id":"3","label":"End","type":"end"}}],"edges":[{{"from":"1","to":"2","label":""}},{{"from":"2","to":"3","label":""}}]}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text.

Text: {text}"""


def build_mindmap_prompt(text: str, complexity: str = "brief") -> str:
    if complexity == "simple":
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a JSON mind map with root and 2-3 main branches. Simple.

Format: {{"root":{{"id":"1","label":"RootLabel","children":[{{"id":"2","label":"Branch1","children":[]}},{{"id":"3","label":"Branch2","children":[]}}]}}}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text.

Text: {text}"""
    elif complexity == "detailed":
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a JSON mind map with root, 5-7 main branches, each with 2-3 sub-branches.

Format: {{"root":{{"id":"1","label":"RootLabel","children":[{{"id":"2","label":"Branch1","children":[{{"id":"3","label":"SubBranch","children":[]}}]}},{{"id":"4","label":"Branch2","children":[]}}]}}}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text.

Text: {text}"""
    elif complexity == "extensive":
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks. NO MARKDOWN TABLES.

Create a comprehensive JSON mind map with root, 8+ main branches, many sub-branches (2-3 per branch), reaching 3 levels deep.

Format: {{"root":{{"id":"1","label":"RootLabel","children":[{{"id":"2","label":"Branch1","children":[{{"id":"3","label":"SubBranch1","children":[{{"id":"4","label":"SubSubBranch","children":[]}}]}},{{"id":"5","label":"SubBranch2","children":[]}}]}},{{"id":"6","label":"Branch2","children":[]}}]}}}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No tables. No text. ONLY JSON.

Text: {text}"""
    else:  # brief (default)
        return f"""You MUST return ONLY valid JSON. No text, no markdown, no explanations, no code blocks.

Create a JSON mind map with root and 3-5 main branches (max 2 levels deep). Balanced structure.

Format: {{"root":{{"id":"1","label":"RootLabel","children":[{{"id":"2","label":"Branch1","children":[{{"id":"3","label":"SubBranch","children":[]}}]}},{{"id":"4","label":"Branch2","children":[]}}]}}}}

IMPORTANT: Return ONLY the JSON object above. No markdown. No extra text.

Text: {text}"""


async def generate_diagram_json(
    text: str, 
    diagram_type: str, 
    api_key: str,
    complexity: str = "brief",
    temperature: float = 0.7
) -> dict:
    if diagram_type == "flowchart":
        prompt = build_flowchart_prompt(text, complexity)
        schema = FLOWCHART_SCHEMA
        schema_name = "flowchart"
    else:
        prompt = build_mindmap_prompt(text, complexity)
        schema = MINDMAP_SCHEMA
        schema_name = "mindmap"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    MAX_RETRIES = 2
    last_error = None

    for attempt in range(MAX_RETRIES):
        # Build system message - indicate previous failure if retry
        system_msg = "You are a JSON-only API. Output ONLY valid JSON objects. No markdown. No code blocks. No explanations. No tables. ONLY JSON."
        if attempt > 0:
            system_msg += f"\n\nATTENTION: Previous attempt {attempt} returned invalid format. Ensure output is strictly valid JSON matching the schema. No markdown wrappers, no explanations."

        payload = {
            "model": MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": system_msg,
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": schema
                }
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(GROQ_API_URL, headers=headers, json=payload)

            if response.status_code == 401:
                return {"error": "Invalid Groq API key. Please check and try again.", "data": None}

            if response.status_code != 200:
                last_error = f"Groq API returned status {response.status_code}: {response.text}"
                if attempt < MAX_RETRIES - 1:
                    continue
                return {"error": last_error, "data": None}

            body = response.json()
            content = body["choices"][0]["message"]["content"]

            # Strip markdown fences if LLM wraps them anyway
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            data = json.loads(content)
            return {"error": None, "data": data}

        except json.JSONDecodeError as e:
            last_error = f"LLM returned invalid JSON: {str(e)}"
            if attempt < MAX_RETRIES - 1:
                continue
            return {"error": last_error, "data": None}
        except httpx.TimeoutException:
            return {"error": "Request to Groq API timed out.", "data": None}
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            if attempt < MAX_RETRIES - 1:
                continue
            return {"error": last_error, "data": None}

    return {"error": last_error or "Failed to generate valid diagram after retries.", "data": None}


async def call_llm_agent(
    agent: Agent,
    user_input: str,
    api_key: str,
) -> Dict[str, Any]:
    """
    Call an LLM agent with the given input.
    Returns the agent's response as a dictionary with the output.
    """
    # Determine API endpoint based on model provider
    provider = agent.model.split("/")[0].lower()
    api_url = API_ENDPOINTS.get(provider, GROQ_API_URL)
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": agent.model,
        "messages": [
            {
                "role": "system",
                "content": agent.system_prompt,
            },
            {
                "role": "user",
                "content": user_input,
            },
        ],
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, headers=headers, json=payload)

        if response.status_code == 401:
            return {
                "error": f"Invalid API key for {agent.name}",
                "output": None,
                "agent_id": agent.id,
            }

        if response.status_code != 200:
            return {
                "error": f"API returned status {response.status_code}: {response.text}",
                "output": None,
                "agent_id": agent.id,
            }

        body = response.json()
        content = body["choices"][0]["message"]["content"]
        
        return {
            "error": None,
            "output": content.strip(),
            "agent_id": agent.id,
            "agent_name": agent.name,
        }

    except httpx.TimeoutException:
        return {
            "error": f"Request to {agent.name} timed out.",
            "output": None,
            "agent_id": agent.id,
        }
    except Exception as e:
        return {
            "error": f"Error in {agent.name}: {str(e)}",
            "output": None,
            "agent_id": agent.id,
        }


async def run_multi_agent_pipeline(
    initial_input: str,
    agents: List[Agent],
    api_key: str,
) -> Dict[str, Any]:
    """
    Run a sequence of agents, passing output from one as input to the next.
    Returns all agent outputs in order.
    """
    enabled_agents = get_enabled_agents(agents)
    
    if not enabled_agents:
        return {
            "error": "No agents enabled in pipeline",
            "pipeline_outputs": [],
        }

    pipeline_outputs = []
    current_input = initial_input

    for agent in enabled_agents:
        result = await call_llm_agent(agent, current_input, api_key)
        
        pipeline_outputs.append({
            "agent_id": agent.id,
            "agent_name": agent.name,
            "agent_type": agent.type.value,
            "output": result.get("output"),
            "error": result.get("error"),
        })

        if result.get("error"):
            return {
                "error": result["error"],
                "pipeline_outputs": pipeline_outputs,
            }

        # Next agent's input is the current agent's output
        current_input = result["output"]

    return {
        "error": None,
        "pipeline_outputs": pipeline_outputs,
        "final_agent_output": current_input,
    }


def build_diagram_prompt_with_context(
    text: str,
    diagram_type: str,
    agent_outputs: Optional[List[str]] = None,
    complexity: str = "brief",
) -> str:
    """
    Build a diagram prompt that incorporates outputs from the multi-agent pipeline.
    If agent outputs are provided, they're used as context.
    """
    context = ""
    if agent_outputs:
        context = "Context from processing pipeline:\n"
        for i, output in enumerate(agent_outputs, 1):
            context += f"\n--- Agent Analysis {i} ---\n{output}\n"
        context += "\nBased on the above analysis and the original input, create the diagram:\n"

    if diagram_type == "flowchart":
        base_prompt = build_flowchart_prompt(text, complexity)
    else:
        base_prompt = build_mindmap_prompt(text, complexity)

    if agent_outputs:
        # Insert context into the prompt
        return context + base_prompt
    
    return base_prompt


async def generate_diagram_with_agents(
    text: str,
    diagram_type: str,
    api_key: str,
    agents: List[Agent],
    complexity: str = "brief",
    temperature: float = 0.7,
) -> Dict[str, Any]:
    """
    Generate a diagram by first running the multi-agent pipeline,
    then using the final agent output as context for diagram generation.
    """
    # Run the multi-agent pipeline
    pipeline_result = await run_multi_agent_pipeline(text, agents, api_key)
    
    if pipeline_result.get("error") and not pipeline_result.get("pipeline_outputs"):
        return {
            "error": pipeline_result["error"],
            "data": None,
            "agent_outputs": [],
        }

    # Get agent outputs (excluding any None values)
    agent_outputs = [
        output["output"]
        for output in pipeline_result.get("pipeline_outputs", [])
        if output.get("output")
    ]

    # Determine schema and name based on diagram type
    if diagram_type == "flowchart":
        schema = FLOWCHART_SCHEMA
        schema_name = "flowchart"
    else:
        schema = MINDMAP_SCHEMA
        schema_name = "mindmap"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    MAX_RETRIES = 2
    last_error = None

    for attempt in range(MAX_RETRIES):
        # Build diagram prompt with agent context
        prompt = build_diagram_prompt_with_context(text, diagram_type, agent_outputs, complexity)

        # Build system message - indicate previous failure if retry
        system_msg = "You are a JSON-only API. Output ONLY valid JSON objects. No markdown. No code blocks. No explanations. No tables. ONLY JSON."
        if attempt > 0:
            system_msg += f"\n\nATTENTION: Previous attempt {attempt} returned invalid format. Ensure output is strictly valid JSON matching the schema. No markdown wrappers, no explanations."

        payload = {
            "model": MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": system_msg,
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": schema
                }
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(GROQ_API_URL, headers=headers, json=payload)

            if response.status_code == 401:
                return {
                    "error": "Invalid Groq API key. Please check and try again.",
                    "data": None,
                    "agent_outputs": pipeline_result.get("pipeline_outputs", []),
                }

            if response.status_code != 200:
                last_error = f"Groq API returned status {response.status_code}: {response.text}"
                if attempt < MAX_RETRIES - 1:
                    continue
                return {
                    "error": last_error,
                    "data": None,
                    "agent_outputs": pipeline_result.get("pipeline_outputs", []),
                }

            body = response.json()
            content = body["choices"][0]["message"]["content"]

            # Strip markdown fences if LLM wraps them anyway
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            data = json.loads(content)
            return {
                "error": None,
                "data": data,
                "agent_outputs": pipeline_result.get("pipeline_outputs", []),
            }

        except json.JSONDecodeError as e:
            last_error = f"LLM returned invalid JSON: {str(e)}"
            if attempt < MAX_RETRIES - 1:
                continue
            return {
                "error": last_error,
                "data": None,
                "agent_outputs": pipeline_result.get("pipeline_outputs", []),
            }
        except httpx.TimeoutException:
            return {
                "error": "Request to Groq API timed out.",
                "data": None,
                "agent_outputs": pipeline_result.get("pipeline_outputs", []),
            }
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            if attempt < MAX_RETRIES - 1:
                continue
            return {
                "error": last_error,
                "data": None,
                "agent_outputs": pipeline_result.get("pipeline_outputs", []),
            }

    return {
        "error": last_error or "Failed to generate valid diagram after retries.",
        "data": None,
        "agent_outputs": pipeline_result.get("pipeline_outputs", []),
    }