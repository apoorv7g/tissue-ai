import json
import httpx

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"


def build_flowchart_prompt(text: str) -> str:
    return f"""You are a semantic analysis engine. Read the following unstructured text and extract a flowchart structure from it.

Rules:
- Identify distinct steps, decisions, or stages described in the text.
- Each node must have a unique "id" (string), a "label" (short description), and a "type" which is one of: "start", "process", "decision", "end".
- Each edge must have a "from" (source node id), "to" (target node id), and an optional "label" for the connection.
- Return ONLY valid JSON. No markdown, no explanation.

Output format:
{{
  "nodes": [
    {{"id": "1", "label": "Start", "type": "start"}},
    {{"id": "2", "label": "Do something", "type": "process"}}
  ],
  "edges": [
    {{"from": "1", "to": "2", "label": ""}}
  ]
}}

Text:
\"\"\"{text}\"\"\"

Return ONLY the JSON object."""


def build_mindmap_prompt(text: str) -> str:
    return f"""You are a semantic analysis engine. Read the following unstructured text and extract a mind map structure from it.

Rules:
- Identify a central topic and branch out into subtopics and details.
- Each node must have a unique "id" (string), a "label" (short text), and a "children" array (which can be empty or contain child node objects).
- The root node represents the central theme.
- Return ONLY valid JSON. No markdown, no explanation.

Output format:
{{
  "root": {{
    "id": "1",
    "label": "Central Topic",
    "children": [
      {{
        "id": "2",
        "label": "Subtopic A",
        "children": []
      }}
    ]
  }}
}}

Text:
\"\"\"{text}\"\"\"

Return ONLY the JSON object."""


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
        "max_tokens": 2048,
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