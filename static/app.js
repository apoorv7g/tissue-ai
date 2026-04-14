let diagramData = null;
let diagramType = null;

// Pan / zoom state
let viewBox = { x: 0, y: 0, w: 1200, h: 800 };
let isPanning = false;
let panStart = { x: 0, y: 0 };

// Drag state
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let nodePositions = {};
let nodeElements = {};
let nodeSizesGlobal = {};

// Edge draw function reference
let redrawEdges = null;

const STORAGE_KEYS = {
    themes: "tissue-ai-custom-themes",
    activeTheme: "tissue-ai-active-theme",
};

const BASE_THEMES = [
    {
        id: "midnight-aurora",
        name: "Midnight Aurora",
        canvasBg: "#0c0c12",
        canvasGrid: "#1a1a2a",
        flowchart: {
            start: "#052e16",
            process: "#1e1b4b",
            decision: "#422006",
            end: "#450a0a",
        },
        mindmap: {
            root: "#4f46e5",
            branch: "#1e1b4b",
            leaf: "#18181b",
        },
    },
    {
        id: "ember-ink",
        name: "Ember Ink",
        canvasBg: "#120f0c",
        canvasGrid: "#2a201a",
        flowchart: {
            start: "#7c2d12",
            process: "#78350f",
            decision: "#92400e",
            end: "#991b1b",
        },
        mindmap: {
            root: "#ea580c",
            branch: "#7c2d12",
            leaf: "#292524",
        },
    },
    {
        id: "light-clarity",
        name: "Light Clarity",
        canvasBg: "#f8f9fc",
        canvasGrid: "#e5e7eb",
        flowchart: {
            start: "#10b981",
            process: "#3b82f6",
            decision: "#f59e0b",
            end: "#ef4444",
        },
        mindmap: {
            root: "#1f2937",
            branch: "#4b5563",
            leaf: "#9ca3af",
        },
    },
    {
        id: "dark-slate",
        name: "Dark Slate",
        canvasBg: "#1a1f2e",
        canvasGrid: "#2d3748",
        flowchart: {
            start: "#34d399",
            process: "#60a5fa",
            decision: "#fbbf24",
            end: "#f87171",
        },
        mindmap: {
            root: "#6366f1",
            branch: "#2d3748",
            leaf: "#4b5563",
        },
    },
];

const btnExport = document.getElementById("btn-export");
const exportMenuPanel = document.getElementById("export-menu");
const exportMenuContainer = btnExport ? btnExport.closest(".export-menu") : null;
const btnTheme = document.getElementById("btn-theme");
const themeModalBackdrop = document.getElementById("theme-modal-backdrop");
const btnThemeClose = document.getElementById("btn-theme-close");
const themeLibraryList = document.getElementById("theme-library-list");
const themeSelect = document.getElementById("theme-select");
const themeNameInput = document.getElementById("theme-name");
const btnSaveTheme = document.getElementById("btn-save-theme");
const themeCanvasBgInput = document.getElementById("theme-canvas-bg");
const themeGridColorInput = document.getElementById("theme-grid-color");
const themeFlowStartInput = document.getElementById("theme-flow-start");
const themeFlowProcessInput = document.getElementById("theme-flow-process");
const themeFlowDecisionInput = document.getElementById("theme-flow-decision");
const themeFlowEndInput = document.getElementById("theme-flow-end");
const themeMindRootInput = document.getElementById("theme-mind-root");
const themeMindBranchInput = document.getElementById("theme-mind-branch");
const themeMindLeafInput = document.getElementById("theme-mind-leaf");
const nodeEditorBackdrop = document.getElementById("node-editor-backdrop");
const nodeEditorInput = document.getElementById("node-editor-input");
const btnNodeSave = document.getElementById("btn-node-save");
const btnNodeCancel = document.getElementById("btn-node-cancel");

let themeState = loadThemeState();
let currentTheme = getThemeById(themeState.activeThemeId) || BASE_THEMES[0];
let editingNodeId = null;

// ── DOM ──
const btnGenerate = document.getElementById("btn-generate");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnReset = document.getElementById("btn-reset");
// const btnExport = document.getElementById("btn-export");
const canvasArea = document.getElementById("canvas-area");
const placeholder = document.getElementById("placeholder");
const statusBar = document.getElementById("status-bar");
const statusIcon = document.getElementById("status-icon");
const statusMessage = document.getElementById("status-message");
const canvasTitle = document.getElementById("canvas-title");

// Stored initial viewBox for reset
let initialViewBox = { x: 0, y: 0, w: 1200, h: 800 };

// ── Hidden canvas for text measuring ──
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function measureText(text, fontSize) {
    measureCtx.font = `500 ${fontSize || 13}px Inter, sans-serif`;
    return measureCtx.measureText(text).width;
}

// ── SVG Namespace ──
const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgElement(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        el.setAttribute(k, v);
    }
    return el;
}

function svgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function clampByte(value) {
    return Math.max(0, Math.min(255, value));
}

function hexToRgb(hex) {
    const normalized = hex.replace("#", "").trim();
    const value = normalized.length === 3
        ? normalized
              .split("")
              .map((char) => char + char)
              .join("")
        : normalized;
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16),
    };
}

function rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
            .map((value) => clampByte(Math.round(value)).toString(16).padStart(2, "0"))
            .join("")
    );
}

function mixColor(colorA, colorB, weight) {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    return rgbToHex(
        a.r + (b.r - a.r) * weight,
        a.g + (b.g - a.g) * weight,
        a.b + (b.b - a.b) * weight
    );
}

function getContrastingTextColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance > 145 ? "#111111" : "#f8fafc";
}

function buildNodePalette(fill) {
    return {
        fill,
        stroke: mixColor(fill, "#ffffff", 0.18),
        text: getContrastingTextColor(fill),
    };
}

function loadThemeState() {
    const savedThemes = loadSavedThemes();
    const activeThemeId =
        localStorage.getItem(STORAGE_KEYS.activeTheme) || BASE_THEMES[0].id;
    return {
        savedThemes,
        activeThemeId,
    };
}

function loadSavedThemes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.themes);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function persistThemes() {
    localStorage.setItem(STORAGE_KEYS.themes, JSON.stringify(themeState.savedThemes));
    localStorage.setItem(STORAGE_KEYS.activeTheme, themeState.activeThemeId);
}

function getAllThemes() {
    return [...BASE_THEMES, ...themeState.savedThemes];
}

function getThemeById(id) {
    return getAllThemes().find((theme) => theme.id === id);
}

function getSavedThemeById(id) {
    return themeState.savedThemes.find((theme) => theme.id === id);
}

function cloneTheme(theme) {
    return JSON.parse(JSON.stringify(theme));
}

function themeFromControls(name = "Custom Theme") {
    return {
        id: `custom-${Date.now()}`,
        name,
        canvasBg: themeCanvasBgInput.value,
        canvasGrid: themeGridColorInput.value,
        flowchart: {
            start: themeFlowStartInput.value,
            process: themeFlowProcessInput.value,
            decision: themeFlowDecisionInput.value,
            end: themeFlowEndInput.value,
        },
        mindmap: {
            root: themeMindRootInput.value,
            branch: themeMindBranchInput.value,
            leaf: themeMindLeafInput.value,
        },
    };
}

function applyThemeToControls(theme) {
    themeCanvasBgInput.value = theme.canvasBg;
    themeGridColorInput.value = theme.canvasGrid;
    themeFlowStartInput.value = theme.flowchart.start;
    themeFlowProcessInput.value = theme.flowchart.process;
    themeFlowDecisionInput.value = theme.flowchart.decision;
    themeFlowEndInput.value = theme.flowchart.end;
    themeMindRootInput.value = theme.mindmap.root;
    themeMindBranchInput.value = theme.mindmap.branch;
    themeMindLeafInput.value = theme.mindmap.leaf;
}

function applyThemeToPage(theme) {
    currentTheme = cloneTheme(theme);
    document.documentElement.style.setProperty("--canvas-bg", theme.canvasBg);
    document.documentElement.style.setProperty("--canvas-grid", theme.canvasGrid);

    if (themeSelect) {
        themeSelect.value = theme.id;
    }

    if (themeNameInput) {
        themeNameInput.value = theme.name;
    }

    applyThemeToControls(theme);
}

function renderThemeOptions() {
    if (!themeSelect) return;
    const themes = getAllThemes();
    themeSelect.innerHTML = themes
        .map((theme) => `<option value="${theme.id}">${theme.name}</option>`)
        .join("");
    if (getThemeById(themeState.activeThemeId)) {
        themeSelect.value = themeState.activeThemeId;
    }
}

function renderThemeLibrary() {
    if (!themeLibraryList) return;
    const themes = getAllThemes();
    if (themes.length === 0) {
        themeLibraryList.innerHTML = '<p class="theme-empty-state">No saved themes yet.</p>';
        return;
    }

    themeLibraryList.innerHTML = themes
        .map((theme) => {
            const swatches = [
                theme.canvasBg,
                theme.canvasGrid,
                theme.flowchart?.start || theme.flowchart?.process,
                theme.flowchart?.decision || theme.mindmap?.branch,
                theme.mindmap?.root || theme.flowchart?.end,
            ]
                .filter(Boolean)
                .map((color) => `<span class="theme-swatch" style="background:${color}"></span>`)
                .join("");

            const isSaved = Boolean(getSavedThemeById(theme.id));
            const isActive = theme.id === themeState.activeThemeId;

            return `
                <article class="theme-card ${isActive ? "active" : ""}">
                    <div class="theme-card-top">
                        <div>
                            <div class="theme-card-name">${theme.name}</div>
                            <div class="theme-card-meta">${isSaved ? "Custom theme" : "Built-in theme"}</div>
                        </div>
                        ${isActive ? '<span class="theme-card-badge">Active</span>' : ""}
                    </div>
                    <div class="theme-swatches">${swatches}</div>
                    <div class="theme-card-actions">
                        <button class="btn-secondary" data-theme-apply="${theme.id}" type="button">Apply</button>
                        ${isSaved ? `<button class="btn-secondary" data-theme-delete="${theme.id}" type="button">Delete</button>` : ""}
                    </div>
                </article>
            `;
        })
        .join("");

    themeLibraryList.querySelectorAll("[data-theme-apply]").forEach((button) => {
        button.addEventListener("click", () => updateThemeSelection(button.dataset.themeApply));
    });

    themeLibraryList.querySelectorAll("[data-theme-delete]").forEach((button) => {
        button.addEventListener("click", () => {
            const themeId = button.dataset.themeDelete;
            themeState.savedThemes = themeState.savedThemes.filter((theme) => theme.id !== themeId);
            if (themeState.activeThemeId === themeId) {
                themeState.activeThemeId = BASE_THEMES[0].id;
                applyThemeToPage(BASE_THEMES[0]);
            }
            persistThemes();
            renderThemeOptions();
            renderThemeLibrary();
        });
    });
}

function openThemeModal() {
    if (!themeModalBackdrop) return;
    themeModalBackdrop.hidden = false;
    renderThemeOptions();
    renderThemeLibrary();
}

