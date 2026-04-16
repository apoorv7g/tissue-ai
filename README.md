# TISSUE-AI - Multi-Agent Diagram Generation Platform

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [API Endpoints](#api-endpoints)
- [Multi-Agent System](#multi-agent-system)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Dependencies](#dependencies)

---

## Overview

**TISSUE-AI** is an intelligent diagram generation platform powered by a sophisticated multi-agent AI system. It converts natural language descriptions into structured diagrams (flowcharts, mind maps, ER diagrams, and Venn diagrams) using Groq LLM APIs with an optional multi-agent processing pipeline for enhanced analysis and context enrichment.

The platform features a beautiful web interface that allows users to:
- Generate various types of diagrams from text descriptions
- Configure and manage multiple AI agents in a processing pipeline
- Control diagram complexity and generation behavior
- Preview and download generated diagrams
- Customize agent configurations and execution order

---

## Features

### Core Capabilities
- **Multiple Diagram Types**: Flowchart, Mind Map, Entity-Relationship (ER), Venn Diagram
- **Multi-Agent Pipeline**: Sequential AI agent processing for enhanced analysis
- **Diagram Complexity Levels**: Simple, Brief, Detailed, Extensive
- **Temperature Control**: Fine-tune LLM creativity (0.0 - 2.0)
- **Schema Validation**: Ensures generated diagrams conform to required structure

### Agent Management
- **Dynamic Agent Configuration**: Enable/disable agents at runtime
- **Drag-and-Drop Reordering**: Arrange agent execution order via UI
- **Agent Customization**: Modify agent names, models, and system prompts
- **Custom Agent Creation**: Add new agents to the pipeline
- **Default Agents**: Pre-configured Preliminary, Reasoning, and Web Search agents

### User Interface
- **Responsive Web Interface**: Modern, intuitive UI built with HTML/CSS/JavaScript
- **Agent Modal**: Beautiful visual management of agent pipeline
- **Real-time Updates**: Immediate feedback on agent configuration changes
- **Error Handling**: Clear error messages and validation feedback

---

## System Architecture

### High-Level Flow

```
┌─────────────────┐
│   User Input    │
│   (Text + Parameters)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Multi-Agent Processing Pipeline    │
├─────────────────────────────────────┤
│  1. Preliminary Agent (GPT-OSS-20B) │
│     └─ Extract concepts & entities  │
├─────────────────────────────────────┤
│  2. Reasoning Agent (GPT-OSS-120B)  │
│     └─ Identify relationships [OPT] │
├─────────────────────────────────────┤
│  3. Web Search Agent (Groq Compound)│
│     └─ Enrich with context [OPT]    │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  LLM Diagram Generation      │
│  (using enriched context)    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Schema Validation           │
│  (ensure valid structure)    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Final Output                │
│  (JSON diagram data)         │
└──────────────────────────────┘
```

### Backend Stack
- **Framework**: FastAPI - Modern, fast Python web framework
- **Templating**: Jinja2 - Server-side template rendering
- **HTTP Client**: httpx - Async HTTP requests to LLM APIs
- **Data Validation**: Pydantic - Type validation and settings management
- **Form Handling**: python-multipart - MultiPart form parsing

### Frontend Stack
- **Language**: Vanilla JavaScript - No heavy dependencies
- **Styling**: CSS with responsive design
- **Rendering**: DOM manipulation and AJAX requests
- **UI Components**: Custom modal, drag-and-drop interface

---

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Groq API Key (obtain from [console.groq.com](https://console.groq.com))

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd TISSUE-AI
```

### Step 2: Create Python Virtual Environment
```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
uvicorn main:app --reload
```

The application will start at `http://localhost:8000`

---

## Project Structure

```
TISSUE-AI/
├── main.py                      # FastAPI application & route handlers
├── agents_config.py             # Multi-agent configuration system
├── llm_service.py              # LLM API integration & diagram generation
├── schema_validator.py         # Diagram schema validation
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── MULTI_AGENT_GUIDE.md       # Detailed multi-agent documentation
├── AGENTS_QUICKSTART.md       # Quick start guide for agents
│
├── templates/
│   └── index.html             # Main web interface
│
├── static/
│   ├── app.js                 # Frontend application logic
│   ├── agents.js              # Agent management modal logic
│   ├── agents-modal.css       # Agent modal styling
│   ├── style.css              # Main stylesheet
│   └── asset/
│       └── site.webmanifest   # PWA manifest
│
└── content/                   # Content directory (reserved for future use)
```

---

## Core Components

### 1. **main.py** - FastAPI Application

The main entry point handling HTTP requests and responses.

**Key Endpoints:**
- `GET /` - Serve main web interface
- `POST /generate` - Generate diagram from text
- `GET /agents` - Retrieve current agent configuration
- `POST /agents/update` - Update agent configuration
- `POST /agents/add` - Add new agent to pipeline
- `DELETE /agents/{agent_id}` - Remove agent from pipeline

**Key Features:**
- Input validation (API key, text, diagram type, parameters)
- Error handling with meaningful error messages
- Schema validation for generated diagrams
- Agent management endpoints

### 2. **agents_config.py** - Agent Configuration System

Defines the multi-agent pipeline structure and default agents.

**Key Classes:**
- `AgentType` (Enum): Defines agent categories
  - `PRELIMINARY` - Initial analysis agents
  - `REASONING` - Deep analysis agents
  - `WEB_SEARCH` - Information enrichment agents

- `Agent` (Dataclass): Represents a single agent
  - `id` - Unique identifier (e.g., "agent_preliminary")
  - `type` - AgentType enum value
  - `name` - Display name in UI
  - `model` - LLM model identifier
  - `system_prompt` - Custom instructions for the agent
  - `order` - Execution sequence (1, 2, 3, etc.)
  - `enabled` - Boolean flag to enable/disable agent

**Default Agents:**

| Agent | Model | Enabled | Purpose |
|-------|-------|---------|---------|
| Preliminary Agent | openai/gpt-oss-20b | Yes | Extract key concepts and entities |
| Reasoning Agent | openai/gpt-oss-120b | No | Identify relationships and logic |
| Web Search Agent | groq/compound | No | Enrich context with domain knowledge |

### 3. **llm_service.py** - LLM Integration & Diagram Generation

Handles all interactions with LLM APIs and diagram generation.

**Key Functions:**

- `async generate_diagram_json()` - Generate diagram from text
  - Input: text, diagram_type, api_key, complexity, temperature
  - Output: JSON dictionary with diagram data
  - Supports: Flowchart, Mindmap, ER, Venn

- `async call_llm_agent()` - Execute single agent
  - Input: Agent config, user input, API key
  - Output: Agent's text response
  - Error handling for API failures

- `async run_multi_agent_pipeline()` - Run all enabled agents sequentially
  - Input: Initial text, agent list, API key
  - Output: Outputs from all agents in order
  - Thread-safe sequential processing

- `async generate_diagram_with_agents()` - Full pipeline with agents
  - Input: text, diagram_type, api_key, agents
  - Process: Run agents → Use output as context → Generate diagram
  - Output: Final diagram + metadata

**JSON Schemas:**
- `FLOWCHART_SCHEMA` - Nodes and edges validation
- `MINDMAP_SCHEMA` - Recursive tree structure
- `ER_SCHEMA` - Entities and relationships
- `VENN_SCHEMA` - Venn diagram sets and intersections

### 4. **schema_validator.py** - Output Validation

Validates generated diagrams conform to expected structure.

**Validation Functions:**
- `validate_diagram_schema()` - Route to appropriate validator
- `validate_flowchart()` - Validates flowchart structure
- `validate_mindmap()` - Validates mind map with recursion
- `validate_er()` - Validates entity-relationship diagrams
- `validate_venn()` - Validates Venn diagrams

**Returns:** Tuple[bool, Optional[str]] - (is_valid, error_message)

---

## API Endpoints

### 1. Serve Web Interface
```http
GET /
Response: HTML content of index.html
```

### 2. Generate Diagram
```http
POST /generate
Content-Type: application/x-www-form-urlencoded

Parameters:
  - text: string (required) - Description of diagram
  - diagram_type: string (required) - One of: flowchart, mindmap, er, venn
  - api_key: string (required) - Groq API key
  - complexity: string (optional) - simple, brief, detailed, extensive (default: brief)
  - temperature: string (optional) - 0.0-2.0 (default: 0.7)

Response:
{
  "success": true,
  "diagram_type": "flowchart",
  "data": {
    "nodes": [...],
    "edges": [...]
  }
}

Error Response:
{
  "success": false,
  "error": "Error message explaining what went wrong"
}
```

### 3. Get Agent Configuration
```http
GET /agents
Response:
{
  "success": true,
  "agents": [
    {
      "id": "agent_preliminary",
      "type": "preliminary",
      "name": "Preliminary Agent",
      "model": "openai/gpt-oss-20b",
      "system_prompt": "Analyze input...",
      "order": 1,
      "enabled": true
    },
    ...
  ]
}
```

### 4. Update Agent Configuration
```http
POST /agents/update
Content-Type: application/json

Body:
{
  "updates": [
    {
      "id": "agent_preliminary",
      "enabled": true,
      "order": 1
    },
    ...
  ]
}

Response:
{
  "success": true,
  "agents": [...]
}
```

### 5. Add New Agent
```http
POST /agents/add
Content-Type: application/json

Body:
{
  "name": "Custom Analysis Agent",
  "model": "groq/compound",
  "type": "preliminary",
  "system_prompt": "Custom instructions..."
}

Response:
{
  "success": true,
  "agent": {...}
}
```

### 6. Delete Agent
```http
DELETE /agents/{agent_id}
Response:
{
  "success": true,
  "message": "Agent deleted successfully"
}
```

---

## Multi-Agent System

### How It Works

The multi-agent system processes user input through a chain of AI agents, each adding value before the final diagram generation.

**Sequential Processing Flow:**

1. **User provides text** → "Build a machine learning pipeline"
2. **Preliminary Agent processes** → Extracts: data loading, preprocessing, model training
3. **Reasoning Agent processes** (if enabled) → Identifies dependencies and relationships
4. **Web Search Agent processes** (if enabled) → Adds domain knowledge and best practices
5. **Final enriched context** → Passed to diagram generator
6. **Diagram generated** → Using all agent outputs for accuracy
7. **Schema validated** → Ensures correct structure
8. **Result returned** → JSON diagram data to frontend

### Agent Descriptions

#### Preliminary Agent (Default: Enabled)
- **Model**: openai/gpt-oss-20b
- **Role**: Initial analysis and concept extraction
- **Function**: Breaks down input into key concepts, entities, and themes
- **Output Example**: Structured list of main components

#### Reasoning Agent (Default: Disabled)
- **Model**: openai/gpt-oss-120b
- **Role**: Deep analysis and relationship identification
- **Function**: Identifies logical connections, dependencies, and flow patterns
- **Output Example**: Relationships between components with dependencies

#### Web Search Agent (Default: Disabled)
- **Model**: groq/compound
- **Role**: Context enrichment with external knowledge
- **Function**: Adds best practices, domain knowledge, and relevant information
- **Output Example**: Enhanced description with industry standards and recommendations

### When to Use Multiple Agents

| Scenario | Recommended Config |
|----------|-------------------|
| Quick simple diagrams | Preliminary only |
| Complex system design | Preliminary + Reasoning |
| Best practice diagrams | Preliminary + Web Search |
| Comprehensive analysis | All three agents |

---

## Usage Guide

### For End Users

#### Generating a Simple Diagram

1. **Open the application**: Navigate to `http://localhost:8000`
2. **Enter your API key**: Paste your Groq API key in the input field
3. **Describe your diagram**: Enter text describing what you want (e.g., "Create a flowchart for a user authentication process")
4. **Select diagram type**: Choose from Flowchart, Mindmap, ER Diagram, or Venn Diagram
5. **Set complexity** (optional): Choose detail level (Simple, Brief, Detailed, Extensive)
6. **Generate**: Click "Generate Diagram" button
7. **View result**: Diagram appears on screen as interactive visualization

#### Managing Agents

1. **Open Agent Manager**: Click "Agents" button in toolbar
2. **Enable/Disable Agents**: Check or uncheck agent boxes
3. **Reorder Agents**: Drag agents to change execution order
4. **Edit Agent**: Click "Edit" button to modify name, model, or system prompt
5. **Save Changes**: Click "Save Changes" button
6. **Add Custom Agent**: Click "+ Add Agent" and configure

### For Developers

#### Adding a New Agent Type

1. **Create agent in agents_config.py**:
```python
Agent(
    id="agent_custom",
    type=AgentType.PRELIMINARY,
    name="Custom Agent",
    model="groq/compound",
    system_prompt="Your custom instructions here",
    order=2,
    enabled=True,
)
```

2. **Register in DEFAULT_AGENTS list**

3. **Test via API**: POST to `/agents/add` endpoint

#### Customizing LLM Prompts

Edit the `system_prompt` field in agent configuration:

```python
system_prompt="Analyze technical architecture. Identify all components, their relationships, data flow, and critical paths. Output in structured format."
```

#### Adding a New Diagram Type

1. **Define schema in llm_service.py**:
```python
NEW_TYPE_SCHEMA = {
    "type": "object",
    "properties": {...},
    "required": [...],
    "additionalProperties": False
}
```

2. **Add validator in schema_validator.py**:
```python
def validate_new_type(data: dict) -> tuple[bool, str | None]:
    # validation logic
    return True, None
```

3. **Update diagram_type check in main.py route**

---

## Configuration

### Environment Variables
Currently, the application requires:
- **GROQ_API_KEY**: Set via user input in the web interface

### Application Settings

**Diagram Generation Parameters:**
- **complexity**: Controls prompt verbosity
  - `simple` - Minimal output
  - `brief` - Concise (default)
  - `detailed` - Comprehensive
  - `extensive` - Maximum detail

- **temperature**: Controls LLM randomness
  - `0.0` - Deterministic (most literal)
  - `0.7` - Balanced (default)
  - `2.0` - Maximum creativity

### Customizing Default Agents

Edit `/agents_config.py` to modify:
```python
DEFAULT_AGENTS = [
    Agent(
        id="agent_id",
        type=AgentType.PRELIMINARY,
        name="Display Name",
        model="model/identifier",
        system_prompt="Instructions for this agent",
        order=1,
        enabled=True,
    ),
    # ... more agents
]
```

---

## Dependencies

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.0 | Web framework and API creation |
| uvicorn | 0.30.6 | ASGI server for running FastAPI |
| jinja2 | 3.1.4 | Template rendering for HTML |
| httpx | 0.27.2 | Async HTTP client for LLM APIs |
| pydantic | 2.9.2 | Data validation and settings |
| python-multipart | 0.0.12 | Form data parsing |

### Installation
```bash
pip install -r requirements.txt
```

### Requirements File
```
fastapi==0.115.0
uvicorn==0.30.6
jinja2==3.1.4
httpx==0.27.2
pydantic==2.9.2
python-multipart==0.0.12
```

---

## Frontend Architecture

### JavaScript Modules

#### **app.js** - Main Application Logic
- Form handling and submission
- Diagram rendering and display
- API communication
- Error handling and user feedback

#### **agents.js** - Agent Modal Management
- Agent modal UI control
- Drag-and-drop reordering
- Agent enable/disable toggling
- Agent editing functionality
- AJAX calls to agent endpoints

### CSS Structure

#### **style.css** - Main Styling
- Responsive layout
- Typography and colors
- Form styling
- Diagram display area

#### **agents-modal.css** - Agent Modal Styling
- Modal window styling
- Agent card design
- Drag-and-drop visual feedback
- Interactive elements

---

## Testing

### Manual Testing Checklist

1. **Diagram Generation**
   - [ ] Generate flowchart - simple text
   - [ ] Generate mind map - hierarchical concept
   - [ ] Generate ER diagram - database schema
   - [ ] Generate Venn diagram - overlapping concepts

2. **Multi-Agent Pipeline**
   - [ ] Enable single agent - verify output
   - [ ] Enable multiple agents - verify sequential processing
   - [ ] Reorder agents - verify order change
   - [ ] Edit agent details - verify changes apply
   - [ ] Add custom agent - verify creation

3. **Error Handling**
   - [ ] Missing API key - shows error
   - [ ] Empty text - shows validation error
   - [ ] Invalid diagram type - shows error
   - [ ] API failure - shows error message

4. **UI/UX**
   - [ ] Responsive on mobile - layout adjusts
   - [ ] Agent modal opens/closes - smooth transitions
   - [ ] Drag-and-drop works - smooth reordering
   - [ ] Form validation - real-time feedback

---

## Additional Resources

- **Groq API Documentation**: https://console.groq.com/docs
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Mermaid Diagram Syntax**: https://mermaid.js.org/

### Included Guides
- [Multi-Agent System Guide](MULTI_AGENT_GUIDE.md) - Detailed architecture documentation
- [Agents Quick Start](AGENTS_QUICKSTART.md) - Quick reference for agent management

---

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs and issues
- Suggest new features
- Improve documentation
- Enhance the UI/UX

---

## License

This project is licensed under the MIT License.

---

## Support

For questions, issues, or feedback:
1. Check the [MULTI_AGENT_GUIDE.md](MULTI_AGENT_GUIDE.md) for detailed documentation
2. Review [AGENTS_QUICKSTART.md](AGENTS_QUICKSTART.md) for common tasks
3. Open an issue in the repository

---

**Last Updated**: April 2026  
**Version**: 0.1.0  
**Status**: Active Development