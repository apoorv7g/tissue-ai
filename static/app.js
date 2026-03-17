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

// ── DOM ──
const btnGenerate = document.getElementById("btn-generate");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnReset = document.getElementById("btn-reset");
const btnExport = document.getElementById("btn-export");
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

    // Node colors
    const typeColors = {
        start: { fill: "#052e16", stroke: "#22c55e", text: "#86efac" },
        end: { fill: "#450a0a", stroke: "#ef4444", text: "#fca5a5" },
        process: { fill: "#1e1b4b", stroke: "#6366f1", text: "#c7d2fe" },
        decision: { fill: "#422006", stroke: "#f59e0b", text: "#fde68a" },
        default: { fill: "#18181b", stroke: "#6366f1", text: "#e4e4e7" },
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

    // Node colors by depth
    const depthColors = [
        { fill: "#4f46e5", stroke: "#818cf8", text: "#ffffff" },
        { fill: "#1e1b4b", stroke: "#6366f1", text: "#c7d2fe" },
        { fill: "#18181b", stroke: "#3f3f5a", text: "#a1a1aa" },
        { fill: "#18181b", stroke: "#2a2a3a", text: "#71717a" },
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
        nodesGroup.appendChild(g);
    });

    attachSvgEvents(svg);
    canvasArea.appendChild(svg);
}

// ═══════════════════════════
//  TOOLBAR CONTROLS
// ═══════════════════════════

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

btnExport.addEventListener("click", () => {
    const svg = document.getElementById("diagram-svg");
    if (!svg) {
        showStatus("error", "No diagram to export.");
        setTimeout(hideStatus, 2000);
        return;
    }

    const clone = svg.cloneNode(true);
    clone.removeAttribute("style");

    // Inline key styles for export
    const styleEl = document.createElementNS(SVG_NS, "style");
    styleEl.textContent = `
        text { font-family: Inter, -apple-system, sans-serif; }
    `;
    clone.insertBefore(styleEl, clone.firstChild);

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);
    source =
        '<?xml version="1.0" standalone="no"?>\r\n' + source;

    const blob = new Blob([source], {
        type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `tissue-ai-${diagramType || "diagram"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});