function closeThemeModal() {
    if (!themeModalBackdrop) return;
    themeModalBackdrop.hidden = true;
}

function updateThemeSelection(themeId) {
    const theme = getThemeById(themeId);
    if (!theme) return;
    themeState.activeThemeId = themeId;
    persistThemes();
    applyThemeToPage(theme);
    renderThemeLibrary();
    if (diagramData) {
        renderDiagram();
    }
}

function saveCurrentTheme() {
    const themeName = themeNameInput.value.trim() || "Custom Theme";
    const existingSavedTheme = getSavedThemeById(currentTheme.id);
    const themeId = existingSavedTheme ? currentTheme.id : `custom-${Date.now()}`;
    const theme = {
        id: themeId,
        name: themeName,
        canvasBg: themeCanvasBgInput.value,
        canvasGrid: themeGridColorInput.value,
        flowchart: {
            start: themeFlowStartInput.value,
            process: themeFlowProcessInput.value,
            decision: themeFlowDecisionInput.value,
            end: themeFlowEndInput.value,
        },
        mindmap: {
            root: themeMindRootInput.value,
            branch: themeMindBranchInput.value,
            leaf: themeMindLeafInput.value,
        },
    };
    themeState.savedThemes = [
        ...themeState.savedThemes.filter((item) => item.id !== theme.id && item.name !== themeName),
        theme,
    ];
    themeState.activeThemeId = theme.id;
    persistThemes();
    renderThemeOptions();
    renderThemeLibrary();
    applyThemeToPage(theme);
    themeNameInput.value = theme.name;
    if (diagramData) {
        renderDiagram();
    }
}

function updateThemeFromInputs() {
    currentTheme.name = themeNameInput.value.trim() || currentTheme.name || "Custom Theme";
    currentTheme.canvasBg = themeCanvasBgInput.value;
    currentTheme.canvasGrid = themeGridColorInput.value;
    currentTheme.flowchart = {
        start: themeFlowStartInput.value,
        process: themeFlowProcessInput.value,
        decision: themeFlowDecisionInput.value,
        end: themeFlowEndInput.value,
    };
    currentTheme.mindmap = {
        root: themeMindRootInput.value,
        branch: themeMindBranchInput.value,
        leaf: themeMindLeafInput.value,
    };
    document.documentElement.style.setProperty("--canvas-bg", currentTheme.canvasBg);
    document.documentElement.style.setProperty("--canvas-grid", currentTheme.canvasGrid);
    if (diagramData) {
        renderDiagram();
    }
}

function getCurrentTheme() {
    return cloneTheme(currentTheme);
}

function openNodeEditor(nodeId) {
    if (!nodeEditorBackdrop || !nodeEditorInput) return;
    const node = findNodeById(diagramData, nodeId);
    if (!node) return;
    editingNodeId = nodeId;
    nodeEditorInput.value = node.label || "";
    nodeEditorBackdrop.hidden = false;
    nodeEditorInput.focus();
    nodeEditorInput.select();
}

function attachNodeEditTriggers(group, nodeId) {
    group.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openNodeEditor(nodeId);
    });

    group.addEventListener("click", (event) => {
        if (event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            openNodeEditor(nodeId);
        }
    });
}

function closeNodeEditor() {
    if (!nodeEditorBackdrop) return;
    editingNodeId = null;
    nodeEditorBackdrop.hidden = true;
}

function findNodeById(data, nodeId) {
    if (!data) return null;
    if (diagramType === "flowchart") {
        return (data.nodes || []).find((node) => node.id === nodeId) || null;
    }

    function walk(node) {
        if (!node) return null;
        if (node.id === nodeId) return node;
        for (const child of node.children || []) {
            const match = walk(child);
            if (match) return match;
        }
        return null;
    }

    return walk(data.root);
}

function updateNodeLabel(nodeId, label) {
    if (!diagramData) return;
    const node = findNodeById(diagramData, nodeId);
    if (!node) return;
    node.label = label;
}

function updateThemeVarsFromCurrentTheme() {
    document.documentElement.style.setProperty("--canvas-bg", currentTheme.canvasBg);
    document.documentElement.style.setProperty("--canvas-grid", currentTheme.canvasGrid);
}

function sanitizeFileStem(value) {
    return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "diagram";
}

async function svgToDataUrl(svg) {
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" standalone="no"?>\r\n${source}`], {
        type: "image/svg+xml;charset=utf-8",
    });
    return URL.createObjectURL(blob);
}

// ── Status Helpers ──
function showStatus(type, message) {
    statusBar.className = "status-bar " + type;
    if (type === "loading") {
        statusIcon.innerHTML = '<div class="spinner"></div>';
    } else if (type === "error") {
        statusIcon.textContent = "!";
    } else {
        statusIcon.textContent = "";
    }
    statusMessage.textContent = message;
}

function hideStatus() {
    statusBar.className = "status-bar";
}

// ═══════════════════════════
//  GENERATE
// ═══════════════════════════

