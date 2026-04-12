from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from ..deps import CurrentUser, require_user
from ..repositories.repository import repository
from ..services.diagram_layout import apply_layout
from ..services.diagram_prompt import VALID_DIAGRAM_TYPES, DiagramType
from ..services.fonts import search_fonts
from ..services.groq import DiagramGenerationError, generate_raw_diagram

router = APIRouter(prefix='/api', tags=['api'])


class CreateChatPayload(BaseModel):
    title: str = 'New Chat'


class UpdateChatPayload(BaseModel):
    title: str | None = None
    theme_mode: str | None = None
    font_family: str | None = None
    font_css_url: str | None = None
    text_scale: float | None = None
    accent_color: str | None = None


class LabelOverridePayload(BaseModel):
    # Values are legacy plain-string labels or objects { "label"?, "fill"?, "stroke"?, "textColor"? }
    overrides: dict[str, Any]


async def _read_payload(request: Request) -> dict[str, Any]:
    content_type = request.headers.get('content-type', '')
    if content_type.startswith('application/json'):
        data = await request.json()
        return data if isinstance(data, dict) else {}
    form = await request.form()
    return dict(form)


@router.get('/chats')
async def list_chats(user: CurrentUser = Depends(require_user)):
    chats = await run_in_threadpool(repository.list_chats, user.id)
    return {'items': chats}


@router.post('/chats')
async def create_chat(request: Request, user: CurrentUser = Depends(require_user)):
    payload = await _read_payload(request)
    title = str(payload.get('title') or 'New Chat').strip() or 'New Chat'
    chat = await run_in_threadpool(repository.create_chat, user.id, title)
    return {'chat': chat}


@router.patch('/chats/{chat_id}')
async def update_chat(chat_id: str, request: Request, user: CurrentUser = Depends(require_user)):
    payload = await _read_payload(request)

    title = payload.get('title')
    if isinstance(title, str) and title.strip():
        await run_in_threadpool(repository.rename_chat, user.id, chat_id, title.strip())

    style_patch: dict[str, Any] = {}
    for key in ('theme_mode', 'font_family', 'font_css_url', 'text_scale', 'accent_color'):
        if key in payload and payload[key] not in (None, ''):
            style_patch[key] = payload[key]

    if 'text_scale' in style_patch:
        style_patch['text_scale'] = float(style_patch['text_scale'])

    chat = await run_in_threadpool(repository.update_chat_style, user.id, chat_id, style_patch)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

    return {'chat': chat}


@router.delete('/chats/{chat_id}')
async def delete_chat(chat_id: str, user: CurrentUser = Depends(require_user)):
    deleted = await run_in_threadpool(repository.delete_chat, user.id, chat_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

    chats = await run_in_threadpool(repository.list_chats, user.id)
    next_chat = chats[0] if chats else None
    return {'ok': True, 'next_chat_id': next_chat['id'] if next_chat else None}


@router.get('/chats/{chat_id}/messages')
async def get_messages(chat_id: str, user: CurrentUser = Depends(require_user)):
    messages = await run_in_threadpool(repository.list_messages, chat_id, user.id)
    return {'items': messages}


@router.post('/chats/{chat_id}/messages')
async def post_message(chat_id: str, request: Request, user: CurrentUser = Depends(require_user)):
    payload = await _read_payload(request)
    content = str(payload.get('content') or '').strip()
    diagram_type_raw = str(payload.get('diagram_type') or 'flowchart').strip().lower()
    api_key = str(payload.get('api_key') or '').strip()

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='content is required')
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='api_key is required')
    if diagram_type_raw not in VALID_DIAGRAM_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='invalid diagram_type')

    diagram_type: DiagramType = diagram_type_raw  # type: ignore[assignment]

    user_message = await run_in_threadpool(repository.create_message, chat_id, user.id, 'user', content)
    if not user_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

    try:
        raw_json, latency_ms = await run_in_threadpool(generate_raw_diagram, content, diagram_type, api_key)
        layout_json = await run_in_threadpool(apply_layout, raw_json, diagram_type)

        assistant_message = await run_in_threadpool(
            repository.create_message, chat_id, user.id, 'assistant',
            f'Generated {diagram_type} diagram.',
        )
        if not assistant_message:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

        await run_in_threadpool(
            repository.create_diagram,
            chat_id, user_message['id'], assistant_message['id'],
            diagram_type, 'groq', raw_json, layout_json, latency_ms,
        )

    except DiagramGenerationError as exc:
        await run_in_threadpool(
            repository.create_message, chat_id, user.id, 'assistant',
            f'Generation failed: {exc}',
        )

    messages = await run_in_threadpool(repository.list_messages, chat_id, user.id)
    return {'items': messages}


@router.post('/diagrams/{diagram_id}/regenerate')
async def regenerate(diagram_id: str, request: Request, user: CurrentUser = Depends(require_user)):
    payload = await _read_payload(request)
    api_key = str(payload.get('api_key') or '').strip()
    
    context = await run_in_threadpool(repository.get_diagram_generation_context, user.id, diagram_id)
    if not context:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Diagram not found')
    
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='api_key is required')

    diagram_type = str(context['diagram_type']).lower()
    if diagram_type not in VALID_DIAGRAM_TYPES:
        diagram_type = 'flowchart'

    raw_json, latency_ms = await run_in_threadpool(generate_raw_diagram, context['source_content'], diagram_type, api_key)
    layout_json = await run_in_threadpool(apply_layout, raw_json, diagram_type)

    updated = await run_in_threadpool(
        repository.regenerate_diagram, user.id, diagram_id,
        'groq', diagram_type, raw_json, layout_json, latency_ms,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Diagram not found')

    return {'diagram': updated}


@router.patch('/diagram-versions/{version_id}/labels')
async def patch_labels(version_id: str, payload: LabelOverridePayload, user: CurrentUser = Depends(require_user)):
    updated = await run_in_threadpool(repository.update_label_overrides, user.id, version_id, payload.overrides)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Version not found')
    return {'item': updated}


@router.get('/fonts')
async def get_fonts(query: str = '', user: CurrentUser = Depends(require_user)):
    items = await run_in_threadpool(search_fonts, query)
    return {'items': items}
