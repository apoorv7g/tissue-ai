from __future__ import annotations

from typing import Any

import httpx

from ..config import get_settings

settings = get_settings()


class SupabaseAuthError(Exception):
    pass


class SupabaseAuthService:
    def __init__(self) -> None:
        self.base_url = settings.supabase_url.rstrip('/')
        self.headers = {
            'apikey': settings.supabase_anon_key,
            'Authorization': f'Bearer {settings.supabase_anon_key}',
            'Content-Type': 'application/json',
        }
        self.timeout = httpx.Timeout(15.0, read=20.0)

    def _request(self, method: str, path: str, *, headers: dict[str, str] | None = None, json: dict[str, Any] | None = None) -> httpx.Response:
        url = f'{self.base_url}{path}'
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.request(
                    method=method,
                    url=url,
                    headers=headers or self.headers,
                    json=json,
                )
        except httpx.HTTPError as exc:
            raise SupabaseAuthError(f'Unable to reach Supabase at {self.base_url}. Check SUPABASE_URL and internet access.') from exc
        return response

    def signup(self, email: str, password: str) -> dict[str, Any]:
        response = self._request(
            'POST',
            '/auth/v1/signup',
            json={'email': email, 'password': password},
        )

        if response.status_code >= 400:
            raise SupabaseAuthError(self._extract_error(response))

        data = response.json()
        if 'session' not in data or not data['session']:
            return self.login(email, password)
        return data

    def login(self, email: str, password: str) -> dict[str, Any]:
        response = self._request(
            'POST',
            '/auth/v1/token?grant_type=password',
            json={'email': email, 'password': password},
        )

        if response.status_code >= 400:
            raise SupabaseAuthError(self._extract_error(response))

        return response.json()

    def refresh(self, refresh_token: str) -> dict[str, Any]:
        response = self._request(
            'POST',
            '/auth/v1/token?grant_type=refresh_token',
            json={'refresh_token': refresh_token},
        )

        if response.status_code >= 400:
            raise SupabaseAuthError(self._extract_error(response))

        return response.json()

    def logout(self, access_token: str) -> None:
        self._request(
            'POST',
            '/auth/v1/logout',
            headers={**self.headers, 'Authorization': f'Bearer {access_token}'},
        )

    def get_user(self, access_token: str) -> dict[str, Any]:
        response = self._request(
            'GET',
            '/auth/v1/user',
            headers={**self.headers, 'Authorization': f'Bearer {access_token}'},
        )

        if response.status_code >= 400:
            raise SupabaseAuthError(self._extract_error(response))

        return response.json()

    @staticmethod
    def _extract_error(response: httpx.Response) -> str:
        try:
            payload = response.json()
            message = payload.get('msg') or payload.get('message') or payload.get('error_description')
            if message:
                return str(message)
        except Exception:
            pass
        return f'Auth request failed ({response.status_code})'


auth_service = SupabaseAuthService()
