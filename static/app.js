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
    apiKey: "tissue-ai-api-key",
};

const BASE_THEMES = [
    {
        id: "midnight-aurora",
        name: "Midnight Aurora",
        // App UI Colors
        bg: "#0a0a0f",
        surface: "#12121a",
        surfaceHover: "#1a1a26",
        border: "#2a2a3a",
        borderFocus: "#6366f1",
        text: "#e4e4e7",
        textMuted: "#71717a",
        accent: "#6366f1",
        accentHover: "#818cf8",
        // Canvas Colors
        canvasBg: "#0c0c12",
        canvasGrid: "#1a1a2a",
        // Diagram Colors
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
        // App UI Colors
        bg: "#0f0b08",
        surface: "#1a1410",
        surfaceHover: "#241a13",
        border: "#3d2f25",
        borderFocus: "#ea580c",
        text: "#f5e6d3",
        textMuted: "#a89080",
        accent: "#ea580c",
        accentHover: "#f97316",
        // Canvas Colors
        canvasBg: "#120f0c",
        canvasGrid: "#2a201a",
        // Diagram Colors
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
        // App UI Colors
        bg: "#f9fafb",
        surface: "#f3f4f6",
        surfaceHover: "#e5e7eb",
        border: "#d1d5db",
        borderFocus: "#3b82f6",
        text: "#1f2937",
        textMuted: "#6b7280",
        accent: "#3b82f6",
        accentHover: "#2563eb",
        // Canvas Colors
        canvasBg: "#f8f9fc",
        canvasGrid: "#e5e7eb",
        // Diagram Colors
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
        // App UI Colors
        bg: "#0f172a",
        surface: "#1e293b",
        surfaceHover: "#334155",
        border: "#475569",
        borderFocus: "#6366f1",
        text: "#e2e8f0",
        textMuted: "#94a3b8",
        accent: "#6366f1",
        accentHover: "#818cf8",
        // Canvas Colors
        canvasBg: "#1a1f2e",
        canvasGrid: "#2d3748",
        // Diagram Colors
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
const btnCreateTheme = document.getElementById("btn-create-theme");
// UI Color Inputs
const themeBgInput = document.getElementById("theme-bg");
const themeSurfaceInput = document.getElementById("theme-surface");
const themeSurfaceHoverInput = document.getElementById("theme-surface-hover");
const themeTextInput = document.getElementById("theme-text");
const themeTextMutedInput = document.getElementById("theme-text-muted");
const themeBorderInput = document.getElementById("theme-border");
const themeAccentInput = document.getElementById("theme-accent");
const themeAccentHoverInput = document.getElementById("theme-accent-hover");
// Canvas Color Inputs
const themeCanvasBgInput = document.getElementById("theme-canvas-bg");
const themeGridColorInput = document.getElementById("theme-grid-color");
// Diagram Color Inputs
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

// New controls
const apiKeyInput = document.getElementById("api-key");
const temperatureSlider = document.getElementById("temperature");
const temperatureValue = document.getElementById("temp-value");
const complexitySelect = document.getElementById("complexity");

let themeState = loadThemeState();
let currentTheme = getThemeById(themeState.activeThemeId) || BASE_THEMES[0];
let editingNodeId = null;

// ── DOM ──
const btnGenerate = document.getElementById("btn-generate");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnReset = document.getElementById("btn-reset");
const btnAutoAlign = document.getElementById("btn-auto-align");
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

function isBuiltInTheme(themeId) {
    return BASE_THEMES.some((theme) => theme.id === themeId);
}

function cloneTheme(theme) {
    return JSON.parse(JSON.stringify(theme));
}

function themeFromControls(name = "Custom Theme") {
    return {
        id: `custom-${Date.now()}`,
        name,
        // UI Colors
        bg: themeBgInput.value,
        surface: themeSurfaceInput.value,
        surfaceHover: themeSurfaceHoverInput.value,
        text: themeTextInput.value,
        textMuted: themeTextMutedInput.value,
        border: themeBorderInput.value,
        accent: themeAccentInput.value,
        accentHover: themeAccentHoverInput.value,
        // Canvas Colors
        canvasBg: themeCanvasBgInput.value,
        canvasGrid: themeGridColorInput.value,
        // Diagram Colors
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
    // UI Color Inputs
    if (themeBgInput) themeBgInput.value = theme.bg;
    if (themeSurfaceInput) themeSurfaceInput.value = theme.surface;
    if (themeSurfaceHoverInput) themeSurfaceHoverInput.value = theme.surfaceHover;
    if (themeTextInput) themeTextInput.value = theme.text;
    if (themeTextMutedInput) themeTextMutedInput.value = theme.textMuted;
    if (themeBorderInput) themeBorderInput.value = theme.border;
    if (themeAccentInput) themeAccentInput.value = theme.accent;
    if (themeAccentHoverInput) themeAccentHoverInput.value = theme.accentHover;
    // Canvas Color Inputs
    themeCanvasBgInput.value = theme.canvasBg;
    themeGridColorInput.value = theme.canvasGrid;
    // Diagram Color Inputs
    themeFlowStartInput.value = theme.flowchart.start;
    themeFlowProcessInput.value = theme.flowchart.process;
    themeFlowDecisionInput.value = theme.flowchart.decision;
    themeFlowEndInput.value = theme.flowchart.end;
    themeMindRootInput.value = theme.mindmap.root;
    themeMindBranchInput.value = theme.mindmap.branch;
    themeMindLeafInput.value = theme.mindmap.leaf;
    
    // Disable inputs if this is a built-in theme
    const isBuiltIn = isBuiltInTheme(theme.id);
    const colorInputs = [
        themeBgInput,
        themeSurfaceInput,
        themeSurfaceHoverInput,
        themeTextInput,
        themeTextMutedInput,
        themeBorderInput,
        themeAccentInput,
        themeAccentHoverInput,
        themeCanvasBgInput,
        themeGridColorInput,
        themeFlowStartInput,
        themeFlowProcessInput,
        themeFlowDecisionInput,
        themeFlowEndInput,
        themeMindRootInput,
        themeMindBranchInput,
        themeMindLeafInput,
        themeNameInput
    ];
    colorInputs.forEach(input => {
        if (input) input.disabled = isBuiltIn;
    });
    
    if (btnSaveTheme) {
        btnSaveTheme.disabled = isBuiltIn;
        btnSaveTheme.style.opacity = isBuiltIn ? '0.5' : '1';
        btnSaveTheme.style.cursor = isBuiltIn ? 'not-allowed' : 'pointer';
    }
}

function applyThemeToPage(theme) {
    currentTheme = cloneTheme(theme);
    // Apply UI Colors
    document.documentElement.style.setProperty("--bg", theme.bg);
    document.documentElement.style.setProperty("--surface", theme.surface);
    document.documentElement.style.setProperty("--surface-hover", theme.surfaceHover);
    document.documentElement.style.setProperty("--border", theme.border);
    document.documentElement.style.setProperty("--text", theme.text);
    document.documentElement.style.setProperty("--text-muted", theme.textMuted);
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.documentElement.style.setProperty("--accent-hover", theme.accentHover);
    // Apply Canvas Colors
    document.documentElement.style.setProperty("--canvas-bg", theme.canvasBg);
    document.documentElement.style.setProperty("--canvas-grid", theme.canvasGrid);
    
    // Update rgba variants dynamically based on theme
    const bgRgb = hexToRgb(theme.bg);
    const accentRgb = hexToRgb(theme.accent);
    document.documentElement.style.setProperty("--bg-rgba-80", `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.8)`);
    document.documentElement.style.setProperty("--bg-rgba-35", `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.35)`);
    document.documentElement.style.setProperty("--accent-rgba-10", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1)`);
    document.documentElement.style.setProperty("--accent-rgba-40", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.4)`);
    document.documentElement.style.setProperty("--accent-rgba-30", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3)`);
    document.documentElement.style.setProperty("--accent-rgba-50", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.5)`);
    document.documentElement.style.setProperty("--accent-rgba-80", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.8)`);
    document.documentElement.style.setProperty("--accent-rgba-30-export", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3)`);
    document.documentElement.style.setProperty("--accent-rgba-15-export", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);
    
    // Update modal backgrounds with theme colors
    const surfaceRgb = hexToRgb(theme.surface);
    document.documentElement.style.setProperty("--modal-backdrop-bg", `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.72)`);
    document.documentElement.style.setProperty("--modal-bg", `linear-gradient(180deg, rgba(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}, 0.98), rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.98))`);
    
    // Update card backgrounds with theme colors
    const cardLight = bgRgb;
    const cardDark = hexToRgb(theme.bg);
    document.documentElement.style.setProperty("--card-bg", `linear-gradient(180deg, rgba(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}, 0.9), rgba(${cardDark.r}, ${cardDark.g}, ${cardDark.b}, 0.9))`);
    
    // Update accent rgba variants for card badges
    document.documentElement.style.setProperty("--accent-rgba-25", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.25)`);
    document.documentElement.style.setProperty("--accent-rgba-35", `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.35)`);

    if (themeSelect) {
        themeSelect.value = theme.id;
    }

    if (themeNameInput) {
        themeNameInput.value = theme.name;
    }

    applyThemeToControls(theme);
    
    // Trigger full page re-render to ensure entire UI updates
    if (diagramData) {
        renderDiagram();
    }
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
            const isBuiltIn = isBuiltInTheme(theme.id);
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
                        ${!isBuiltIn ? `<button class="btn-secondary" data-theme-apply="${theme.id}" type="button">Apply</button>` : ""}
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
    
    // Re-render diagram if one exists to apply new theme colors
    if (diagramData) {
        renderDiagram();
    }
}

function saveCurrentTheme() {
    // Prevent saving if current theme is a built-in theme
    if (isBuiltInTheme(currentTheme.id)) {
        showStatus("error", "Cannot modify built-in themes. Select or create a custom theme to save.");
        setTimeout(hideStatus, 3000);
        return;
    }
    
    const themeName = themeNameInput.value.trim() || "Custom Theme";
    const existingSavedTheme = getSavedThemeById(currentTheme.id);
    const themeId = existingSavedTheme ? currentTheme.id : `custom-${Date.now()}`;
    const theme = {
        id: themeId,
        name: themeName,
        // UI Colors
        bg: themeBgInput.value,
        surface: themeSurfaceInput.value,
        surfaceHover: themeSurfaceHoverInput.value,
        text: themeTextInput.value,
        textMuted: themeTextMutedInput.value,
        border: themeBorderInput.value,
        accent: themeAccentInput.value,
        accentHover: themeAccentHoverInput.value,
        // Canvas Colors
        canvasBg: themeCanvasBgInput.value,
        canvasGrid: themeGridColorInput.value,
        // Diagram Colors
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
    showStatus("success", "Theme saved successfully.");
    setTimeout(hideStatus, 2000);
    
    // Re-render diagram if one exists to apply new theme colors
    if (diagramData) {
        renderDiagram();
    }
}

function createNewTheme() {
    // Create a copy of the current theme with a new ID
    const newTheme = {
        ...cloneTheme(currentTheme),
        id: `custom-${Date.now()}`,
        name: "New Theme",
    };
    
    // If the current theme is built-in, we'll still create a custom copy
    // Otherwise, we might be creating a variant of an existing custom theme
    
    // Add to saved themes
    themeState.savedThemes.push(newTheme);
    themeState.activeThemeId = newTheme.id;
    persistThemes();
    
    // Apply the new theme and update UI
    applyThemeToPage(newTheme);
    renderThemeOptions();
    renderThemeLibrary();
    
    // Show success message
    showStatus("success", "New theme created! Customize and save it.");
    setTimeout(hideStatus, 3000);
    
    // Re-render diagram if one exists to apply new theme colors
    if (diagramData) {
        renderDiagram();
    }
}

function updateThemeFromInputs() {
    currentTheme.name = themeNameInput.value.trim() || currentTheme.name || "Custom Theme";
    // UI Colors
    currentTheme.bg = themeBgInput.value;
    currentTheme.surface = themeSurfaceInput.value;
    currentTheme.surfaceHover = themeSurfaceHoverInput.value;
    currentTheme.text = themeTextInput.value;
    currentTheme.textMuted = themeTextMutedInput.value;
    currentTheme.border = themeBorderInput.value;
    currentTheme.accent = themeAccentInput.value;
    currentTheme.accentHover = themeAccentHoverInput.value;
    // Canvas Colors
    currentTheme.canvasBg = themeCanvasBgInput.value;
    currentTheme.canvasGrid = themeGridColorInput.value;
    // Diagram Colors
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
    // Apply UI Colors
    document.documentElement.style.setProperty("--bg", currentTheme.bg);
    document.documentElement.style.setProperty("--surface", currentTheme.surface);
    document.documentElement.style.setProperty("--surface-hover", currentTheme.surfaceHover);
    document.documentElement.style.setProperty("--text", currentTheme.text);
    document.documentElement.style.setProperty("--text-muted", currentTheme.textMuted);
    document.documentElement.style.setProperty("--border", currentTheme.border);
    document.documentElement.style.setProperty("--accent", currentTheme.accent);
    document.documentElement.style.setProperty("--accent-hover", currentTheme.accentHover);
    // Apply Canvas Colors
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
    const complexity = document.getElementById("complexity").value;
    const temperature = parseFloat(document.getElementById("temperature").value);

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

    // Check if agents are enabled
    const useAgents = typeof hasEnabledAgents !== "undefined" && hasEnabledAgents();

    if (useAgents) {
        showStatus("loading", "Processing through multi-agent pipeline...");
    } else {
        showStatus("loading", "Sending text to LLM for semantic extraction...");
    }

    try {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("diagram_type", type);
        formData.append("api_key", apiKey);
        formData.append("complexity", complexity);
        formData.append("temperature", temperature.toString());

        // Use /generate-with-agents if agents are enabled, otherwise use /generate
        const endpoint = useAgents ? "/generate-with-agents" : "/generate";

        const response = await fetch(endpoint, {
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

        // Store agent outputs if available
        if (result.agent_outputs) {
            window.lastAgentOutputs = result.agent_outputs;
        }

        // Update canvas title
        const titleMap = {
            flowchart: "Flowchart",
            mindmap: "Mind Map",
            er: "ER Diagram",
            venn: "Venn Diagram"
        };
        canvasTitle.textContent = titleMap[type] || "Diagram";

        showStatus("success", "Diagram generated successfully.");
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
    } else if (diagramType === "mindmap") {
        renderMindmap(diagramData);
    } else if (diagramType === "er") {
        renderErDiagram(diagramData);
    } else if (diagramType === "venn") {
        renderVennDiagram(diagramData);
    } else {
        renderFlowchart(diagramData);
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
        // Update text for mindmap nodes
        if (el.text) {
            el.text.setAttribute("x", pos.x);
            el.text.setAttribute("y", pos.y);
        }
    } else if (el.shapeType === "diamond") {
        const hw = el.halfW;
        const hh = el.halfH;
        el.shape.setAttribute(
            "points",
            `${pos.x},${pos.y - hh} ${pos.x + hw},${pos.y} ${pos.x},${pos.y + hh} ${pos.x - hw},${pos.y}`
        );
        // Update text for flowchart decision nodes
        if (el.text) {
            el.text.setAttribute("x", pos.x);
            el.text.setAttribute("y", pos.y);
        }
    } else if (el.shapeType === "rect") {
        const sz = nodeSizesGlobal[id];
        if (sz) {
            el.shape.setAttribute("x", pos.x - sz.w / 2);
            el.shape.setAttribute("y", pos.y - sz.h / 2);
        }
        
        // Check if this is an ER entity (has boxHeight) or flowchart node
        if (el.boxHeight) {
            // ER Entity: text needs offsetting within the box
            if (el.text) {
                el.text.setAttribute("x", pos.x);
                const nameOffsetY = el.boxHeight / 2 - 15;
                el.text.setAttribute("y", pos.y - nameOffsetY);
            }
            
            // Update attribute texts if present
            if (el.attrTexts && Array.isArray(el.attrTexts)) {
                el.attrTexts.forEach((attrText, idx) => {
                    attrText.setAttribute("x", pos.x);
                    attrText.setAttribute("y", pos.y - (el.boxHeight / 2 - 35) + idx * 18);
                });
            }
        } else {
            // Flowchart node: text moves with the node at center
            if (el.text) {
                el.text.setAttribute("x", pos.x);
                el.text.setAttribute("y", pos.y);
            }
        }
    }
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
    const paddingX = 25;
    const minW = 140;
    const nodeH = 60;

    nodes.forEach((n) => {
        const textW = measureText(n.label, 15);
        const w = Math.max(minW, textW + paddingX * 2);
        nodeSizes[n.id] = { w, h: nodeH };
    });

    // Analyze diagram complexity
    const totalConnections = edges.length;
    const connectionDensity = {};
    nodes.forEach((n) => {
        connectionDensity[n.id] = (outgoing[n.id]?.length || 0) + (incoming[n.id]?.length || 0);
    });

    // Adaptive spacing parameters - reduced for tighter, more balanced layout
    let baseGapX = 80;
    let baseGapY = 110;
    let radialSpacing = 1.1;
    
    if (totalConnections > nodes.length * 2.5) {
        baseGapX = 110;
        baseGapY = 130;
        radialSpacing = 1.2;
    } else if (totalConnections > nodes.length * 1.5) {
        baseGapX = 95;
        baseGapY = 120;
        radialSpacing = 1.15;
    }

    // Improved 2D positioning with radial distribution
    const gapX = baseGapX;
    const gapY = baseGapY;
    const positions = {};

    // Center starting point
    let centerY = 0;

    for (let l = 0; l <= maxLayer; l++) {
        const group = layerGroups[l] || [];
        const nodeCount = group.length;
        
        if (nodeCount === 0) continue;

        // Calculate optimal width
        const totalW =
            group.reduce((s, n) => s + nodeSizes[n.id].w, 0) +
            Math.max(0, nodeCount - 1) * gapX;

        // For layers with 1 node, center it
        // For layers with 2+ nodes, distribute across width
        const layerWidth = totalW;
        let startX = -layerWidth / 2;

        // Calculate layer Y position
        const layerY = l * gapY;

        // Add horizontal offset variation for better spacing
        const angleOffsetBase = (Math.PI * 2) / Math.max(1, maxLayer + 1);
        const layerAngleVariation = Math.sin(l * angleOffsetBase) * 40;

        group.forEach((n, idx) => {
            const sz = nodeSizes[n.id];
            
            // Base X position
            let x = startX + sz.w / 2;
            
            // Add radial offset for side positioning
            const normalizedIdx = (idx - (nodeCount - 1) / 2) / Math.max(1, nodeCount);
            const radialOffset = normalizedIdx * Math.min(150, gapX * nodeCount / 2);
            
            // Add sine wave variation for dynamic spacing
            const sineVariation = Math.sin(idx * Math.PI / Math.max(1, nodeCount - 1)) * 30;
            
            // Calculate connection-based offset
            const connections = connectionDensity[n.id];
            const connectionOffset = connections > 2 ? 35 : connections > 1 ? 15 : 0;
            
            positions[n.id] = {
                x: x + radialOffset + sineVariation,
                y: layerY + layerAngleVariation + connectionOffset,
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
            fill: currentTheme.mindmap.root,
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
                stroke: currentTheme.mindmap.branch,
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
                    fill: currentTheme.surface,
                    opacity: "0.9",
                });
                edgesGroup.appendChild(bg);

                const lbl = createSvgElement("text", {
                    x: mx,
                    y: my - 5,
                    fill: currentTheme.text,
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
            "font-size": "16",
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
        const fontSize = 16;
        const textW = measureText(node.label, fontSize);
        const r = Math.max(45, textW / 2 + 15);
        sizes[node.id] = { r, fontSize };
        (node.children || []).forEach((c) => computeSizes(c, depth + 1));
    }

    computeSizes(root, 0);

    // Count total nodes for adaptive spacing
    let totalNodes = 0;
    function countNodes(node) {
        totalNodes++;
        (node.children || []).forEach((c) => countNodes(c));
    }
    countNodes(root);

    function layout(node, x, y, angleStart, angleEnd, depth) {
        node._x = x;
        node._y = y;
        node._depth = depth;
        allNodes.push(node);

        const children = node.children || [];
        if (children.length === 0) return;

        // Adaptive radius based on diagram complexity - reduced for compact, balanced layout
        // More nodes = more spacing
        const baseRadiusAdaptive = 180 + (totalNodes > 20 ? 60 : totalNodes > 10 ? 30 : 0);
        const depthRadiusMultiplier = 75 + (totalNodes > 20 ? 20 : 0);
        
        const baseRadius = baseRadiusAdaptive;
        const radius = baseRadius + depth * depthRadiusMultiplier;
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
                stroke: currentTheme.mindmap.leaf,
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
//  ER DIAGRAM RENDERING
// ═══════════════════════════

function renderErDiagram(data) {
    const entities = data.entities || [];
    const relationships = data.relationships || [];

    // Calculate layout - position entities in a grid
    const entitiesPerRow = Math.ceil(Math.sqrt(entities.length));
    const spacing = 350;
    const startX = -((entitiesPerRow - 1) * spacing) / 2;
    const startY = -150;

    const entityPositions = {};
    entities.forEach((entity, idx) => {
        const row = Math.floor(idx / entitiesPerRow);
        const col = idx % entitiesPerRow;
        entityPositions[entity.id] = {
            x: startX + col * spacing,
            y: startY + row * spacing,
        };
    });

    // Calculate bounds
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    entities.forEach((entity) => {
        const pos = entityPositions[entity.id];
        minX = Math.min(minX, pos.x - 70);
        minY = Math.min(minY, pos.y - 100);
        maxX = Math.max(maxX, pos.x + 70);
        maxY = Math.max(maxY, pos.y + 100);
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

    const relationsGroup = createSvgElement("g");
    relationsGroup.setAttribute("id", "relations");
    svg.appendChild(relationsGroup);

    const entitiesGroup = createSvgElement("g");
    entitiesGroup.setAttribute("id", "entities");
    svg.appendChild(entitiesGroup);

    // Draw relationships function
    function drawRelationships() {
        while (relationsGroup.firstChild) relationsGroup.removeChild(relationsGroup.firstChild);

        relationships.forEach((rel) => {
            const pos1 = nodePositions[rel.entity1];
            const pos2 = nodePositions[rel.entity2];

            if (!pos1 || !pos2) return;

            // Line between entities
            const line = createSvgElement("line", {
                x1: pos1.x,
                y1: pos1.y,
                x2: pos2.x,
                y2: pos2.y,
                stroke: currentTheme.accent || "#f59e0b",
                "stroke-width": "2",
            });
            relationsGroup.appendChild(line);

            // Relationship label
            const midX = (pos1.x + pos2.x) / 2;
            const midY = (pos1.y + pos2.y) / 2;

            const bgRect = createSvgElement("rect", {
                x: midX - 30,
                y: midY - 10,
                width: "60",
                height: "20",
                fill: currentTheme.surface,
                stroke: currentTheme.border,
                "stroke-width": "1",
                rx: "3",
            });
            relationsGroup.appendChild(bgRect);

            const relText = createSvgElement("text", {
                x: midX,
                y: midY + 4,
                "text-anchor": "middle",
                "font-size": "10",
                fill: currentTheme.textMuted,
            });
            relText.textContent = rel.name;
            relationsGroup.appendChild(relText);

            // Cardinality label
            const cardText = createSvgElement("text", {
                x: pos2.x - 20,
                y: pos2.y + 20,
                "font-size": "9",
                fill: currentTheme.accent,
            });
            cardText.textContent = rel.cardinality;
            relationsGroup.appendChild(cardText);
        });
    }

    redrawEdges = drawRelationships;

    // Render entities (rectangles with attributes)
    entities.forEach((entity) => {
        const pos = entityPositions[entity.id];
        const attrs = entity.attributes || [];
        const boxHeight = 50 + attrs.length * 18;

        // Store position globally
        nodePositions[entity.id] = { ...pos };
        nodeSizesGlobal[entity.id] = { w: 140, h: boxHeight };

        // Create group for entity
        const g = createSvgElement("g", {
            class: "er-entity",
            "data-id": entity.id,
            style: "cursor: grab;",
        });

        // Entity box
        const rect = createSvgElement("rect", {
            x: pos.x - 70,
            y: pos.y - boxHeight / 2,
            width: "140",
            height: boxHeight.toString(),
            fill: currentTheme.surface,
            stroke: currentTheme.accent,
            "stroke-width": "2",
            rx: "4",
        });
        g.appendChild(rect);

        // Entity name
        const nameText = createSvgElement("text", {
            x: pos.x,
            y: pos.y - (boxHeight / 2 - 15),
            "text-anchor": "middle",
            "font-weight": "bold",
            "font-size": "14",
            fill: currentTheme.text,
            "pointer-events": "none",
        });
        nameText.textContent = entity.name;
        g.appendChild(nameText);

        // Store attribute text elements for updating during drag
        const attrTexts = [];

        // Attributes (smaller text)
        attrs.forEach((attr, idx) => {
            const attrText = createSvgElement("text", {
                x: pos.x,
                y: pos.y - (boxHeight / 2 - 35) + idx * 18,
                "text-anchor": "middle",
                "font-size": "11",
                fill: currentTheme.textMuted,
                "pointer-events": "none",
            });
            attrText.textContent = attr;
            attrTexts.push(attrText);
            g.appendChild(attrText);
        });

        nodeElements[entity.id] = {
            shape: rect,
            text: nameText,
            attrTexts: attrTexts,
            group: g,
            shapeType: "rect",
            boxHeight: boxHeight,
        };

        makeNodeDraggable(svg, g, entity.id);
        entitiesGroup.appendChild(g);
    });

    drawRelationships();
    attachSvgEvents(svg);
    canvasArea.appendChild(svg);
}

// ═══════════════════════════
//  VENN DIAGRAM RENDERING
// ═══════════════════════════

function renderVennDiagram(data) {
    const sets = data.sets || [];
    const regions = data.regions || [];

    const circleRadius = 120;
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    const circlePositions = {};
    
    // Use theme colors for Venn diagram sets
    const theme = getCurrentTheme();
    const colors = [
        theme.flowchart.start || currentTheme.accent,
        theme.flowchart.process || "#6366f1",
        theme.flowchart.decision || "#f59e0b",
        theme.flowchart.end || "#ef4444",
    ];

    // Position circles
    if (sets.length === 1) {
        circlePositions[sets[0].id] = { x: 0, y: 0 };
    } else if (sets.length === 2) {
        circlePositions[sets[0].id] = { x: -100, y: 0 };
        circlePositions[sets[1].id] = { x: 100, y: 0 };
    } else if (sets.length === 3) {
        const angle = (2 * Math.PI) / 3;
        for (let i = 0; i < 3; i++) {
            circlePositions[sets[i].id] = {
                x: 120 * Math.cos(i * angle - Math.PI / 2),
                y: 120 * Math.sin(i * angle - Math.PI / 2),
            };
        }
    } else if (sets.length >= 4) {
        circlePositions[sets[0].id] = { x: -100, y: -80 };
        circlePositions[sets[1].id] = { x: 100, y: -80 };
        if (sets[2]) circlePositions[sets[2].id] = { x: -100, y: 80 };
        if (sets[3]) circlePositions[sets[3].id] = { x: 100, y: 80 };
    }

    // Calculate bounds
    sets.forEach((set, idx) => {
        const pos = circlePositions[set.id];
        minX = Math.min(minX, pos.x - circleRadius);
        minY = Math.min(minY, pos.y - circleRadius);
        maxX = Math.max(maxX, pos.x + circleRadius);
        maxY = Math.max(maxY, pos.y + circleRadius);
    });

    const pad = 150;  // Increased padding for set labels
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

    const nodesGroup = createSvgElement("g");
    nodesGroup.setAttribute("id", "nodes");

    // Render circles
    sets.forEach((set, idx) => {
        const pos = circlePositions[set.id];
        const circle = createSvgElement("circle", {
            cx: pos.x,
            cy: pos.y,
            r: circleRadius,
            fill: colors[idx % colors.length],
            opacity: "0.2",
            stroke: colors[idx % colors.length],
            "stroke-width": "2",
        });
        nodesGroup.appendChild(circle);

        // Set label - positioned above or to side of circle with adequate spacing
        let labelX, labelY;
        
        if (sets.length === 1) {
            // Single circle: label at top
            labelX = pos.x;
            labelY = pos.y - circleRadius - 40;
        } else if (sets.length === 2) {
            // Two circles: labels above each
            labelX = pos.x;
            labelY = pos.y - circleRadius - 40;
        } else {
            // 3+ circles: use radial positioning at fixed distance
            const angle = Math.atan2(pos.y, pos.x);
            const offsetDistance = circleRadius + 60;
            labelX = pos.x + offsetDistance * Math.cos(angle);
            labelY = pos.y + offsetDistance * Math.sin(angle);
        }
        
        const label = createSvgElement("text", {
            x: labelX,
            y: labelY,
            "font-weight": "bold",
            "font-size": "13",
            fill: currentTheme.text,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
        });
        label.textContent = set.label;
        nodesGroup.appendChild(label);

        nodePositions[set.id] = pos;
    });

    // Render region labels (intersections) - REMOVED per user request
    // Users can visually infer intersections from the diagram itself

    svg.appendChild(nodesGroup);
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
        const scale = 1.5;
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
        const scale = 1.5;
        const width = exported.width * scale;
        const height = exported.height * scale;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = currentTheme.canvasBg;
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        
        // Convert to PNG with reduced quality for smaller file size
        const pngData = canvas.toDataURL("image/png", 0.85);
        
        // Calculate PDF size in millimeters (convert from pixels: 1px ≈ 0.264mm)
        const mmWidth = width * 0.264;
        const mmHeight = height * 0.264;
        
        // Create PDF with calculated dimensions
        const pdf = new jsPDF({ 
            orientation: width >= height ? "landscape" : "portrait", 
            unit: "mm", 
            format: [mmWidth, mmHeight] 
        });
        
        pdf.addImage(pngData, "PNG", 0, 0, mmWidth, mmHeight);
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

// ══════════════════════════════════════
// Initialize API Key and Settings
// ══════════════════════════════════════

// Load API key from localStorage
if (apiKeyInput) {
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    
    // Save API key to localStorage on input
    apiKeyInput.addEventListener("change", () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem(STORAGE_KEYS.apiKey, key);
        } else {
            localStorage.removeItem(STORAGE_KEYS.apiKey);
        }
    });
}

// Update temperature display value
if (temperatureSlider && temperatureValue) {
    temperatureSlider.addEventListener("input", () => {
        temperatureValue.textContent = temperatureSlider.value;
    });
}

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
    // UI Color Inputs
    themeBgInput,
    themeSurfaceInput,
    themeSurfaceHoverInput,
    themeTextInput,
    themeTextMutedInput,
    themeBorderInput,
    themeAccentInput,
    themeAccentHoverInput,
    // Canvas Color Inputs
    themeCanvasBgInput,
    themeGridColorInput,
    // Diagram Color Inputs
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

if (btnCreateTheme) {
    btnCreateTheme.addEventListener("click", createNewTheme);
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
    // Clear diagram data and state
    diagramData = null;
    diagramType = null;
    nodePositions = {};
    nodeElements = {};
    nodeSizesGlobal = {};
    
    // Clear input textarea
    const inputText = document.getElementById("input-text");
    if (inputText) inputText.value = "";
    
    // Clear status bar
    hideStatus();
    
    // Clear canvas - remove SVG and show placeholder
    const svg = document.getElementById("diagram-svg");
    if (svg) svg.remove();
    
    // Show placeholder
    if (placeholder) placeholder.style.display = "flex";
    
    // Reset view
    viewBox = { ...initialViewBox };
});

btnAutoAlign.addEventListener("click", () => {
    if (!diagramData) {
        showStatus("error", "No diagram to align.");
        setTimeout(hideStatus, 2000);
        return;
    }
    
    showStatus("loading", "Auto-aligning diagram...");
    // Force re-render with fresh layout computation
    renderDiagram();
    showStatus("success", "Diagram aligned.");
    setTimeout(hideStatus, 2000);
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