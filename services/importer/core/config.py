from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurazione minimale per il parser stateless."""

    app_name: str = "Taboolo SIX Parser"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False

    # Upload / sicurezza
    max_upload_size_mb: int = 100
    max_request_body_mb: int = 160
    import_rate_limit_per_minute: int = 12

    # CORS
    cors_origins: list[str] | tuple[str, ...] | str | None = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    cors_allow_credentials: bool = True

    # Logging
    structured_logging: bool = False
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="TABOO_", env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(
        cls,
        value: str | list[str] | tuple[str, ...] | None,
    ) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            if not value.strip():
                return []
            return [item.strip() for item in value.split(",") if item.strip()]
        return list(value)


settings = Settings()
