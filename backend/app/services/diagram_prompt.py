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
LAYOUT: strict top-down flowchart.
- start node and end node are required
- decision nodes must have Yes and No outgoing edges
- 7-10 nodes total
""".strip(),
    'mindmap': """
LAYOUT: radial mind map. STRICT RULES — violating these will break rendering:
- Node "1" MUST be the center/root topic.
- The center node connects DIRECTLY to 4-6 primary branch nodes (e.g., "1"->"2", "1"->"3", "1"->"4", "1"->"5").
- Each primary branch can have 1-2 children (e.g., "2"->"7", "2"->"8").
- NO linear chains (do NOT do "1"->"2"->"3"->"4" — the center must fan out, not chain).
- No cycles. No edges pointing back to node "1".
- 9-14 nodes total.
- Example edge structure for 5 primary branches with 1 child each:
  "1"->["2","3","4","5","6"], "2"->"7", "3"->"8", "4"->"9", "5"->"10", "6"->"11"
- Optional per-node styling (hex only): you may add "fill", "stroke", and "textColor" on any node
  to theme branches (e.g. one branch family in blues). Omit unless it improves clarity.
""".strip(),
    'sequence': """
LAYOUT: left-to-right sequence.
- chain A -> B -> C
- optional split that rejoins
- 6-8 nodes total
""".strip(),
    'tree': """
LAYOUT: strict hierarchy top-down.
- one root
- 3 levels
- each node has one parent
- 10-15 nodes total
""".strip(),
    'network': """
LAYOUT: dense concept map.
- no strict root
- each node connects to 2-4 others
- cycles allowed
- 8-12 nodes total
""".strip(),
    'timeline': """
LAYOUT: horizontal timeline chain.
- start and end required
- milestone and regular events
- 6-8 events
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