btnGenerate.addEventListener("click", async () => {
    const apiKey = document.getElementById("api-key").value.trim();
    const text = document.getElementById("input-text").value.trim();
    const type = document.getElementById("diagram-type").value;

    if (!apiKey) {
        showStatus("error", "Please enter your Groq API key.");
        return;
    }
    if (!text) {
        showStatus("error", "Please enter some text to visualize.");
        return;
    }

    btnGenerate.disabled = true;
    btnGenerate.textContent = "Generating...";
    showStatus("loading", "Sending text to LLM for semantic extraction...");

    try {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("diagram_type", type);
        formData.append("api_key", apiKey);

        const response = await fetch("/generate", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();

        if (!result.success) {
            showStatus("error", result.error || "Generation failed.");
            return;
        }

        diagramData = result.data;
        diagramType = result.diagram_type;

        showStatus("success", "Diagram generated successfully.");
        canvasTitle.textContent =
            type === "flowchart" ? "Flowchart" : "Mind Map";

        renderDiagram();
        setTimeout(hideStatus, 3000);
    } catch (err) {
        showStatus("error", "Network error: " + err.message);
    } finally {
        btnGenerate.disabled = false;
        btnGenerate.textContent = "Generate Diagram";
    }
});

// ═══════════════════════════
//  RENDER ROUTER
// ═══════════════════════════

function renderDiagram() {
    placeholder.style.display = "none";
    nodePositions = {};
    nodeElements = {};
    nodeSizesGlobal = {};
    dragTarget = null;
    isPanning = false;
    redrawEdges = null;

    const existing = document.getElementById("diagram-svg");
    if (existing) existing.remove();

    if (diagramType === "flowchart") {
        renderFlowchart(diagramData);
    } else {
        renderMindmap(diagramData);
    }
}

// ═══════════════════════════
//  SHARED: ATTACH SVG EVENTS
// ═══════════════════════════

function attachSvgEvents(svg) {
    svg.addEventListener("mousemove", (e) => {
        const pt = svgPoint(svg, e.clientX, e.clientY);

        if (dragTarget) {
            const newX = pt.x - dragOffset.x;
            const newY = pt.y - dragOffset.y;
            nodePositions[dragTarget].x = newX;
            nodePositions[dragTarget].y = newY;
            updateNodeVisual(dragTarget);
            if (redrawEdges) redrawEdges();
            return;
        }

        if (isPanning) {
            const dx = pt.x - panStart.x;
            const dy = pt.y - panStart.y;
            viewBox.x -= dx * 0.5;
            viewBox.y -= dy * 0.5;
            svg.setAttribute(
                "viewBox",
                `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
            );
        }
    });

    svg.addEventListener("mousedown", (e) => {
        if (!dragTarget) {
            isPanning = true;
            panStart = svgPoint(svg, e.clientX, e.clientY);
            svg.style.cursor = "move";
        }
    });

    svg.addEventListener("mouseup", () => {
        if (dragTarget) {
            const el = nodeElements[dragTarget];
            if (el && el.group) el.group.style.cursor = "grab";
            dragTarget = null;
        }
        isPanning = false;
        svg.style.cursor = "default";
    });

    svg.addEventListener("mouseleave", () => {
        if (dragTarget) {
            const el = nodeElements[dragTarget];
            if (el && el.group) el.group.style.cursor = "grab";
        }
        dragTarget = null;
        isPanning = false;
        svg.style.cursor = "default";
    });

    svg.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
            const pt = svgPoint(svg, e.clientX, e.clientY);

            const newW = viewBox.w * scaleFactor;
            const newH = viewBox.h * scaleFactor;

            viewBox.x = pt.x - (pt.x - viewBox.x) * scaleFactor;
            viewBox.y = pt.y - (pt.y - viewBox.y) * scaleFactor;
            viewBox.w = newW;
            viewBox.h = newH;

            svg.setAttribute(
                "viewBox",
                `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
            );
        },
        { passive: false }
    );
}

function makeNodeDraggable(svg, g, nodeId) {
    g.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        dragTarget = nodeId;
        g.style.cursor = "grabbing";
        const pt = svgPoint(svg, e.clientX, e.clientY);
        dragOffset.x = pt.x - nodePositions[nodeId].x;
        dragOffset.y = pt.y - nodePositions[nodeId].y;
    });
}

function updateNodeVisual(id) {
    const el = nodeElements[id];
    const pos = nodePositions[id];
    if (!el || !pos) return;

    if (el.shapeType === "circle") {
        el.shape.setAttribute("cx", pos.x);
        el.shape.setAttribute("cy", pos.y);
    } else if (el.shapeType === "diamond") {
        const hw = el.halfW;
        const hh = el.halfH;
        el.shape.setAttribute(
            "points",
            `${pos.x},${pos.y - hh} ${pos.x + hw},${pos.y} ${pos.x},${pos.y + hh} ${pos.x - hw},${pos.y}`
        );
    } else {
        const sz = nodeSizesGlobal[id];
        if (sz) {
            el.shape.setAttribute("x", pos.x - sz.w / 2);
            el.shape.setAttribute("y", pos.y - sz.h / 2);
        }
    }

    el.text.setAttribute("x", pos.x);
    el.text.setAttribute("y", pos.y);
}

// ═══════════════════════════
//  FLOWCHART
// ═══════════════════════════

