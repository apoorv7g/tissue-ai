# Tissue AI - Multi-Agent System Implementation Guide

## Overview

A comprehensive multi-agent processing pipeline has been added to Tissue AI, allowing users to:
- Configure multiple AI agents to process input sequentially
- Visualize the agent pipeline with drag-and-drop UI
- Enable/disable agents dynamically
- Reorder agents with automatic flow adjustment
- View agent outputs and final diagram generation

## Architecture

### System Flow

```
User Input 
    ↓
Preliminary Agent (gpt-oss-20b) → analyzes & extracts key concepts
    ↓
Reasoning Agent (gpt-oss-120b) → performs deeper analysis [DISABLED BY DEFAULT]
    ↓
Web Search Agent (groq/compound) → enriches with context [DISABLED BY DEFAULT]
    ↓
Diagram Generator → creates final visualization
    ↓
Output: SVG/PNG/PDF
```

Each agent's output becomes the input for the next agent, creating a data enrichment pipeline.

## Backend Components

### 1. `agents_config.py` (NEW)
**Purpose**: Define and manage agent configurations

**Key Classes**:
- `AgentType`: Enum for agent types (PRELIMINARY, REASONING, WEB_SEARCH)
- `Agent`: Dataclass representing a single agent
  - `id`: Unique identifier
  - `type`: Agent type
  - `name`: Display name
  - `model`: LLM model identifier
  - `system_prompt`: Custom system prompt
  - `order`: Execution order in pipeline
  - `enabled`: Enable/disable flag

**Default Agents**:
1. **Preliminary Agent** (enabled by default)
   - Model: openai/gpt-oss-20b
   - Role: Initial analysis, concept extraction

2. **Reasoning Agent** (disabled by default)
   - Model: openai/gpt-oss-120b
   - Role: Deep reasoning, relationship identification

3. **Web Search Agent** (disabled by default)
   - Model: groq/compound
   - Role: Context enrichment, knowledge integration

### 2. `llm_service.py` (UPDATED)
**New Functions**:

- `async call_llm_agent(agent, user_input, api_key)`: Call individual agent with input
  - Returns: Agent output or error
  - Supports multiple API providers (Groq, OpenAI)

- `async run_multi_agent_pipeline(initial_input, agents, api_key)`: Execute agent sequence
  - Thread-safe sequential processing
  - Returns: All agent outputs with metadata

- `async generate_diagram_with_agents(text, diagram_type, api_key, agents)`: Full pipeline
  - Runs agents first
  - Uses agent outputs as context for diagram generation
  - Returns: Final diagram + all agent outputs

- `build_diagram_prompt_with_context()`: Enhances diagram prompt with agent context

### 3. `main.py` (UPDATED)
**New Endpoints**:

1. **GET `/agents`**
   - Returns: Current agent configuration
   - Response: `{ success: true, agents: [...] }`

2. **POST `/agents/update`**
   - Body: `{ agents: [...] }`
   - Updates: Global agent config with new states
   - Response: Updated agents list

3. **POST `/agents/add`**
   - Body: New agent data
   - Adds: Agent to pipeline
   - Response: Created agent object

4. **POST `/agents/remove`**
   - Params: `agent_id`
   - Removes: Agent from pipeline

5. **POST `/generate-with-agents`**
   - Body: text, diagram_type, api_key
   - Uses: Multi-agent pipeline
   - Response: Diagram + agent outputs

**In-Memory State**:
```python
agent_config: List[Agent] = get_default_agents()
```
Can be persisted to database for production use.

## Frontend Components

### 1. `agents.js` (NEW)
**Module**: Comprehensive agent management system

**Key Functions**:
- `initializeAgents()`: Load agents on page startup
- `fetchAgents()`: GET /agents
- `openAgentsModal()`: Show modal
- `closeAgentsModal()`: Hide modal
- `renderPipelineFlow()`: Visualize agent sequence
- `renderAgentsList()`: Show config UI
- `openAgentDetails(agentId)`: Edit agent
- `saveAgentDetails()`: Save changes
- `deleteCurrentAgent()`: Remove agent
- `addNewAgent()`: Create new agent
- `updateAgentsConfig()`: POST /agents/update
- `getEnabledAgentsForGeneration()`: Get active agents
- `hasEnabledAgents()`: Check if any agents enabled

**Drag-and-Drop Handlers**:
- `onAgentDragStart()`: Start drag operation
- `onAgentDragOver()`: Highlight drop target
- `onAgentDrop()`: Reorder agents
- `onAgentDragEnd()`: Cleanup drag state

