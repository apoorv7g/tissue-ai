from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / '.env'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra='ignore')

    app_name: str = 'Tissue AI v3'
    environment: str = 'development'
    debug: bool = False

    secret_key: str = Field(default='change-me', alias='SECRET_KEY')
    database_url: str = Field(alias='DATABASE_URL')

    supabase_url: str = Field(validation_alias=AliasChoices('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'))
    supabase_anon_key: str = Field(
        validation_alias=AliasChoices('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    )

    groq_api_key: str = Field(alias='GROQ_API_KEY')
    groq_model: str = Field(default='llama-3.3-70b-versatile', alias='GROQ_MODEL')

    session_cookie_name: str = 'tissue_session'
    session_max_age_seconds: int = 60 * 60 * 24 * 14
    secure_cookies: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