function computeFlowchartLayout(data) {
    const nodes = data.nodes || [];
    const edges = data.edges || [];

    const outgoing = {};
    const incoming = {};

    nodes.forEach((n) => {
        outgoing[n.id] = [];
        incoming[n.id] = [];
    });

    edges.forEach((e) => {
        if (outgoing[e.from] && incoming[e.to]) {
            outgoing[e.from].push(e.to);
            incoming[e.to].push(e.from);
        }
    });

    // Topological BFS layering
    const layers = {};
    const visited = new Set();
    let queue = [];

    nodes.forEach((n) => {
        if (incoming[n.id].length === 0) {
            queue.push(n.id);
            layers[n.id] = 0;
            visited.add(n.id);
        }
    });

    if (queue.length === 0 && nodes.length > 0) {
        queue.push(nodes[0].id);
        layers[nodes[0].id] = 0;
        visited.add(nodes[0].id);
    }

    while (queue.length > 0) {
        const current = queue.shift();
        const currentLayer = layers[current];
        outgoing[current].forEach((child) => {
            const nextLayer = currentLayer + 1;
            if (!visited.has(child)) {
                visited.add(child);
                layers[child] = nextLayer;
                queue.push(child);
            } else {
                if (layers[child] < nextLayer) {
                    layers[child] = nextLayer;
                }
            }
        });
    }

    nodes.forEach((n) => {
        if (!visited.has(n.id)) {
            layers[n.id] = 0;
        }
    });

    // Group by layer
    const layerGroups = {};
    let maxLayer = 0;
    nodes.forEach((n) => {
        const l = layers[n.id] || 0;
        if (!layerGroups[l]) layerGroups[l] = [];
        layerGroups[l].push(n);
        maxLayer = Math.max(maxLayer, l);
    });

    // Compute sizes
    const nodeSizes = {};
    const paddingX = 36;
    const minW = 140;
    const nodeH = 50;

    nodes.forEach((n) => {
        const textW = measureText(n.label, 13);
        const w = Math.max(minW, textW + paddingX * 2);
        nodeSizes[n.id] = { w, h: nodeH };
    });

    // Position
    const gapX = 70;
    const gapY = 90;
    const positions = {};

    for (let l = 0; l <= maxLayer; l++) {
        const group = layerGroups[l] || [];
        const totalW =
            group.reduce((s, n) => s + nodeSizes[n.id].w, 0) +
            Math.max(0, group.length - 1) * gapX;
        let startX = -totalW / 2;

        group.forEach((n) => {
            const sz = nodeSizes[n.id];
            positions[n.id] = {
                x: startX + sz.w / 2,
                y: l * (nodeH + gapY),
            };
            startX += sz.w + gapX;
        });
    }

    return { nodes, edges, positions, nodeSizes };
}

