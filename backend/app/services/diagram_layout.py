from __future__ import annotations

import math
from collections import defaultdict, deque
from typing import Any

ShapeType = str

SHAPE_DEFAULTS: dict[str, dict[str, str]] = {
    'startEnd': {'fill': '#ecfdf5', 'stroke': '#10b981', 'textColor': '#064e3b'},
    'roundedRect': {'fill': '#eef2ff', 'stroke': '#6366f1', 'textColor': '#312e81'},
    'rectangle': {'fill': '#f0f4ff', 'stroke': '#3b82f6', 'textColor': '#1e3a5f'},
    'diamond': {'fill': '#fffbeb', 'stroke': '#f59e0b', 'textColor': '#78350f'},
    'hexagon': {'fill': '#f5f3ff', 'stroke': '#8b5cf6', 'textColor': '#4c1d95'},
    'pentagon': {'fill': '#ecfeff', 'stroke': '#06b6d4', 'textColor': '#164e63'},
    'octagon': {'fill': '#fff1f2', 'stroke': '#f43f5e', 'textColor': '#881337'},
    'parallelogram': {'fill': '#f0fdfa', 'stroke': '#14b8a6', 'textColor': '#134e4a'},
    'trapezoid': {'fill': '#fafaf9', 'stroke': '#a8a29e', 'textColor': '#44403c'},
    'triangle': {'fill': '#fff7ed', 'stroke': '#f97316', 'textColor': '#7c2d12'},
    'star': {'fill': '#fdf2f8', 'stroke': '#ec4899', 'textColor': '#831843'},
    'cylinder': {'fill': '#f8fafc', 'stroke': '#64748b', 'textColor': '#1e293b'},
    'cloud': {'fill': '#f0f9ff', 'stroke': '#0ea5e9', 'textColor': '#0c4a6e'},
    'circle': {'fill': '#fdf4ff', 'stroke': '#d946ef', 'textColor': '#701a75'},
    'ellipse': {'fill': '#fdf4ff', 'stroke': '#d946ef', 'textColor': '#701a75'},
}

TYPE_TO_SHAPE: dict[str, str] = {
    'start': 'startEnd',
    'end': 'startEnd',
    'terminal': 'startEnd',
    'process': 'roundedRect',
    'step': 'roundedRect',
    'action': 'roundedRect',
    'decision': 'diamond',
    'condition': 'diamond',
    'data': 'parallelogram',
    'input': 'parallelogram',
    'output': 'parallelogram',
    'database': 'cylinder',
    'storage': 'cylinder',
    'cloud': 'cloud',
    'api': 'cloud',
    'connector': 'circle',
    'junction': 'circle',
    'prepare': 'hexagon',
    'init': 'hexagon',
    'stop': 'octagon',
    'terminate': 'octagon',
    'document': 'trapezoid',
    'manual': 'trapezoid',
    'milestone': 'pentagon',
}

DEFAULT_W = 210
DEFAULT_H = 72
GAP_X = 130
GAP_Y = 100


def _node_size(shape: ShapeType) -> tuple[int, int]:
    if shape == 'diamond':
        return (220, 110)
    if shape in {'circle', 'ellipse'}:
        return (130, 130)
    if shape == 'star':
        return (150, 150)
    if shape in {'hexagon', 'pentagon', 'octagon'}:
        return (170, 100)
    if shape == 'cylinder':
        return (180, 90)
    if shape == 'startEnd':
        return (180, 62)
    if shape in {'parallelogram', 'trapezoid'}:
        return (210, 68)
    if shape == 'triangle':
        return (160, 100)
    if shape == 'cloud':
        return (200, 110)
    return (DEFAULT_W, DEFAULT_H)


