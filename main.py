from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import json
from typing import List

from llm_service import generate_diagram_json, generate_diagram_with_agents
from schema_validator import validate_diagram_schema
from agents_config import Agent, get_default_agents, get_enabled_agents

app = FastAPI(title="Tissue AI", version="0.1.0")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# In-memory agent configuration (can be persisted to a database later)
agent_config: List[Agent] = get_default_agents()


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/generate", response_class=JSONResponse)
async def generate(
    text: str = Form(...),
    diagram_type: str = Form(...),
    api_key: str = Form(...),
    complexity: str = Form("brief"),
    temperature: str = Form("0.7"),
):
    if not api_key.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Groq API key is required."},
        )

    if not text.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Input text cannot be empty."},
        )

    if diagram_type not in ("flowchart", "mindmap", "er", "venn"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid diagram type."},
        )

    if complexity not in ("simple", "brief", "detailed", "extensive"):
        complexity = "brief"
    
    try:
        temp = float(temperature)
        if temp < 0 or temp > 2:
            temp = 0.7
    except:
        temp = 0.7

    result = await generate_diagram_json(text.strip(), diagram_type, api_key.strip(), complexity, temp)

    if result.get("error"):
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": result["error"]},
        )

    diagram_data = result["data"]
    is_valid, validation_error = validate_diagram_schema(diagram_data, diagram_type)

    if not is_valid:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Schema validation failed: {validation_error}",
            },
        )

    return JSONResponse(
        content={"success": True, "diagram_type": diagram_type, "data": diagram_data}
    )


@app.get("/agents", response_class=JSONResponse)
async def get_agents():
    """Get current agent configuration"""
    return JSONResponse(
        content={
            "success": True,
            "agents": [agent.to_dict() for agent in agent_config],
        }
    )


@app.post("/agents/update", response_class=JSONResponse)
async def update_agents(request: Request):
    """Update agent configuration (enable/disable/reorder)"""
    global agent_config
    
    try:
        body = await request.json()
        agents_data = body.get("agents", [])
        
        # Reconstruct agent config from request
        updated_agents = []
        for agent_data in agents_data:
            agent = Agent.from_dict(agent_data)
            updated_agents.append(agent)
        
        # Sort by order
        updated_agents.sort(key=lambda a: a.order)
        agent_config = updated_agents
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Agents updated successfully",
                "agents": [agent.to_dict() for agent in agent_config],
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Failed to update agents: {str(e)}"},
        )


@app.post("/agents/add", response_class=JSONResponse)
async def add_agent(request: Request):
    """Add a new agent to the pipeline"""
    global agent_config
    
    try:
        body = await request.json()
        new_agent = Agent.from_dict(body)
        agent_config.append(new_agent)
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Agent added successfully",
                "agent": new_agent.to_dict(),
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Failed to add agent: {str(e)}"},
        )


@app.post("/agents/remove", response_class=JSONResponse)
async def remove_agent(agent_id: str):
    """Remove an agent from the pipeline"""
    global agent_config
    
    try:
        agent_config = [a for a in agent_config if a.id != agent_id]
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Agent removed successfully",
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Failed to remove agent: {str(e)}"},
        )


@app.post("/generate-with-agents", response_class=JSONResponse)
async def generate_with_agents(
    text: str = Form(...),
    diagram_type: str = Form(...),
    api_key: str = Form(...),
    complexity: str = Form("brief"),
    temperature: str = Form("0.7"),
):
    """
    Generate a diagram using the multi-agent pipeline.
    The pipeline processes the input through all enabled agents,
    then uses the final output to generate the diagram.
    """
    if not api_key.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Groq API key is required."},
        )

    if not text.strip():
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Input text cannot be empty."},
        )

    if diagram_type not in ("flowchart", "mindmap", "er", "venn"):
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Invalid diagram type."},
        )

    if complexity not in ("simple", "brief", "detailed", "extensive"):
        complexity = "brief"
    
    try:
        temp = float(temperature)
        if temp < 0 or temp > 2:
            temp = 0.7
    except:
        temp = 0.7

    # Run the multi-agent pipeline and generate diagram
    result = await generate_diagram_with_agents(
        text.strip(),
        diagram_type,
        api_key.strip(),
        agent_config,
        complexity,
        temp,
    )

    if result.get("error"):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": result["error"],
                "agent_outputs": result.get("agent_outputs", []),
            },
        )

    diagram_data = result.get("data")
    is_valid, validation_error = validate_diagram_schema(diagram_data, diagram_type)

    if not is_valid:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Schema validation failed: {validation_error}",
                "agent_outputs": result.get("agent_outputs", []),
            },
        )

    return JSONResponse(
        content={
            "success": True,
            "diagram_type": diagram_type,
            "data": diagram_data,
            "agent_outputs": result.get("agent_outputs", []),
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)