/**
 * Agents Module - Handles multi-agent pipeline management
 * Features:
 * - Modal UI for enabling/disabling agents
 * - Pipeline visualization
 * - Drag-and-drop agent reordering
 * - Simple add/remove from pipeline
 */

let agentsData = [];
let draggedAgentId = null;

// DOM Elements
const agentsModalBackdrop = document.getElementById("agents-modal-backdrop");
const agentsModal = document.getElementById("agents-modal");
const btnAgents = document.getElementById("btn-agents");
const btnAgentsClose = document.getElementById("btn-agents-close");
const agentsPipelineList = document.getElementById("agents-pipeline-list");

/**
 * Initialize the agents module
 */
async function initializeAgents() {
    await fetchAgents();
    setupEventListeners();
    renderPipeline();
}

/**
 * Setup event listeners for agents modal
 */
function setupEventListeners() {
    btnAgents?.addEventListener("click", openAgentsModal);
    btnAgentsClose?.addEventListener("click", closeAgentsModal);

    // Close modal on backdrop click
    agentsModalBackdrop?.addEventListener("click", (e) => {
        if (e.target === agentsModalBackdrop) {
            closeAgentsModal();
        }
    });
}

/**
 * Fetch current agents from backend
 */
async function fetchAgents() {
    try {
        const response = await fetch("/agents");
        const data = await response.json();

        if (data.success) {
            agentsData = data.agents;
            return true;
        }
    } catch (error) {
        console.error("Error fetching agents:", error);
    }
    return false;
}

/**
 * Open the agents modal
 */
function openAgentsModal() {
    if (agentsModalBackdrop) {
        agentsModalBackdrop.hidden = false;
        document.body.style.overflow = "hidden";
        renderPipeline();
    }
}

/**
 * Close the agents modal
 */
function closeAgentsModal() {
    if (agentsModalBackdrop) {
        agentsModalBackdrop.hidden = true;
        document.body.style.overflow = "";
    }
}

/**
 * Render the pipeline with agent toggles
 */
function renderPipeline() {
    if (!agentsPipelineList) return;

    const sortedAgents = [...agentsData].sort((a, b) => a.order - b.order);
    agentsPipelineList.innerHTML = "";

    // Input node
    const inputNode = document.createElement("div");
    inputNode.className = "agent-pipeline-node input-node";
    inputNode.innerHTML = `
        <div class="agent-pipeline-node-icon">▸</div>
        <div class="agent-pipeline-node-label">User Input</div>
    `;
    agentsPipelineList.appendChild(inputNode);

    // Arrow
    agentsPipelineList.appendChild(createArrow());

    // Agents
    sortedAgents.forEach((agent) => {
        const agentNode = document.createElement("div");
        agentNode.className = "agent-pipeline-node agent-node";
        agentNode.draggable = true;
        agentNode.dataset.agentId = agent.id;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "agent-toggle-checkbox";
        checkbox.checked = agent.enabled;
        checkbox.addEventListener("change", async (e) => {
            agent.enabled = e.target.checked;
            await updateAgentsConfig();
            renderPipeline();
        });

        agentNode.innerHTML = `
            <div class="agent-drag-handle">⋮</div>
            <div class="agent-node-content">
                <div class="agent-node-name">${agent.name}</div>
                <div class="agent-node-model">${agent.model}</div>
            </div>
        `;
        agentNode.insertBefore(checkbox, agentNode.firstChild);

        // Drag listeners
        agentNode.addEventListener("dragstart", onAgentDragStart);
        agentNode.addEventListener("dragend", onAgentDragEnd);
        agentNode.addEventListener("dragover", onAgentDragOver);
        agentNode.addEventListener("drop", onAgentDrop);

        agentsPipelineList.appendChild(agentNode);
        agentsPipelineList.appendChild(createArrow());
    });

    // Output node
    const outputNode = document.createElement("div");
    outputNode.className = "agent-pipeline-node output-node";
    outputNode.innerHTML = `
        <div class="agent-pipeline-node-icon">◇</div>
        <div class="agent-pipeline-node-label">Diagram Generator</div>
    `;
    agentsPipelineList.appendChild(outputNode);
}

/**
 * Create pipeline arrow element
 */
function createArrow() {
    const arrow = document.createElement("div");
    arrow.className = "pipeline-arrow";
    arrow.textContent = "↓";
    return arrow;
}

/**
 * Drag start handler
 */
function onAgentDragStart(e) {
    draggedAgentId = this.dataset.agentId;
    this.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
}

/**
 * Drag end handler
 */
function onAgentDragEnd(e) {
    this.classList.remove("dragging");
    draggedAgentId = null;
    document.querySelectorAll(".agent-pipeline-node").forEach((item) => {
        item.classList.remove("dragging");
        item.style.opacity = "";
    });
}

/**
 * Drag over handler
 */
function onAgentDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (this.classList.contains("agent-node") && draggedAgentId !== this.dataset.agentId) {
        this.style.opacity = "0.5";
    }
}

/**
 * Drop handler for reordering
 */
async function onAgentDrop(e) {
    e.preventDefault();

    if (this.classList.contains("agent-node") && draggedAgentId && draggedAgentId !== this.dataset.agentId) {
        const draggedAgent = agentsData.find((a) => a.id === draggedAgentId);
        const targetAgent = agentsData.find((a) => a.id === this.dataset.agentId);

        if (draggedAgent && targetAgent) {
            // Swap order
            const tempOrder = draggedAgent.order;
            draggedAgent.order = targetAgent.order;
            targetAgent.order = tempOrder;

            await updateAgentsConfig();
            renderPipeline();
        }
    }

    this.style.opacity = "";
}

/**
 * Update agents configuration on backend
 */
async function updateAgentsConfig() {
    try {
        const response = await fetch("/agents/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ agents: agentsData }),
        });

        const data = await response.json();
        if (data.success) {
            agentsData = data.agents;
            return true;
        }
    } catch (error) {
        console.error("Error updating agents:", error);
        showMessage("Failed to update agents", "error");
    }
    return false;
}

/**
 * Get enabled agents for diagram generation
 */
function getEnabledAgentsForGeneration() {
    return agentsData.filter((a) => a.enabled).sort((a, b) => a.order - b.order);
}

/**
 * Check if any agents are enabled
 */
function hasEnabledAgents() {
    return agentsData.some((a) => a.enabled);
}

/**
 * Show message (reuse from main app if available)
 */
function showMessage(message, type = "info") {
    // This can be integrated with the existing status bar
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializeAgents);