function renderFlowchart(data) {
    const layout = computeFlowchartLayout(data);
    const { nodes, edges, positions, nodeSizes } = layout;

    // Store globally for drag updates
    nodes.forEach((n) => {
        nodePositions[n.id] = { ...positions[n.id] };
        nodeSizesGlobal[n.id] = { ...nodeSizes[n.id] };
    });

    // Compute bounds
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    nodes.forEach((n) => {
        const p = positions[n.id];
        const s = nodeSizes[n.id];
        minX = Math.min(minX, p.x - s.w / 2 - 20);
        minY = Math.min(minY, p.y - s.h / 2 - 20);
        maxX = Math.max(maxX, p.x + s.w / 2 + 20);
        maxY = Math.max(maxY, p.y + s.h / 2 + 20);
    });

    const pad = 100;
    viewBox = {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
    };
    initialViewBox = { ...viewBox };

    const svg = createSvgElement("svg", {
        id: "diagram-svg",
        viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
        preserveAspectRatio: "xMidYMid meet",
    });

    // Defs
    const defs = createSvgElement("defs");

    const marker = createSvgElement("marker", {
        id: "arrowhead",
        markerWidth: "12",
        markerHeight: "8",
        refX: "11",
        refY: "4",
        orient: "auto",
        markerUnits: "strokeWidth",
    });
    marker.appendChild(
        createSvgElement("polygon", {
            points: "0 0, 12 4, 0 8",
            fill: "#6366f1",
        })
    );
    defs.appendChild(marker);

    const filter = createSvgElement("filter", {
        id: "shadow",
        x: "-15%",
        y: "-15%",
        width: "140%",
        height: "140%",
    });
    filter.appendChild(
        createSvgElement("feDropShadow", {
            dx: "0",
            dy: "3",
            stdDeviation: "5",
            "flood-color": "#000000",
            "flood-opacity": "0.35",
        })
    );
    defs.appendChild(filter);

    svg.appendChild(defs);

    const edgesGroup = createSvgElement("g", { class: "edges-layer" });
    svg.appendChild(edgesGroup);
    const nodesGroup = createSvgElement("g", { class: "nodes-layer" });
    svg.appendChild(nodesGroup);

    // Edge drawing function
    function drawEdges() {
        while (edgesGroup.firstChild) edgesGroup.removeChild(edgesGroup.firstChild);

        edges.forEach((edge) => {
            const from = nodePositions[edge.from];
            const to = nodePositions[edge.to];
            if (!from || !to) return;

            const fromSz = nodeSizesGlobal[edge.from];
            const toSz = nodeSizesGlobal[edge.to];

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            let x1, y1, x2, y2;

            if (Math.abs(dy) >= Math.abs(dx)) {
                if (dy >= 0) {
                    x1 = from.x;
                    y1 = from.y + fromSz.h / 2;
                    x2 = to.x;
                    y2 = to.y - toSz.h / 2;
                } else {
                    x1 = from.x;
                    y1 = from.y - fromSz.h / 2;
                    x2 = to.x;
                    y2 = to.y + toSz.h / 2;
                }
            } else {
                if (dx >= 0) {
                    x1 = from.x + fromSz.w / 2;
                    y1 = from.y;
                    x2 = to.x - toSz.w / 2;
                    y2 = to.y;
                } else {
                    x1 = from.x - fromSz.w / 2;
                    y1 = from.y;
                    x2 = to.x + toSz.w / 2;
                    y2 = to.y;
                }
            }

            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            let d;
            if (Math.abs(dy) >= Math.abs(dx)) {
                d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
            } else {
                d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
            }

            const path = createSvgElement("path", {
                d,
                fill: "none",
                stroke: "#4f46e5",
                "stroke-width": "2",
                "marker-end": "url(#arrowhead)",
                opacity: "0.6",
            });
            edgesGroup.appendChild(path);

            if (edge.label) {
                const bg = createSvgElement("rect", {
                    x: mx - measureText(edge.label, 10) / 2 - 6,
                    y: my - 16,
                    width: measureText(edge.label, 10) + 12,
                    height: 18,
                    rx: "4",
                    fill: "#1e1b4b",
                    opacity: "0.9",
                });
                edgesGroup.appendChild(bg);

                const lbl = createSvgElement("text", {
                    x: mx,
                    y: my - 5,
                    fill: "#a5b4fc",
                    "font-size": "10",
                    "font-family": "Inter, sans-serif",
                    "text-anchor": "middle",
                    "pointer-events": "none",
                });
                lbl.textContent = edge.label;
                edgesGroup.appendChild(lbl);
            }
        });
    }

    redrawEdges = drawEdges;
    drawEdges();

    const theme = getCurrentTheme();
    const typeColors = {
        start: buildNodePalette(theme.flowchart.start),
        end: buildNodePalette(theme.flowchart.end),
        process: buildNodePalette(theme.flowchart.process),
        decision: buildNodePalette(theme.flowchart.decision),
        default: buildNodePalette(theme.flowchart.process),
    };

    nodes.forEach((node) => {
        const pos = nodePositions[node.id];
        const sz = nodeSizesGlobal[node.id];
        const colors = typeColors[node.type] || typeColors.default;

        const g = createSvgElement("g", {
            class: "fc-node",
            "data-id": node.id,
            style: "cursor: grab;",
        });

        let shape;

        if (node.type === "decision") {
            const halfW = sz.w / 2 + 10;
            const halfH = sz.h / 2 + 10;
            shape = createSvgElement("polygon", {
                points: `${pos.x},${pos.y - halfH} ${pos.x + halfW},${pos.y} ${pos.x},${pos.y + halfH} ${pos.x - halfW},${pos.y}`,
                fill: colors.fill,
                stroke: colors.stroke,
                "stroke-width": "2",
                filter: "url(#shadow)",
            });
            nodeElements[node.id] = {
                shapeType: "diamond",
                halfW,
                halfH,
            };
        } else if (node.type === "start" || node.type === "end") {
            shape = createSvgElement("rect", {
                x: pos.x - sz.w / 2,
                y: pos.y - sz.h / 2,
                width: sz.w,
                height: sz.h,
                rx: sz.h / 2,
                ry: sz.h / 2,
                fill: colors.fill,
                stroke: colors.stroke,
                "stroke-width": "2",
                filter: "url(#shadow)",
            });
            nodeElements[node.id] = { shapeType: "rect" };
        } else {
            shape = createSvgElement("rect", {
                x: pos.x - sz.w / 2,
                y: pos.y - sz.h / 2,
                width: sz.w,
                height: sz.h,
                rx: "10",
                ry: "10",
                fill: colors.fill,
                stroke: colors.stroke,
                "stroke-width": "2",
                filter: "url(#shadow)",
            });
            nodeElements[node.id] = { shapeType: "rect" };
        }

        g.appendChild(shape);

        const text = createSvgElement("text", {
            x: pos.x,
            y: pos.y,
            fill: colors.text,
            "font-size": "13",
            "font-weight": "500",
            "font-family": "Inter, sans-serif",
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "pointer-events": "none",
        });
        text.textContent = node.label;
        g.appendChild(text);

        nodeElements[node.id].shape = shape;
        nodeElements[node.id].text = text;
        nodeElements[node.id].group = g;

        makeNodeDraggable(svg, g, node.id);
        attachNodeEditTriggers(g, node.id);
        nodesGroup.appendChild(g);
    });

    attachSvgEvents(svg);
    canvasArea.appendChild(svg);
}

// ═══════════════════════════
//  MINDMAP
// ═══════════════════════════

function computeMindmapLayout(root) {
    const allNodes = [];
    const allLinks = [];
    const sizes = {};

    function computeSizes(node, depth) {
        node._depth = depth;
        const fontSize = depth === 0 ? 15 : depth === 1 ? 13 : 12;
        const textW = measureText(node.label, fontSize);
        const r = Math.max(34, textW / 2 + 20);
        sizes[node.id] = { r, fontSize };
        (node.children || []).forEach((c) => computeSizes(c, depth + 1));
    }

    computeSizes(root, 0);

    function layout(node, x, y, angleStart, angleEnd, depth) {
        node._x = x;
        node._y = y;
        node._depth = depth;
        allNodes.push(node);

        const children = node.children || [];
        if (children.length === 0) return;

        const baseRadius = 200;
        const radius = baseRadius + depth * 60;
        const angleSpan = angleEnd - angleStart;
        const childAngle = angleSpan / children.length;

        children.forEach((child, i) => {
            const angle = angleStart + childAngle * (i + 0.5);
            const cx = x + radius * Math.cos(angle);
            const cy = y + radius * Math.sin(angle);

            allLinks.push({
                fromId: node.id,
                toId: child.id,
            });

            layout(
                child,
                cx,
                cy,
                angle - childAngle / 2,
                angle + childAngle / 2,
                depth + 1
            );
        });
    }

    layout(root, 0, 0, -Math.PI, Math.PI, 0);

    return { allNodes, allLinks, sizes };
}

