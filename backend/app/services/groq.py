from __future__ import annotations

import json
import time
from typing import Any

import httpx

from ..config import get_settings
from .diagram_prompt import SYSTEM_PROMPT, DiagramType, build_prompt

settings = get_settings()


class DiagramGenerationError(Exception):
    pass


def _strip_fences(text: str) -> str:
    clean = text.strip()
    if clean.startswith('```'):
        nl = clean.find('\n')
        clean = clean[nl + 1 :] if nl != -1 else clean[3:]
    if clean.endswith('```'):
        clean = clean[:-3]
    return clean.strip()


def generate_raw_diagram(text: str, diagram_type: DiagramType, api_key: str) -> tuple[dict[str, Any], int]:
    start = time.perf_counter()

    payload = {
        'model': settings.groq_model,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': build_prompt(text, diagram_type)},
        ],
        'temperature': 0.5,
        'max_tokens': 4000,
    }

    try:
        with httpx.Client(timeout=httpx.Timeout(25.0, read=45.0)) as client:
            response = client.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise DiagramGenerationError(f'Groq request failed: {exc}') from exc

    if response.status_code >= 400:
        detail = response.text[:250]
        raise DiagramGenerationError(f'Groq returned {response.status_code}: {detail}')

    body = response.json()
    content = body.get('choices', [{}])[0].get('message', {}).get('content', '')

    try:
        parsed = json.loads(_strip_fences(content))
    except json.JSONDecodeError as exc:
        raise DiagramGenerationError('Model did not return valid JSON.') from exc

    if not isinstance(parsed, dict) or not isinstance(parsed.get('nodes'), list) or not isinstance(parsed.get('edges'), list):
        raise DiagramGenerationError('Model output missing nodes/edges arrays.')

    latency_ms = int((time.perf_counter() - start) * 1000)
    return parsed, latency_ms
