import os
from typing import Optional
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
PERSONAL_MODE = os.getenv("PERSONAL_MODE", "false").lower() == "true"
OWNER_EMAIL = os.getenv("OWNER_EMAIL", "owner@cool.local")
if os.getenv("APP_ENV") == "production" and SECRET_KEY == "dev-secret-change-in-production":
    raise RuntimeError("Set JWT_SECRET before starting in production")
if os.getenv("APP_ENV") == "production" and PERSONAL_MODE:
    raise RuntimeError("PERSONAL_MODE is for private local use only")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if PERSONAL_MODE:
        user = db.query(User).filter(User.email == OWNER_EMAIL).first()
        if user is None:
            raise HTTPException(status_code=503, detail="Personal owner is not configured")
        return user
    if not token:
        raise credentials_error
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_error
        user_id = int(user_id)
    except (JWTError, ValueError, TypeError):
        raise credentials_error

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error
    return user