function renderMindmap(data) {
    const root = data.root;
    if (!root) return;

    const { allNodes, allLinks, sizes } = computeMindmapLayout(root);

    allNodes.forEach((n) => {
        nodePositions[n.id] = { x: n._x, y: n._y };
        nodeSizesGlobal[n.id] = { r: sizes[n.id].r };
    });

    // Bounds
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    allNodes.forEach((n) => {
        const r = sizes[n.id].r;
        minX = Math.min(minX, n._x - r);
        minY = Math.min(minY, n._y - r);
        maxX = Math.max(maxX, n._x + r);
        maxY = Math.max(maxY, n._y + r);
    });

    const pad = 120;
    viewBox = {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
    };
    initialViewBox = { ...viewBox };

    const svg = createSvgElement("svg", {
        id: "diagram-svg",
        viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
        preserveAspectRatio: "xMidYMid meet",
    });

    // Defs
    const defs = createSvgElement("defs");
    const filter = createSvgElement("filter", {
        id: "mm-shadow",
        x: "-25%",
        y: "-25%",
        width: "160%",
        height: "160%",
    });
    filter.appendChild(
        createSvgElement("feDropShadow", {
            dx: "0",
            dy: "2",
            stdDeviation: "6",
            "flood-color": "#000000",
            "flood-opacity": "0.4",
        })
    );
    defs.appendChild(filter);
    svg.appendChild(defs);

    const linksGroup = createSvgElement("g", { class: "mm-links-layer" });
    svg.appendChild(linksGroup);
    const nodesGroup = createSvgElement("g", { class: "mm-nodes-layer" });
    svg.appendChild(nodesGroup);

    // Draw links
    function drawLinks() {
        while (linksGroup.firstChild) linksGroup.removeChild(linksGroup.firstChild);

        allLinks.forEach((link) => {
            const from = nodePositions[link.fromId];
            const to = nodePositions[link.toId];
            if (!from || !to) return;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const cx1 = from.x + dx * 0.4;
            const cy1 = from.y;
            const cx2 = from.x + dx * 0.6;
            const cy2 = to.y;

            const path = createSvgElement("path", {
                d: `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`,
                fill: "none",
                stroke: "#3730a3",
                "stroke-width": "2.5",
                opacity: "0.45",
                "stroke-linecap": "round",
            });
            linksGroup.appendChild(path);
        });
    }

    redrawEdges = drawLinks;
    drawLinks();

    const theme = getCurrentTheme();
    const depthColors = [
        buildNodePalette(theme.mindmap.root),
        buildNodePalette(theme.mindmap.branch),
        buildNodePalette(theme.mindmap.leaf),
        buildNodePalette(theme.mindmap.leaf),
    ];

    allNodes.forEach((node) => {
        const pos = nodePositions[node.id];
        const sz = sizes[node.id];
        const depth = node._depth || 0;
        const colors = depthColors[Math.min(depth, depthColors.length - 1)];

        const g = createSvgElement("g", {
            class: "mm-node",
            "data-id": node.id,
            style: "cursor: grab;",
        });

        const circle = createSvgElement("circle", {
            cx: pos.x,
            cy: pos.y,
            r: sz.r,
            fill: colors.fill,
            stroke: colors.stroke,
            "stroke-width": depth === 0 ? "3" : "2",
            filter: depth < 2 ? "url(#mm-shadow)" : "",
        });
        g.appendChild(circle);

        const text = createSvgElement("text", {
            x: pos.x,
            y: pos.y,
            fill: colors.text,
            "font-size": sz.fontSize,
            "font-weight": depth === 0 ? "700" : "500",
            "font-family": "Inter, sans-serif",
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "pointer-events": "none",
        });
        text.textContent = node.label;
        g.appendChild(text);

        nodeElements[node.id] = {
            shape: circle,
            text,
            group: g,
            shapeType: "circle",
        };

        makeNodeDraggable(svg, g, node.id);
        attachNodeEditTriggers(g, node.id);
        nodesGroup.appendChild(g);
    });

    attachSvgEvents(svg);
    canvasArea.appendChild(svg);
}

// ═══════════════════════════
//  TOOLBAR CONTROLS
// ═══════════════════════════

