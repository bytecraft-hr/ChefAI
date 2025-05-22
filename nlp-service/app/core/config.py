from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    NLP_SPACY_MODEL: str = "en_core_web_sm"
    NLP_SBERT_MODEL: str = "all-MiniLM-L6-v2"
    MISTRAL_MODEL: str = "open-mistral-7b"
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
