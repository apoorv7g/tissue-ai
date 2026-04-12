from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status


@dataclass(slots=True)
class CurrentUser:
    id: str
    access_token: str
    email: str | None = None


def get_current_user(request: Request) -> CurrentUser | None:
    return getattr(request.state, 'current_user', None)


def require_user(user: CurrentUser | None = Depends(get_current_user)) -> CurrentUser:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentication required')
    return user
