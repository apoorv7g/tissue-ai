# 🎯 Multi-Agent System - Quick Start Guide

## Overview
Your Tissue AI application now has a powerful multi-agent processing pipeline! Users can configure, enable/disable, and reorder AI agents that process input sequentially before generating diagrams.

## 🚀 What's New

### Features Added
✅ **Multi-Agent Pipeline Modal** - Beautiful UI to manage agents  
✅ **3 Default Agents** - Preliminary, Reasoning, Web Search  
✅ **Drag-and-Drop Reordering** - Organize agent execution order  
✅ **Dynamic Agent Enable/Disable** - Toggle agents on/off  
✅ **Agent Customization** - Edit names, models, and system prompts  
✅ **Pipeline Visualization** - See the flow: Input → Agents → Diagram  
✅ **Backend Integration** - Multi-agent API endpoints  
✅ **Automatic Routing** - Seamlessly switches between single/multi-agent generation  

## 🎮 How to Use

### Opening the Agents Panel
1. Click the **"Agents"** button in the canvas toolbar (top-right)
2. Modal opens showing the pipeline

### Enabling Agents
1. In the "Available Agents" section (right column)
2. Check the **"Enabled"** checkbox next to agents
3. Changes apply immediately - pipeline updates in real-time

### Reordering Agents
1. In the pipeline visualization (left column)
2. **Drag** any agent box to reorder
3. Release to drop - new order takes effect
4. Updated order shows agent 1 → agent 2 → agent 3 flow

### Editing an Agent
1. Click **"Edit"** button on an agent
2. Change:
   - **Agent Name**: Display name
   - **Model**: Select from dropdown (gpt-oss-20b, gpt-oss-120b, groq/compound)
   - **System Prompt**: Custom instructions for this agent
3. Click **"Save Changes"**

### Adding a Custom Agent
1. Click **"+ Add Agent"** button
2. New agent appears in list
3. Click **"Edit"** to configure it
4. Set name, model, and system prompt
5. Enable to use in pipeline

### Generating with Agents
1. Ensure API key is set
2. Enter your text
3. Click **"Generate Diagram"**
4. System automatically:
   - Checks if agents are enabled
   - Runs enabled agents in order
   - Uses final agent output for diagram generation
   - Displays the result

If no agents are enabled, regular generation occurs.

## 🔄 Default Agent Descriptions

### 1. **Preliminary Agent** (DEFAULT: ENABLED)
- **Model**: openai/gpt-oss-20b
- **Purpose**: Initial analysis, concept extraction
- **Output**: Structured breakdown of key topics, entities, and themes
- **Example**: 
  - Input: "Build a machine learning pipeline"
  - Output: "Components: data loading, preprocessing, model training, evaluation"

### 2. **Reasoning Agent** (DEFAULT: DISABLED)
- **Model**: openai/gpt-oss-120b
- **Purpose**: Deep analysis, relationship identification
- **Output**: Logical connections and dependencies
- **Example**:
  - Input: Component breakdown
  - Output: "Data loading depends on file paths; preprocessing requires clean data"

### 3. **Web Search Agent** (DEFAULT: DISABLED)
- **Model**: groq/compound
- **Purpose**: Context enrichment, best practices
- **Output**: Enhanced knowledge and domain context
- **Example**:
  - Input: Logical structure
  - Output: "Recommended libraries: pandas, scikit-learn; use cross-validation"

## 📊 Data Flow

### Single Agent (Default)
```
User Input
    ↓
Preliminary Agent (enabled)
  Analysis: "Website needs home, about, contact pages"
    ↓
Diagram Generator
  Creates: Flowchart showing page structure
    ↓
Output: SVG/PNG/PDF
```

### Multiple Agents
```
User Input
    ↓
Preliminary Agent
  "Mobile app: login, dashboard, settings"
    ↓
Reasoning Agent (if enabled)
  "Dashboard depends on login; settings modifies app state"
    ↓
Web Search Agent (if enabled)
  "Use React Native; implement state management"
    ↓
Diagram Generator
  Rich flowchart with all context
    ↓
Output: Enhanced SVG/PNG/PDF
```

## 🛠️ Technical Details

### New Files Created
- **Backend**:
  - `agents_config.py` - Agent definitions & configuration
  - Modified: `llm_service.py` - Added multi-agent pipeline logic
  - Modified: `main.py` - Added agent management endpoints

- **Frontend**:
  - `agents.js` - Agent modal management & UI logic
  - `agents-modal.css` - Modal styling & layout
  - Modified: `app.js` - Integrated multi-agent generation
  - Modified: `index.html` - Added modal HTML & button

### New API Endpoints
- `GET /agents` - Fetch current agent config
- `POST /agents/update` - Update agents (enable/disable/reorder)
- `POST /agents/add` - Add new agent
- `POST /agents/remove` - Delete agent
- `POST /generate-with-agents` - Generate with agent pipeline

