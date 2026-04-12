from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import JSONResponse

from ..config import get_settings
from ..repositories.repository import repository
from ..session import encode_session, make_session_payload
from ..services.supabase_auth import SupabaseAuthError, auth_service

router = APIRouter(prefix='/auth', tags=['auth'])
settings = get_settings()


def _attach_session_cookie(response: JSONResponse, session: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        samesite='lax',
        secure=settings.secure_cookies,
        path='/',
    )


@router.post('/signup')
def signup(email: str = Form(...), password: str = Form(...)):
    try:
        payload = auth_service.signup(email=email.strip(), password=password)
        user_id = payload['user']['id']
        session_data = payload['session']

        repository.ensure_profile(user_id)

        session = make_session_payload(
            user_id=user_id,
            access_token=str(session_data['access_token']),
            refresh_token=str(session_data['refresh_token']),
            expires_in=int(session_data.get('expires_in', 3600)),
        )

        response = JSONResponse({'ok': True})
        _attach_session_cookie(response, encode_session(session))
        return response

    except SupabaseAuthError as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)


@router.post('/login')
def login(email: str = Form(...), password: str = Form(...)):
    try:
        payload = auth_service.login(email=email.strip(), password=password)
        user_id = payload['user']['id']
        repository.ensure_profile(user_id)

        session = make_session_payload(
            user_id=user_id,
            access_token=str(payload['access_token']),
            refresh_token=str(payload['refresh_token']),
            expires_in=int(payload.get('expires_in', 3600)),
        )

        response = JSONResponse({'ok': True})
        _attach_session_cookie(response, encode_session(session))
        return response

    except SupabaseAuthError as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)


@router.post('/logout')
def logout(request: Request):
    current_user = getattr(request.state, 'current_user', None)
    if current_user:
        try:
            auth_service.logout(current_user.access_token)
        except Exception:
            pass

    response = JSONResponse({'ok': True})
    response.delete_cookie(settings.session_cookie_name, path='/')
    return response
