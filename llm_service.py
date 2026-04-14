import json
import httpx

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"


def build_flowchart_prompt(text: str) -> str:
    return f"""You are a professional flowchart design assistant. Analyze the given text and extract a clear, logical flowchart structure.

Rules for Professional Flowcharts:
- Start with a single "start" node (represents entry point)
- End with a single "end" node (represents completion)
- Use "process" nodes for actions, tasks, or operations
- Use "decision" nodes only for true yes/no choices (2 outgoing edges: yes/no)
- Ensure a logical flow from top to bottom with no circular dependencies
- Keep node labels concise (3-6 words max)
- Every node must have at least one outgoing edge (except end nodes)
- Decision nodes must have exactly 2 outgoing edges
- Use edge labels only for conditional branches (e.g., "Yes", "No")
- Avoid redundant or self-referencing nodes

Output format (VALID JSON ONLY):
{{
  "nodes": [
    {{"id": "1", "label": "Start Process", "type": "start"}},
    {{"id": "2", "label": "Analyze Requirements", "type": "process"}},
    {{"id": "3", "label": "Requirements Clear?", "type": "decision"}},
    {{"id": "4", "label": "Execute Action", "type": "process"}},
    {{"id": "5", "label": "End", "type": "end"}}
  ],
  "edges": [
    {{"from": "1", "to": "2", "label": ""}},
    {{"from": "2", "to": "3", "label": ""}},
    {{"from": "3", "to": "4", "label": "Yes"}},
    {{"from": "3", "to": "5", "label": "No"}},
    {{"from": "4", "to": "5", "label": ""}}
  ]
}}

Text to analyze:
\"\"\"{text}\"\"\"

Return ONLY valid JSON. No markdown, explanations, or code fences."""


def build_mindmap_prompt(text: str) -> str:
    return f"""You are a professional mind map designer. Extract a hierarchical mind map structure from the given text.

Rules for Professional Mind Maps:
- Create a central root node representing the main topic (brief, 2-4 words)
- Branch into 3-6 main categories or themes
- Each main branch can have 2-4 sub-branches
- Keep labels concise and descriptive (2-5 words)
- Maximum depth: 3 levels (root → branch → leaf)
- No duplicate concepts across branches
- Ensure logical grouping and hierarchy
- Avoid circular relationships
- Total nodes should be between 8 and 25

Output format (VALID JSON ONLY):
{{
  "root": {{
    "id": "1",
    "label": "Project Management",
    "children": [
      {{
        "id": "2",
        "label": "Planning",
        "children": [
          {{"id": "3", "label": "Define Scope", "children": []}},
          {{"id": "4", "label": "Risk Assessment", "children": []}}
        ]
      }},
      {{
        "id": "5",
        "label": "Execution",
        "children": [
          {{"id": "6", "label": "Resource Allocation", "children": []}},
          {{"id": "7", "label": "Timeline Management", "children": []}}
        ]
      }},
      {{
        "id": "8",
        "label": "Monitoring",
        "children": [
          {{"id": "9", "label": "Track Progress", "children": []}},
          {{"id": "10", "label": "Quality Check", "children": []}}
        ]
      }}
    ]
  }}
}}

Text to analyze:
\"\"\"{text}\"\"\"

Return ONLY valid JSON. No markdown, explanations, or code fences."""


async def generate_diagram_json(
    text: str, diagram_type: str, api_key: str
) -> dict:
    if diagram_type == "flowchart":
        prompt = build_flowchart_prompt(text)
    else:
        prompt = build_mindmap_prompt(text)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a structured data extraction assistant. You always respond with valid JSON only. Never include markdown formatting, code fences, or explanations.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload)

        if response.status_code == 401:
            return {"error": "Invalid Groq API key. Please check and try again.", "data": None}

        if response.status_code != 200:
            return {
                "error": f"Groq API returned status {response.status_code}: {response.text}",
                "data": None,
            }

        body = response.json()
        content = body["choices"][0]["message"]["content"]

        # Strip markdown fences if LLM wraps them anyway
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        data = json.loads(content)
        return {"error": None, "data": data}

    except json.JSONDecodeError:
        return {"error": "LLM returned invalid JSON. Please try again.", "data": None}
    except httpx.TimeoutException:
        return {"error": "Request to Groq API timed out.", "data": None}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}", "data": None}