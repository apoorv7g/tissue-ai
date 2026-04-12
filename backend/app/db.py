from __future__ import annotations

from contextlib import contextmanager
from typing import Any

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_settings

settings = get_settings()
pool = ConnectionPool(conninfo=settings.database_url, open=False)


def open_db_pool() -> None:
    if pool.closed:
        pool.open(wait=True)


def close_db_pool() -> None:
    if not pool.closed:
        pool.close()


@contextmanager
def get_db_connection() -> Connection:
    with pool.connection() as conn:
        yield conn


def fetch_all(query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params or ())
            return list(cur.fetchall())


def fetch_one(query: str, params: tuple[Any, ...] | None = None) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return dict(row) if row else None


def execute(query: str, params: tuple[Any, ...] | None = None) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())


def execute_returning(query: str, params: tuple[Any, ...] | None = None) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return dict(row) if row else None
