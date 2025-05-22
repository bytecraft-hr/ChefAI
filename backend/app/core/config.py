from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import logging

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chef_ai-backend-config")

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    DATABASE_URL: str

    SPOONACULAR_API_KEY: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""

    NLP_SERVICE_URL: str = "http://nlp-service:8001/process"
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            return [v.strip() for v in value.split(",")]
        if isinstance(value, list):
            return value
        raise ValueError("ALLOWED_ORIGINS must be a comma-separated string or list")

    # Replace the Config class with model_config dict
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "allow",  # Add this to allow extra fields from environment variables
    }

# Instantiate once
settings = Settings()