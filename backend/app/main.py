from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import close_db_pool, open_db_pool
from .middleware.auth import AuthSessionMiddleware
from .routes import api, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    open_db_pool()
    try:
        yield
    finally:
        close_db_pool()


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# Allow the Next.js dev server to call the API directly if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.add_middleware(AuthSessionMiddleware)

app.include_router(auth.router)
app.include_router(api.router)

# Serve diagram.js (and any other static assets the frontend needs)
app.mount('/static', StaticFiles(directory='backend/app/static'), name='static')