### 2. `agents-modal.css` (NEW)
**Styling Components**:
- `.agents-modal-backdrop`: Modal backdrop with fade animation
- `.agents-modal`: Main modal container (max 1000px, 85vh)
- `.agents-modal-header`: Header with title and close button
- `.agents-modal-body`: Two-column layout (1fr 1fr)
- `.pipeline-visualization`: Left column - agent flow visualization
- `.agent-config-section`: Right column - agent management
- `.pipeline-flow`: Pipeline canvas with nodes and arrows
- `.pipeline-node`: Each agent/input/output node
- `.agent-pipeline-item`: Draggable agent item with visual feedback
- `.agent-config-item`: Agent configuration row
- `.agent-details`: Editor panel for agent properties
- Drag-and-drop styling with visual feedback
- Responsive design: Single column on <1000px, full-screen on mobile

**Color Scheme**: Uses CSS variables from main theme
- Integrates with existing 4 themes
- Supports light/dark modes
- Accessible contrast ratios

### 3. `app.js` (UPDATED)
**Generate Flow Integration**:
- Check `hasEnabledAgents()` before generation
- Route to `/generate-with-agents` if agents enabled
- Fall back to `/generate` if no agents
- Store agent outputs in `window.lastAgentOutputs`
- Update status messages for multi-agent processing

**Endpoint Selection**:
```javascript
const endpoint = useAgents ? "/generate-with-agents" : "/generate";
```

### 4. `index.html` (UPDATED)
**New Elements**:
- Agents button added to canvas toolbar: `id="btn-agents"`
- Agents modal: `id="agents-modal-backdrop"`
- Pipeline visualization section
- Agent configuration section
- Agent details editor
- CSS link: `/static/agents-modal.css`
- Script link: `/static/agents.js`

## Usage Guide

### Enabling Multi-Agent Pipeline

1. **Open Agents Modal**: Click "Agents" button in canvas toolbar
2. **Enable Agents**: Check "Enabled" checkbox for desired agents
3. **Reorder**: Drag agents to change execution order
4. **Configure**: Click "Edit" to customize agent prompts
5. **Generate**: Click "Generate Diagram" - agents run automatically!

### Adding Custom Agents

1. Click "+ Add Agent" button
2. Click "Edit" on new agent
3. Set:
   - Agent Name
   - Model (from dropdown)
   - System Prompt (custom instruction)
4. Click "Save Changes"
5. Enable checkbox to use in pipeline

### Agent Customization

Edit agent properties:
- **Name**: Display name in UI
- **Model**: Choose from:
  - openai/gpt-oss-20b
  - openai/gpt-oss-120b
  - groq/compound
- **System Prompt**: Custom instruction for agent behavior

### Pipeline Visualization

The pipeline shows:
- **User Input**: Entry point
- **Agent Boxes**: Each enabled agent in execution order
- **Arrows**: Show data flow direction
- **Diagram Generator**: Final step (cannot be removed)
- **Output**: Final diagram

Drag agents to reorder - pipeline updates in real-time.

## Data Flow Example

### Single Agent (Default)

```
"Build a website"
    ↓
Preliminary Agent (enabled)
  - Extracts: pages, features, technology stack
  - Output: "Website project with: home, about, contact pages, responsive design"
    ↓
Diagram Generator
  - Creates: Flowchart/Mind Map from agent output
    ↓
SVG/PNG/PDF Output
```

### Multiple Agents

```
"Build a machine learning pipeline"
    ↓
Preliminary Agent
  - Extracts: steps, components, inputs/outputs
  - Output: "Pipeline: data loading → preprocessing → model training → evaluation"
    ↓
Reasoning Agent (if enabled)
  - Analyzes: relationships, dependencies, decision points
  - Output: "Dependencies: preprocessing needs cleaned data; training needs preprocessed data; evaluation needs trained model"
    ↓
Web Search Agent (if enabled)
  - Enriches: best practices, libraries, patterns
  - Output: "Use pandas/scikit-learn; implement cross-validation; add error handling"
    ↓
Diagram Generator
  - Creates: Rich, detailed flowchart with all context
    ↓
SVG/PNG/PDF Output
```

## API Details

### Request: Generate with Agents

```
POST /generate-with-agents
Content-Type: multipart/form-data

text: "Your input text"
diagram_type: "flowchart" | "mindmap"
api_key: "gsk_..." (Groq API key)
```

