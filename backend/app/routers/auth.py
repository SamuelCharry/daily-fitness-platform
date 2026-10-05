import os
from threading import Lock
from collections import defaultdict, deque
from time import monotonic
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from ..auth import PERSONAL_MODE, create_access_token, get_current_user, get_db, hash_password, verify_password
from ..models import User

router = APIRouter(prefix='/api/auth', tags=['auth'])
rate_lock = Lock()
attempts = defaultdict(deque)
REGISTRATION_ENABLED = not PERSONAL_MODE and os.getenv('REGISTRATION_ENABLED', 'true').lower() == 'true'

def limit_attempts(request: Request):
    key = (request.client.host if request.client else 'unknown', request.url.path)
    now = monotonic()
    with rate_lock:
        # Drop expired buckets so the limiter stays bounded.
        for stale in [k for k, times in attempts.items() if not times or times[-1] <= now - 60]:
            del attempts[stale]
        times = attempts[key]
        while times and times[0] <= now - 60:
            times.popleft()
        if len(times) >= 20:
            raise HTTPException(status_code=429, detail='Demasiados intentos. Espera un minuto.', headers={'Retry-After': '60'})
        times.append(now)

class RegistrationBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=72)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'

@router.post('/register', response_model=TokenResponse)
def register(data: RegistrationBody, request: Request, db: Session = Depends(get_db)):
    if not REGISTRATION_ENABLED:
        raise HTTPException(status_code=403, detail='El registro está desactivado.')
    limit_attempts(request)
    if len(data.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=422, detail='La contraseña debe ocupar como máximo 72 bytes.')
    email = str(data.email).lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail='Este correo ya tiene una cuenta. Inicia sesión.')
    user = User(email=email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Este correo ya tiene una cuenta. Inicia sesión.')
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))

@router.post('/login', response_model=TokenResponse)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    limit_attempts(request)
    user = db.query(User).filter(func.lower(User.email) == form_data.username.strip().lower()).first()
    if not user or len(form_data.password.encode('utf-8')) > 72 or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Correo o contraseña incorrectos')
    return TokenResponse(access_token=create_access_token(user.id))

@router.get('/me')
def me(current_user: User = Depends(get_current_user)):
    return {'id': current_user.id, 'email': current_user.email}

@router.get('/config')
def config():
    return {'personal_mode': PERSONAL_MODE, 'registration_enabled': REGISTRATION_ENABLED}
