from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://restaurant:restaurant_dev@localhost:5432/restaurant"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth JWT
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # Stripe
    stripe_secret_key: str = "sk_test_placeholder"
    stripe_webhook_secret: str = "whsec_placeholder"

    # DeepSeek AI
    deepseek_api_key: str = "sk_placeholder"

    # SMTP (password reset emails)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Frontend URL for CORS (set to production URL when deploying)
    frontend_url: str = "http://localhost:5173"

    # App
    debug: bool = True
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins(self) -> list[str]:
        """Return allowed origins including the frontend_url if different."""
        origins = list(self.allowed_origins)
        if self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins


settings = Settings()