function getExportedSvgClone() {
    const svg = document.getElementById("diagram-svg");
    if (!svg) return null;

    const clone = svg.cloneNode(true);
    const viewBoxParts = (svg.getAttribute("viewBox") || "0 0 1200 800")
        .split(/\s+/)
        .map(Number);
    const width = Math.max(1, Math.round(viewBoxParts[2] || 1200));
    const height = Math.max(1, Math.round(viewBoxParts[3] || 800));

    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const backgroundRect = createSvgElement("rect", {
        x: viewBoxParts[0] || 0,
        y: viewBoxParts[1] || 0,
        width,
        height,
        fill: currentTheme.canvasBg,
    });
    clone.insertBefore(backgroundRect, clone.firstChild);

    const styleEl = document.createElementNS(SVG_NS, "style");
    styleEl.textContent = `text { font-family: Inter, -apple-system, sans-serif; }`;
    clone.insertBefore(styleEl, clone.firstChild);

    return { clone, width, height };
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportSvg() {
    const exported = getExportedSvgClone();
    if (!exported) {
        showStatus("error", "No diagram to export.");
        setTimeout(hideStatus, 2000);
        return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(exported.clone);
    const blob = new Blob([`<?xml version="1.0" standalone="no"?>\r\n${source}`], {
        type: "image/svg+xml;charset=utf-8",
    });

    downloadBlob(blob, `tissue-ai-${sanitizeFileStem(diagramType || "diagram")}.svg`);
}

function exportPng() {
    const exported = getExportedSvgClone();
    if (!exported) {
        showStatus("error", "No diagram to export.");
        setTimeout(hideStatus, 2000);
        return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(exported.clone);
    const blob = new Blob([`<?xml version="1.0" standalone="no"?>\r\n${source}`], {
        type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const image = new Image();
    image.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = exported.width * scale;
        canvas.height = exported.height * scale;
        const context = canvas.getContext("2d");
        context.fillStyle = currentTheme.canvasBg;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            downloadBlob(pngBlob, `tissue-ai-${sanitizeFileStem(diagramType || "diagram")}.png`);
        });
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        showStatus("error", "PNG export failed.");
        setTimeout(hideStatus, 2000);
    };
    image.src = url;
}

function exportPdf() {
    const exported = getExportedSvgClone();
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!exported || !jsPDF) {
        showStatus("error", "PDF export is unavailable right now.");
        setTimeout(hideStatus, 2000);
        return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(exported.clone);
    const blob = new Blob([`<?xml version="1.0" standalone="no"?>\r\n${source}`], {
        type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const image = new Image();
    image.onload = () => {
        const scale = 2;
        const width = exported.width * scale;
        const height = exported.height * scale;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = currentTheme.canvasBg;
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const pngData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: width >= height ? "landscape" : "portrait", unit: "px", format: [width, height] });
        pdf.addImage(pngData, "PNG", 0, 0, width, height);
        pdf.save(`tissue-ai-${sanitizeFileStem(diagramType || "diagram")}.pdf`);
        URL.revokeObjectURL(url);
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        showStatus("error", "PDF export failed.");
        setTimeout(hideStatus, 2000);
    };
    image.src = url;
}

function handleExport(format) {
    if (format === "svg") {
        exportSvg();
    } else if (format === "png") {
        exportPng();
    } else if (format === "pdf") {
        exportPdf();
    }
    if (exportMenuContainer) {
        exportMenuContainer.classList.remove("open");
    }
}

renderThemeOptions();
applyThemeToPage(currentTheme);
renderThemeLibrary();

if (btnTheme) {
    btnTheme.addEventListener("click", openThemeModal);
}

if (btnThemeClose) {
    btnThemeClose.addEventListener("click", closeThemeModal);
}

if (themeModalBackdrop) {
    themeModalBackdrop.addEventListener("click", (event) => {
        if (event.target === themeModalBackdrop) {
            closeThemeModal();
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && themeModalBackdrop && !themeModalBackdrop.hidden) {
        closeThemeModal();
    }
});

if (themeSelect) {
    themeSelect.addEventListener("change", () => {
        updateThemeSelection(themeSelect.value);
    });
}

[
    themeCanvasBgInput,
    themeGridColorInput,
    themeFlowStartInput,
    themeFlowProcessInput,
    themeFlowDecisionInput,
    themeFlowEndInput,
    themeMindRootInput,
    themeMindBranchInput,
    themeMindLeafInput,
].forEach((input) => {
    if (input) {
        input.addEventListener("input", () => {
            updateThemeFromInputs();
        });
    }
});

if (btnSaveTheme) {
    btnSaveTheme.addEventListener("click", saveCurrentTheme);
}

if (themeNameInput) {
    themeNameInput.addEventListener("change", () => {
        currentTheme.name = themeNameInput.value.trim() || currentTheme.name || "Custom Theme";
    });
}

btnZoomIn.addEventListener("click", () => {
    const svg = document.getElementById("diagram-svg");
    if (!svg) return;
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    viewBox.w *= 0.8;
    viewBox.h *= 0.8;
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    svg.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    );
});

btnZoomOut.addEventListener("click", () => {
    const svg = document.getElementById("diagram-svg");
    if (!svg) return;
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    viewBox.w *= 1.25;
    viewBox.h *= 1.25;
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    svg.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    );
});

btnReset.addEventListener("click", () => {
    const svg = document.getElementById("diagram-svg");
    if (!svg) return;
    viewBox = { ...initialViewBox };
    svg.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    );
});

if (btnExport && exportMenuContainer) {
    btnExport.addEventListener("click", (event) => {
        event.stopPropagation();
        exportMenuContainer.classList.toggle("open");
    });
}

if (exportMenuPanel) {
    exportMenuPanel.querySelectorAll("[data-export]").forEach((button) => {
        button.addEventListener("click", () => {
            handleExport(button.dataset.export);
        });
    });
}

if (btnNodeSave && nodeEditorInput) {
    btnNodeSave.addEventListener("click", () => {
        if (editingNodeId === null) return;
        const nextLabel = nodeEditorInput.value.trim();
        if (!nextLabel) {
            showStatus("error", "Node text cannot be empty.");
            setTimeout(hideStatus, 2000);
            return;
        }
        updateNodeLabel(editingNodeId, nextLabel);
        closeNodeEditor();
        renderDiagram();
    });
}

if (btnNodeCancel) {
    btnNodeCancel.addEventListener("click", closeNodeEditor);
}

if (nodeEditorBackdrop) {
    nodeEditorBackdrop.addEventListener("click", (event) => {
        if (event.target === nodeEditorBackdrop) {
            closeNodeEditor();
        }
    });
}

if (nodeEditorInput && btnNodeSave) {
    nodeEditorInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            btnNodeSave.click();
        } else if (event.key === "Escape") {
            closeNodeEditor();
        }
    });
}

document.addEventListener("click", (event) => {
    if (
        exportMenuContainer &&
        btnExport &&
        !exportMenuContainer.contains(event.target) &&
        event.target !== btnExport
    ) {
        exportMenuContainer.classList.remove("open");
    }
});