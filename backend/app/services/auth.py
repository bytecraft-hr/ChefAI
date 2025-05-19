# backend/app/services/auth.py

import logging
from datetime import datetime, timedelta
from typing import Optional, Generator

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..core.config import settings
from ..db.session import SessionLocal
from ..db.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

logger = logging.getLogger("uvicorn.error")

def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a SQLAlchemy Session and closes it afterwards.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(pw: str) -> str:
    return pwd_context.hash(pw)


def authenticate_user(
    db: Session, username: str, password: str
) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db_session),
) -> User:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            logger.warning("JWT payload missing 'sub'")
            raise creds_exc
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise creds_exc

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        logger.warning(f"User '{username}' not found")
        raise creds_exc
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return current_user