### Configuration Storage
**Current**: In-memory (resets on server restart)  
**Recommended for Production**: Database (SQLite, PostgreSQL, MongoDB)

## 💡 Tips & Tricks

### Optimize for Your Use Case
- **Need detailed analysis?** Enable Reasoning Agent (slower, deeper)
- **Need enriched context?** Enable Web Search Agent
- **Need speed?** Disable extra agents
- **Custom workflows?** Edit system prompts for each agent

### Best Practices
1. **Start with Preliminary Agent only** - Baseline quality
2. **Add Reasoning for complex topics** - Better relationships
3. **Add Web Search for technical content** - Current best practices
4. **Test different orderings** - Find what works best
5. **Save your preferred setup** - Document working configurations

### Debugging
- Open browser **Console** (F12) to see agent processing
- Check **Network** tab to verify requests to `/generate-with-agents`
- View **Application** tab to inspect agent configuration
- Check server terminal for detailed logs

## ⚠️ Important Notes

### API Keys
- Agents use the same Groq API key you provide
- System automatically routes to correct API provider based on model
- Keys are **never stored** - only used for current session

### Processing Time
- Each agent runs sequentially - total time ≈ sum of all agent times
- Typical: 5-15 seconds per agent (varies by complexity)
- Parallel execution coming in future version

### Limitations (Current)
- Agents run in **sequence** (not parallel)
- Configuration **not persisted** (resets on server restart)
- Can add max ~10 agents (performance consideration)
- No rate limiting (implement for production)

## 🚀 Future Enhancements Planned

1. **Database Persistence** - Save agent configs permanently
2. **Parallel Execution** - Run agents simultaneously
3. **Conditional Logic** - Branch based on output
4. **Agent Templates** - Pre-built workflow sequences
5. **History & Replay** - Store and replay pipelines
6. **Performance Analytics** - Track agent efficiency
7. **Custom Models** - Add your own LLM providers
8. **Streaming Output** - Real-time agent output display
9. **Webhooks** - Notify on completion
10. **Version Control** - Track agent changes

## 📞 Support & Troubleshooting

### Common Issues

**Q: Agents modal won't open?**  
A: Check browser console for errors. Verify agents.js loaded (Network tab).

**Q: Changes not being saved?**  
A: Verify network requests to `/agents/update` succeed (200 status).

**Q: Generation slow with agents?**  
A: Expected - agents run sequentially. Disable unnecessary agents.

**Q: Agent outputs not showing?**  
A: Check API key is valid. Review server logs for API errors.

**Q: Modal styling looks wrong?**  
A: Clear browser cache. Verify agents-modal.css loaded.

**Q: Can't edit agent prompts?**  
A: Click "Edit" button, not on the agent name. Use the modal that appears.

## 📚 Documentation

See **MULTI_AGENT_GUIDE.md** in project root for:
- Detailed architecture documentation
- API endpoint specifications
- Backend code explanations
- Frontend component details
- Database migration guide
- Security considerations
- Performance notes

## 🎓 Learning Path

1. **Start Here**: Click Agents button, explore UI
2. **Try It**: Enable Preliminary agent, generate diagram
3. **Experiment**: Try Reasoning agent, compare outputs
4. **Customize**: Edit system prompts for agents
5. **Optimize**: Find best agent combination for your workflows
6. **Expert**: Understand the code in MULTI_AGENT_GUIDE.md

## 🔧 Configuration Options

### Agent Parameters (Edit Modal)

**Agent Name**
- Short, descriptive identifier
- Example: "Code Analyzer" or "Domain Expert"

**Model Selection**
- `openai/gpt-oss-20b` - Fast, good for initial analysis
- `openai/gpt-oss-120b` - Powerful, better reasoning
- `groq/compound` - Specialized, for web search context

**System Prompt**
- The instruction given to the agent
- Customize for your specific needs
- Example: "You are an expert software architect analyzing code documentation..."

### Order/Sequence
- Drag to reorder in pipeline visualization
- First agent processes user input
- Each subsequent agent processes previous output
- Final output goes to diagram generator

## ✨ Success Criteria

Your multi-agent system is working well when:
- ✅ Agents modal opens/closes smoothly
- ✅ Can enable/disable agents
- ✅ Drag-and-drop reordering works
- ✅ Pipeline visualization updates in real-time
- ✅ Agent outputs are visible in browser console
- ✅ Diagrams generate correctly with/without agents
- ✅ Different agent configurations produce different diagrams
- ✅ Performance is acceptable for your use case

## 📋 Next Steps

1. **Test the System**: Try enabling different agent combinations
2. **Optimize Prompts**: Edit system prompts for your domain
3. **Create Templates**: Document your best configurations
4. **Gather Feedback**: See how users interact with agents
5. **Plan Enhancements**: Based on feedback, add features
6. **Production Setup**: Implement database persistence
7. **Scale It**: Set up for multiple concurrent users

---

**Happy diagramming with your multi-agent system! 🚀**

For detailed technical information, see MULTI_AGENT_GUIDE.md