def _shape_for(raw_node: dict[str, Any]) -> str:
    explicit = raw_node.get('shape')
    if isinstance(explicit, str) and explicit in SHAPE_DEFAULTS:
        return explicit

    node_type = str(raw_node.get('type') or '').lower()
    for key, value in TYPE_TO_SHAPE.items():
        if key in node_type:
            return value
    return 'roundedRect'


def _build_node_record(node: dict[str, Any], x: float, y: float) -> dict[str, Any]:
    node_id = str(node.get('id'))
    shape = _shape_for(node)
    colors = SHAPE_DEFAULTS[shape]
    width, height = _node_size(shape)
    return {
        'id': node_id,
        'label': str(node.get('label') or node_id),
        'shape': shape,
        'x': x,
        'y': y,
        'w': width,
        'h': height,
        'fill': colors['fill'],
        'stroke': colors['stroke'],
        'textColor': colors['textColor'],
        'fontSize': 15,
        'fontFamily': 'Inter',
        'icon': node.get('icon'),
        'subtitle': node.get('subtitle'),
    }


def _build_edges(raw_edges: list[dict[str, Any]], node_ids: set[str]) -> list[dict[str, Any]]:
    edges = []
    for idx, edge in enumerate(raw_edges):
        src = str(edge.get('from'))
        dst = str(edge.get('to'))
        if src in node_ids and dst in node_ids:
            edges.append({
                'id': f'e{idx}',
                'from': src,
                'to': dst,
                'label': str(edge.get('label') or ''),
            })
    return edges


def _apply_flowchart_layout(raw_nodes: list[dict], raw_edges: list[dict]) -> dict[str, list[dict[str, Any]]]:
    outgoing: dict[str, list[str]] = defaultdict(list)
    incoming: dict[str, list[str]] = defaultdict(list)

    node_ids: set[str] = set()
    for node in raw_nodes:
        node_id = str(node.get('id'))
        node_ids.add(node_id)
        outgoing[node_id] = []
        incoming[node_id] = []

    for edge in raw_edges:
        src = str(edge.get('from'))
        dst = str(edge.get('to'))
        if src in node_ids and dst in node_ids:
            outgoing[src].append(dst)
            incoming[dst].append(src)

    layers: dict[str, int] = {}
    queue: deque[str] = deque()

    for node_id in node_ids:
        if len(incoming[node_id]) == 0:
            layers[node_id] = 0
            queue.append(node_id)

    if not queue and raw_nodes:
        root = str(raw_nodes[0].get('id'))
        layers[root] = 0
        queue.append(root)

    while queue:
        current = queue.popleft()
        current_layer = layers.get(current, 0)
        for child in outgoing[current]:
            candidate = current_layer + 1
            if child not in layers:
                layers[child] = candidate
                queue.append(child)
            elif layers[child] < candidate:
                layers[child] = candidate

    for node_id in node_ids:
        layers.setdefault(node_id, 0)

    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    max_layer = 0
    for node in raw_nodes:
        node_id = str(node.get('id'))
        layer = layers[node_id]
        grouped[layer].append(node)
        max_layer = max(max_layer, layer)

    layer_tops: dict[int, float] = {}
    y_offset = 0.0
    for layer_no in range(max_layer + 1):
        layer_tops[layer_no] = y_offset
        group = grouped.get(layer_no, [])
        layer_h = DEFAULT_H
        for node in group:
            shape = _shape_for(node)
            layer_h = max(layer_h, _node_size(shape)[1])
        y_offset += layer_h + GAP_Y

    positions: dict[str, tuple[float, float]] = {}

    for layer_no in range(max_layer + 1):
        group = grouped.get(layer_no, [])
        group_sizes = [_node_size(_shape_for(node)) for node in group]
        total_w = sum(sz[0] for sz in group_sizes) + max(0, len(group) - 1) * GAP_X
        start_x = -total_w / 2
        layer_max_h = max((sz[1] for sz in group_sizes), default=DEFAULT_H)
        base_y = layer_tops[layer_no] + layer_max_h / 2

        for idx, node in enumerate(group):
            node_id = str(node.get('id'))
            width = group_sizes[idx][0]
            positions[node_id] = (start_x + width / 2, base_y)
            start_x += width + GAP_X

    nodes = [_build_node_record(node, *positions.get(str(node.get('id')), (0.0, 0.0))) for node in raw_nodes]
    edges = _build_edges(raw_edges, node_ids)
    return {'nodes': nodes, 'edges': edges}


