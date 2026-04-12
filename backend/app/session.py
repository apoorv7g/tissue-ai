from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from itsdangerous import BadSignature, URLSafeSerializer

from .config import get_settings

settings = get_settings()
serializer = URLSafeSerializer(settings.secret_key, salt='tissue-session')


@dataclass(slots=True)
class SessionData:
    user_id: str
    access_token: str
    refresh_token: str
    expires_at: int
    email: str | None = None

    def is_expired(self, skew_seconds: int = 30) -> bool:
        now = int(datetime.now(timezone.utc).timestamp())
        return self.expires_at <= now + skew_seconds


def make_session_payload(user_id: str, access_token: str, refresh_token: str, expires_in: int, email: str | None = None) -> SessionData:
    expires_at = int((datetime.now(timezone.utc) + timedelta(seconds=expires_in)).timestamp())
    return SessionData(
        user_id=user_id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        email=email,
    )


def encode_session(session: SessionData) -> str:
    return serializer.dumps(
        {
            'user_id': session.user_id,
            'access_token': session.access_token,
            'refresh_token': session.refresh_token,
            'expires_at': session.expires_at,
        }
    )


def decode_session(raw_value: str) -> SessionData | None:
    try:
        payload = serializer.loads(raw_value)
    except BadSignature:
        return None

    try:
        return SessionData(
            user_id=str(payload['user_id']),
            access_token=str(payload['access_token']),
            refresh_token=str(payload['refresh_token']),
            expires_at=int(payload['expires_at']),
        )
    except (KeyError, TypeError, ValueError):
        return None