### Response: Success

```json
{
  "success": true,
  "diagram_type": "flowchart",
  "data": { /* diagram structure */ },
  "agent_outputs": [
    {
      "agent_id": "agent_preliminary",
      "agent_name": "Preliminary Agent",
      "agent_type": "preliminary",
      "output": "Analysis output...",
      "error": null
    }
    // ... more agents
  ]
}
```

### Response: Error

```json
{
  "success": false,
  "error": "Error message",
  "agent_outputs": [...]
}
```

## Configuration Storage

**Current**: In-memory only
```python
agent_config: List[Agent] = []
```

**Production Recommendation**: Database persistence
- Store in SQLite, PostgreSQL, or MongoDB
- Persist agent configurations per user
- Track agent execution history
- Implement versioning

### Migration to Database

```python
# In main.py
from sqlalchemy import create_engine, Column, String, Boolean, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session

Base = declarative_base()

class AgentModel(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True)
    type = Column(String)
    name = Column(String)
    model = Column(String)
    system_prompt = Column(Text)
    order = Column(Integer)
    enabled = Column(Boolean)

# Load/save with Session
```

## Troubleshooting

### Agents Not Showing in Modal
1. Check browser console for JavaScript errors
2. Verify `/agents` endpoint returns data
3. Check network tab for failed requests

### Agents Not Processing
1. Verify API keys are valid
2. Check agent system prompts are appropriate
3. Review agent models are available
4. Check agent output in browser console

### UI Layout Issues
1. Clear browser cache
2. Verify agents-modal.css is loading (`<link>` in HTML)
3. Check CSS variables are defined (in style.css)
4. Check responsive breakpoints on mobile

## Future Enhancements

1. **Rate Limiting**: Add request throttling
2. **Caching**: Cache agent outputs
3. **Webhooks**: Notify when processing complete
4. **Templates**: Pre-built agent sequences
5. **Analytics**: Track agent performance
6. **Streaming**: Real-time agent output display
7. **Branching**: Conditional agent execution
8. **Parallel**: Execute agents simultaneously
9. **Custom Models**: Add external LLM providers
10. **History**: Replay previous pipelines

## Testing Checklist

- [ ] Agents modal opens/closes
- [ ] Agents list renders correctly
- [ ] Drag-and-drop reorders agents
- [ ] Enable/disable toggles work
- [ ] Edit modal opens with agent data
- [ ] Save changes updates config
- [ ] Delete removes agent
- [ ] Add agent creates new entry
- [ ] Pipeline visualization shows correct flow
- [ ] Generate with agents triggers /generate-with-agents
- [ ] Agent outputs display properly
- [ ] Generate without agents uses /generate
- [ ] Mobile responsive layout works
- [ ] Keyboard navigation functional
- [ ] Theme colors apply to modal

## File Structure

```
TISSUE-AI/
├── agents_config.py          # Agent definitions & config
├── llm_service.py            # LLM API calls & pipeline
├── main.py                   # FastAPI endpoints
├── schema_validator.py       # (unchanged)
├── requirements.txt          # (unchanged)
├── templates/
│   └── index.html            # Added agents modal HTML
├── static/
│   ├── app.js                # Updated: multi-agent generation
│   ├── agents.js             # NEW: Agent management module
│   ├── agents-modal.css      # NEW: Modal styling
│   ├── style.css             # (unchanged)
│   ├── app.css               # (unchanged if exists)
│   └── ...
└── content/                  # (unchanged)
```

## Performance Notes

- **Sequential Processing**: Agents run one at a time (no parallelization currently)
- **Timeout**: 60 seconds per agent call
- **Memory**: Stores agent outputs in memory for session
- **Scalability**: For production, implement job queue (Celery, RQ)

## Security Considerations

1. **API Keys**: Never log or store user API keys
2. **Input Validation**: All inputs validated on backend
3. **Output Sanitization**: LLM outputs parsed and validated
4. **CORS**: Configure for production deployment
5. **Rate Limiting**: Implement per-user/IP limits
6. **Authentication**: Add user auth for multi-user setup

## Version History

- **v0.2.0** (Current): Multi-agent system added
  - 3 default agents
  - Drag-and-drop UI
  - Pipeline visualization
  - Dynamic agent management

- **v0.1.0** (Previous): Initial Tissue AI release
  - Basic diagram generation
  - Theme system
  - Export functionality
