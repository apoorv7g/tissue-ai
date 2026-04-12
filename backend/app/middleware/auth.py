from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from ..config import get_settings
from ..deps import CurrentUser
from ..session import decode_session, encode_session, make_session_payload
from ..services.supabase_auth import SupabaseAuthError, auth_service

settings = get_settings()


class AuthSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_cookie = request.cookies.get(settings.session_cookie_name)
        should_clear_cookie = False
        refreshed_cookie_value: str | None = None

        if raw_cookie:
            session = decode_session(raw_cookie)
            if not session:
                should_clear_cookie = True
            else:
                if session.is_expired() and session.refresh_token:
                    try:
                        refreshed = auth_service.refresh(session.refresh_token)
                        refreshed_session = make_session_payload(
                            user_id=str(refreshed.get('user', {}).get('id') or session.user_id),
                            access_token=str(refreshed.get('access_token')),
                            refresh_token=str(refreshed.get('refresh_token') or session.refresh_token),
                            expires_in=int(refreshed.get('expires_in', 3600)),
                        )
                        session = refreshed_session
                        refreshed_cookie_value = encode_session(refreshed_session)
                    except SupabaseAuthError:
                        should_clear_cookie = True
                        session = None

                if session:
                    request.state.current_user = CurrentUser(
                        id=session.user_id,
                        access_token=session.access_token,
                    )

        response = await call_next(request)

        if refreshed_cookie_value:
            response.set_cookie(
                settings.session_cookie_name,
                refreshed_cookie_value,
                max_age=settings.session_max_age_seconds,
                httponly=True,
                samesite='lax',
                secure=settings.secure_cookies,
                path='/',
            )
        elif should_clear_cookie:
            response.delete_cookie(settings.session_cookie_name, path='/')

        return response
