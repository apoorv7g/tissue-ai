from __future__ import annotations

from typing import Literal

DiagramType = Literal['flowchart', 'mindmap', 'sequence', 'tree', 'network', 'timeline']
VALID_DIAGRAM_TYPES: tuple[DiagramType, ...] = ('flowchart', 'mindmap', 'sequence', 'tree', 'network', 'timeline')

VISUAL_GUIDE = """
SHAPE + SEMANTIC ROLE (pick strictly based on meaning):
  "startEnd"      -> START or END only.
  "roundedRect"   -> Process step, action, task.
  "diamond"       -> Decision or branch.
  "hexagon"       -> Preparation or setup.
  "parallelogram" -> Data input/output.
  "cylinder"      -> Database, data store, cache.
  "cloud"         -> External service or API.
  "circle"        -> Connector or junction.
  "pentagon"      -> Sub-process or milestone.
  "octagon"       -> Stop or error terminate.
  "trapezoid"     -> Manual operation or human input.
  "star"          -> Critical highlight.
  "triangle"      -> Split or fan-out.
  "rectangle"     -> Category header (rare).

LABEL RULES:
  - Max 4 words per label.
  - Use title case.
  - No punctuation-heavy text.

ICON RULES:
  - Every node must include an icon keyword.
  - Prefer semantically relevant icon keywords.

SUBTITLE RULES:
  - Optional 3-8 words when helpful.
""".strip()

STYLE_GUIDES: dict[DiagramType, str] = {
    'flowchart': """
LAYOUT: vertical flowchart (process flow).
- Start node at TOP, End at BOTTOM
- Connected vertical chain: top → bottom
- Decision diamonds with Yes/No branches
- Use arrows showing direction of flow
- 7-12 nodes total
- Classic top-to-bottom progression
""".strip(),
    'mindmap': """
LAYOUT: radial/central mind map — center radiates outward.
- Node "1" is CENTER, all branches fan OUT from center
- Primary branches radiate from center like spokes of a wheel
- 4-8 primary branches max, each can have 1-2 sub-branches
- NO vertical chains, NO horizontal steps
- 10-15 nodes total
- Visual: center node with rays outward
""".strip(),
    'sequence': """
LAYOUT: horizontal sequence/timeline — left-to-right steps.
- Time flows LEFT to RIGHT
- Each step is a box in a horizontal chain
- A → B → C → D → E (straight chain)
- No branching, no children, linear progression
- Use arrows: "executes", "completes", "then", "produces"
- 5-8 sequential steps
- Like a horizontal pipeline or to-do list
""".strip(),
    'tree': """
LAYOUT: hierarchical tree — parent sits above children.
- ROOT at TOP
- Children arranged BELOW parent at same horizontal level
- Parent connects to ALL its children with vertical lines
- Each level is a horizontal tier
- Pure hierarchy: one parent → multiple children at same level
- 8-15 nodes, 3-4 levels deep
- Visual: org chart style, like a family tree
""".strip(),
    'network': """
LAYOUT: free-form network/graph — nodes scattered, interconnected.
- NO center, NO root, NO hierarchy
- Nodes scattered with lines to multiple neighbors
- Any node can connect to ANY other nodes
- Cycles and cross-connections WELCOME
- Mesh of interconnected ideas
- 8-14 nodes total
- Visual: spider web or constellation pattern
- Edge labels: "links to", "related to", "works with"
""".strip(),
    'timeline': """
LAYOUT: chronological horizontal timeline — events on a line.
- START on far LEFT, END on far RIGHT
- Events dotted along a horizontal time axis
- Milestones marked with diamond
- Years/dates as labels
- 5-8 events in order
- Single horizontal line, events branch off/up/down slightly
- Like a project's history or roadmap
""".strip(),
}


SYSTEM_PROMPT = (
    'You are an expert infographic designer. Return valid JSON only. '
    'No markdown, no explanations, no code fences.'
)


JSON_CONTRACT = """
Return exactly this JSON shape:
{
  "nodes": [
    { "id": "1", "label": "Start", "shape": "startEnd", "type": "start", "icon": "start" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "" }
  ]
}
""".strip()


def build_prompt(text: str, diagram_type: DiagramType) -> str:
    guide = STYLE_GUIDES[diagram_type]
    return (
        f"""
You are designing a high-clarity diagram from user text.

{VISUAL_GUIDE}

STYLE: {diagram_type.upper()}
{guide}

QUALITY:
- semantically accurate shapes
- concise labels
- readable structure
- strong narrative edge labels

{JSON_CONTRACT}

TEXT:
\"\"\"
{text.strip()}
\"\"\"

Return only JSON.
""".strip()
    )
