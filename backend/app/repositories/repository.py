from __future__ import annotations

import json
from typing import Any

from ..db import execute, execute_returning, fetch_all, fetch_one


DEFAULT_STYLE = {
    'theme_mode': 'light',
    'font_family': 'Inter',
    'font_css_url': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'text_scale': 1.0,
    'accent_color': '#2563eb',
}


class Repository:
    @staticmethod
    def ensure_profile(user_id: str) -> None:
        execute(
            """
            insert into profiles (id)
            values (%s)
            on conflict (id) do nothing
            """,
            (user_id,),
        )

    @staticmethod
    def list_chats(user_id: str) -> list[dict[str, Any]]:
        return fetch_all(
            """
            select c.id, c.user_id, c.title, c.created_at, c.updated_at,
                   cs.theme_mode, cs.font_family, cs.font_css_url, cs.text_scale, cs.accent_color
            from chats c
            left join chat_styles cs on cs.chat_id = c.id
            where c.user_id = %s and c.deleted_at is null
            order by c.updated_at desc
            """,
            (user_id,),
        )

    @staticmethod
    def get_chat(user_id: str, chat_id: str) -> dict[str, Any] | None:
        return fetch_one(
            """
            select c.id, c.user_id, c.title, c.created_at, c.updated_at,
                   cs.theme_mode, cs.font_family, cs.font_css_url, cs.text_scale, cs.accent_color
            from chats c
            left join chat_styles cs on cs.chat_id = c.id
            where c.id = %s and c.user_id = %s and c.deleted_at is null
            """,
            (chat_id, user_id),
        )

    @staticmethod
    def create_chat(user_id: str, title: str = 'New Chat') -> dict[str, Any]:
        chat = execute_returning(
            """
            insert into chats (user_id, title)
            values (%s, %s)
            returning id, user_id, title, created_at, updated_at
            """,
            (user_id, title),
        )
        if not chat:
            raise RuntimeError('Failed to create chat')

        execute(
            """
            insert into chat_styles (chat_id, theme_mode, font_family, font_css_url, text_scale, accent_color)
            values (%s, %s, %s, %s, %s, %s)
            on conflict (chat_id) do nothing
            """,
            (
                chat['id'],
                DEFAULT_STYLE['theme_mode'],
                DEFAULT_STYLE['font_family'],
                DEFAULT_STYLE['font_css_url'],
                DEFAULT_STYLE['text_scale'],
                DEFAULT_STYLE['accent_color'],
            ),
        )

        return Repository.get_chat(user_id=user_id, chat_id=chat['id']) or chat

    @staticmethod
    def rename_chat(user_id: str, chat_id: str, title: str) -> dict[str, Any] | None:
        updated = execute_returning(
            """
            update chats
            set title = %s,
                updated_at = now()
            where id = %s and user_id = %s and deleted_at is null
            returning id
            """,
            (title, chat_id, user_id),
        )
        if not updated:
            return None
        return Repository.get_chat(user_id, chat_id)

    @staticmethod
    def update_chat_style(user_id: str, chat_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        chat = Repository.get_chat(user_id, chat_id)
        if not chat:
            return None

        allowed = {'theme_mode', 'font_family', 'font_css_url', 'text_scale', 'accent_color'}
        keys = [key for key in patch.keys() if key in allowed]
        if not keys:
            return chat

        assignments = ', '.join(f'{key} = %s' for key in keys)
        values = [patch[key] for key in keys]

        execute(
            f"""
            insert into chat_styles (chat_id, theme_mode, font_family, font_css_url, text_scale, accent_color)
            values (%s, %s, %s, %s, %s, %s)
            on conflict (chat_id) do nothing
            """,
            (
                chat_id,
                DEFAULT_STYLE['theme_mode'],
                DEFAULT_STYLE['font_family'],
                DEFAULT_STYLE['font_css_url'],
                DEFAULT_STYLE['text_scale'],
                DEFAULT_STYLE['accent_color'],
            ),
        )

        execute(
            f"""
            update chat_styles
            set {assignments},
                updated_at = now()
            where chat_id = %s
            """,
            tuple(values + [chat_id]),
        )

        execute(
            """
            update chats
            set updated_at = now()
            where id = %s and user_id = %s and deleted_at is null
            """,
            (chat_id, user_id),
        )

        return Repository.get_chat(user_id, chat_id)

    @staticmethod
    def delete_chat(user_id: str, chat_id: str) -> bool:
        deleted = execute_returning(
            """
            update chats
            set deleted_at = now(), updated_at = now()
            where id = %s and user_id = %s and deleted_at is null
            returning id
            """,
            (chat_id, user_id),
        )
        return bool(deleted)

    @staticmethod
    def list_messages(chat_id: str, user_id: str) -> list[dict[str, Any]]:
        owns_chat = fetch_one(
            """
            select id
            from chats
            where id = %s and user_id = %s and deleted_at is null
            """,
            (chat_id, user_id),
        )
        if not owns_chat:
            return []

        messages = fetch_all(
            """
            select id, chat_id, role, content, created_at
            from messages
            where chat_id = %s
            order by created_at asc
            """,
            (chat_id,),
        )

        diagrams = fetch_all(
            """
            select d.id as diagram_id,
                   d.assistant_message_id,
                   d.source_message_id,
                   d.active_version_no,
                   dv.id as version_id,
                   dv.version_no,
                   dv.diagram_type,
                   dv.model,
                   dv.layout_json,
                   dv.raw_json,
                   coalesce(dlo.overrides, '{}'::jsonb) as overrides
            from diagrams d
            join diagram_versions dv
              on dv.diagram_id = d.id and dv.version_no = d.active_version_no
            left join diagram_label_overrides dlo
              on dlo.diagram_version_id = dv.id
            where d.chat_id = %s
            """,
            (chat_id,),
        )

        diagram_by_assistant_message = {row['assistant_message_id']: row for row in diagrams}
        for message in messages:
            message['diagram'] = diagram_by_assistant_message.get(message['id'])

        return messages

    @staticmethod
    def create_message(chat_id: str, user_id: str, role: str, content: str) -> dict[str, Any] | None:
        owns_chat = fetch_one(
            """
            select id
            from chats
            where id = %s and user_id = %s and deleted_at is null
            """,
            (chat_id, user_id),
        )
        if not owns_chat:
            return None

        message = execute_returning(
            """
            insert into messages (chat_id, role, content)
            values (%s, %s, %s)
            returning id, chat_id, role, content, created_at
            """,
            (chat_id, role, content),
        )

        execute(
            """
            update chats
            set updated_at = now()
            where id = %s
            """,
            (chat_id,),
        )

        return message

    @staticmethod
    def create_diagram(
        chat_id: str,
        source_message_id: str,
        assistant_message_id: str,
        diagram_type: str,
        model: str,
        raw_json: dict[str, Any],
        layout_json: dict[str, Any],
        latency_ms: int,
    ) -> dict[str, Any]:
        diagram = execute_returning(
            """
            insert into diagrams (chat_id, source_message_id, assistant_message_id, active_version_no)
            values (%s, %s, %s, 1)
            returning id, chat_id, source_message_id, assistant_message_id, active_version_no, created_at, updated_at
            """,
            (chat_id, source_message_id, assistant_message_id),
        )
        if not diagram:
            raise RuntimeError('Failed to create diagram')

        version = execute_returning(
            """
            insert into diagram_versions (diagram_id, version_no, diagram_type, model, raw_json, layout_json, latency_ms)
            values (%s, 1, %s, %s, %s::jsonb, %s::jsonb, %s)
            returning id, diagram_id, version_no, diagram_type, model, raw_json, layout_json, latency_ms, created_at
            """,
            (diagram['id'], diagram_type, model, json.dumps(raw_json), json.dumps(layout_json), latency_ms),
        )
        if not version:
            raise RuntimeError('Failed to create diagram version')

        return {
            'diagram_id': diagram['id'],
            'version_id': version['id'],
            'version_no': 1,
            'diagram_type': version['diagram_type'],
            'layout_json': version['layout_json'],
            'raw_json': version['raw_json'],
            'overrides': {},
        }

    @staticmethod
    def get_diagram_generation_context(user_id: str, diagram_id: str) -> dict[str, Any] | None:
        return fetch_one(
            """
            select d.id as diagram_id,
                   d.chat_id,
                   d.source_message_id,
                   d.assistant_message_id,
                   m.content as source_content,
                   dv.diagram_type,
                   dv.version_no
            from diagrams d
            join chats c on c.id = d.chat_id
            join messages m on m.id = d.source_message_id
            join diagram_versions dv on dv.diagram_id = d.id and dv.version_no = d.active_version_no
            where d.id = %s and c.user_id = %s and c.deleted_at is null
            """,
            (diagram_id, user_id),
        )

    @staticmethod
    def regenerate_diagram(
        user_id: str,
        diagram_id: str,
        model: str,
        diagram_type: str,
        raw_json: dict[str, Any],
        layout_json: dict[str, Any],
        latency_ms: int,
    ) -> dict[str, Any] | None:
        context = Repository.get_diagram_generation_context(user_id=user_id, diagram_id=diagram_id)
        if not context:
            return None

        next_version = fetch_one(
            """
            select coalesce(max(version_no), 0) + 1 as next_version
            from diagram_versions
            where diagram_id = %s
            """,
            (diagram_id,),
        )
        version_no = int(next_version['next_version'])

        version = execute_returning(
            """
            insert into diagram_versions (diagram_id, version_no, diagram_type, model, raw_json, layout_json, latency_ms)
            values (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
            returning id, diagram_id, version_no, diagram_type, model, raw_json, layout_json, latency_ms, created_at
            """,
            (diagram_id, version_no, diagram_type, model, json.dumps(raw_json), json.dumps(layout_json), latency_ms),
        )
        if not version:
            return None

        execute(
            """
            update diagrams
            set active_version_no = %s,
                updated_at = now()
            where id = %s
            """,
            (version_no, diagram_id),
        )

        execute(
            """
            update chats
            set updated_at = now()
            where id = %s
            """,
            (context['chat_id'],),
        )

        return {
            'diagram_id': diagram_id,
            'version_id': version['id'],
            'version_no': version_no,
            'diagram_type': version['diagram_type'],
            'layout_json': version['layout_json'],
            'raw_json': version['raw_json'],
            'overrides': {},
            'assistant_message_id': context['assistant_message_id'],
        }

    @staticmethod
    def update_label_overrides(user_id: str, version_id: str, overrides: dict[str, Any]) -> dict[str, Any] | None:
        allowed = fetch_one(
            """
            select dv.id
            from diagram_versions dv
            join diagrams d on d.id = dv.diagram_id
            join chats c on c.id = d.chat_id
            where dv.id = %s and c.user_id = %s and c.deleted_at is null
            """,
            (version_id, user_id),
        )
        if not allowed:
            return None

        updated = execute_returning(
            """
            insert into diagram_label_overrides (diagram_version_id, overrides)
            values (%s, %s::jsonb)
            on conflict (diagram_version_id)
            do update set overrides = excluded.overrides,
                          updated_at = now()
            returning diagram_version_id, overrides, updated_at
            """,
            (version_id, json.dumps(overrides)),
        )
        return updated

    @staticmethod
    def get_assistant_message_with_diagram(user_id: str, assistant_message_id: str) -> dict[str, Any] | None:
        message = fetch_one(
            """
            select m.id, m.chat_id, m.role, m.content, m.created_at
            from messages m
            join chats c on c.id = m.chat_id
            where m.id = %s and c.user_id = %s and c.deleted_at is null
            """,
            (assistant_message_id, user_id),
        )
        if not message:
            return None

        diagram = fetch_one(
            """
            select d.id as diagram_id,
                   d.assistant_message_id,
                   d.source_message_id,
                   d.active_version_no,
                   dv.id as version_id,
                   dv.version_no,
                   dv.diagram_type,
                   dv.model,
                   dv.layout_json,
                   dv.raw_json,
                   coalesce(dlo.overrides, '{}'::jsonb) as overrides
            from diagrams d
            join diagram_versions dv
              on dv.diagram_id = d.id and dv.version_no = d.active_version_no
            left join diagram_label_overrides dlo
              on dlo.diagram_version_id = dv.id
            where d.assistant_message_id = %s
            """,
            (assistant_message_id,),
        )
        message['diagram'] = diagram
        return message


repository = Repository()