def _is_hex_color(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    s = value.strip()
    if not s.startswith('#'):
        return False
    tail = s[1:]
    if not tail or any(c not in '0123456789abcdefABCDEF' for c in tail):
        return False
    return len(tail) in (3, 4, 6, 8)


def _merge_mindmap_visual(raw: dict[str, Any], base: dict[str, Any]) -> dict[str, Any]:
    """Apply optional LLM/user colors on top of depth-based mindmap defaults."""
    out = dict(base)
    for key in ('fill', 'stroke', 'textColor'):
        val = raw.get(key)
        if _is_hex_color(val):
            out[key] = str(val).strip()
    fs = raw.get('fontSize') or raw.get('mmFontSize')
    if isinstance(fs, (int, float)) and 8 <= int(fs) <= 28:
        out['fontSize'] = int(fs)
    elif isinstance(fs, str) and fs.strip().isdigit():
        v = int(fs.strip())
        if 8 <= v <= 28:
            out['fontSize'] = v
    return out


# Mindmap: depth-based visual style (circle shapes, distinct colors per level)
_MM_DEPTH_STYLES: list[dict[str, Any]] = [
    # depth 0 — center
    {'shape': 'circle', 'w': 160, 'h': 160, 'fill': '#1a1040', 'stroke': '#7c3aed', 'textColor': '#ede9fe', 'fontSize': 15},
    # depth 1 — primary branches
    {'shape': 'circle', 'w': 120, 'h': 120, 'fill': '#1e1b4b', 'stroke': '#6366f1', 'textColor': '#c7d2fe', 'fontSize': 13},
    # depth 2 — secondary branches
    {'shape': 'circle', 'w': 100, 'h': 100, 'fill': '#0d2d3a', 'stroke': '#0891b2', 'textColor': '#bae6fd', 'fontSize': 12},
    # depth 3+ — leaves
    {'shape': 'circle', 'w': 88, 'h': 88, 'fill': '#18181b', 'stroke': '#4f4f5a', 'textColor': '#a1a1aa', 'fontSize': 11},
]


def _apply_mindmap_layout(raw_nodes: list[dict], raw_edges: list[dict]) -> dict[str, list[dict[str, Any]]]:
    node_ids: set[str] = set()
    outgoing: dict[str, list[str]] = defaultdict(list)
    incoming: dict[str, list[str]] = defaultdict(list)

    for node in raw_nodes:
        node_id = str(node.get('id'))
        node_ids.add(node_id)
        outgoing[node_id] = []
        incoming[node_id] = []

    for edge in raw_edges:
        src = str(edge.get('from'))
        dst = str(edge.get('to'))
        if src in node_ids and dst in node_ids:
            outgoing[src].append(dst)
            incoming[dst].append(src)

    if not raw_nodes:
        return {'nodes': [], 'edges': []}

    # Find center: strongly prefer node "1" (per our prompt contract),
    # then fall back to highest (outgoing - incoming) score
    all_ids = [str(n.get('id')) for n in raw_nodes]
    if '1' in node_ids:
        center_id = '1'
    else:
        center_id = str(raw_nodes[0].get('id'))
        best_score = -999
        for nid in all_ids:
            # Nodes with no incoming are root candidates; heavy weight on outgoing count
            score = len(outgoing[nid]) * 5 - len(incoming[nid]) * 3
            if score > best_score:
                best_score = score
                center_id = nid

    # BFS from center over undirected adjacency to get depth + parent
    adj: dict[str, list[str]] = defaultdict(list)
    for edge in raw_edges:
        src = str(edge.get('from'))
        dst = str(edge.get('to'))
        if src in node_ids and dst in node_ids:
            adj[src].append(dst)
            adj[dst].append(src)

    depth: dict[str, int] = {center_id: 0}
    parent: dict[str, str | None] = {center_id: None}
    bfs_queue: deque[str] = deque([center_id])
    while bfs_queue:
        current = bfs_queue.popleft()
        for neighbor in adj[current]:
            if neighbor not in depth:
                depth[neighbor] = depth[current] + 1
                parent[neighbor] = current
                bfs_queue.append(neighbor)
    for nid in node_ids:
        depth.setdefault(nid, 1)

    level1 = [n for n in node_ids if depth[n] == 1]
    level2 = [n for n in node_ids if depth[n] == 2]
    level_rest = [n for n in node_ids if depth[n] >= 3]

    R1 = 380  # center → primary branch radius
    R2 = 240  # primary → secondary radius

    positions: dict[str, tuple[float, float]] = {center_id: (0.0, 0.0)}

    # Level 1: evenly spaced around center
    if level1:
        angle_step = 2 * math.pi / len(level1)
        for i, nid in enumerate(level1):
            angle = -math.pi / 2 + i * angle_step
            positions[nid] = (R1 * math.cos(angle), R1 * math.sin(angle))

    # Level 2: fan out from each primary branch
    parent_children: dict[str, list[str]] = defaultdict(list)
    for nid in level2:
        p = parent.get(nid)
        if p:
            parent_children[p].append(nid)

    for p_id, children in parent_children.items():
        if p_id not in positions:
            continue
        px, py = positions[p_id]
        base_angle = math.atan2(py, px)
        spread = math.radians(45)
        n = len(children)
        for i, child_id in enumerate(children):
            offset = 0.0 if n == 1 else -spread + (2 * spread / (n - 1)) * i
            angle = base_angle + offset
            positions[child_id] = (px + R2 * math.cos(angle), py + R2 * math.sin(angle))

    # Deeper nodes: extend from parent
    for nid in level_rest:
        p = parent.get(nid)
        if p and p in positions:
            ppx, ppy = positions[p]
            a = math.atan2(ppy, ppx)
            positions[nid] = (ppx + 180 * math.cos(a), ppy + 180 * math.sin(a))
        else:
            positions[nid] = (0.0, 0.0)

    # Build nodes with depth-based style; merge optional colors from raw JSON
    nodes: list[dict[str, Any]] = []
    for node in raw_nodes:
        nid = str(node.get('id'))
        d = depth.get(nid, 3)
        style = _MM_DEPTH_STYLES[min(d, len(_MM_DEPTH_STYLES) - 1)]
        merged = _merge_mindmap_visual(node, style)
        x, y = positions.get(nid, (0.0, 0.0))
        nodes.append({
            'id': nid,
            'label': str(node.get('label') or nid),
            'shape': merged['shape'],
            'x': x,
            'y': y,
            'w': merged['w'],
            'h': merged['h'],
            'fill': merged['fill'],
            'stroke': merged['stroke'],
            'textColor': merged['textColor'],
            'fontSize': merged['fontSize'],
            'fontFamily': 'Inter',
            'icon': None,
            'subtitle': None,
        })

    edges = _build_edges(raw_edges, node_ids)
    return {'nodes': nodes, 'edges': edges}


def apply_layout(raw: dict[str, Any], diagram_type: str = 'flowchart') -> dict[str, list[dict[str, Any]]]:
    raw_nodes = raw.get('nodes') or []
    raw_edges = raw.get('edges') or []

    if diagram_type == 'mindmap':
        return _apply_mindmap_layout(raw_nodes, raw_edges)
    return _apply_flowchart_layout(raw_nodes, raw_edges)
