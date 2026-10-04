from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..auth import OWNER_EMAIL, PERSONAL_MODE, create_access_token, get_current_user, get_db, verify_password
from ..models import User

router = APIRouter(prefix='/api/auth', tags=['auth'])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'

@router.post('/register')
def register():
    raise HTTPException(status_code=403, detail='Esta plataforma es personal. El registro está desactivado.')

@router.post('/login', response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == OWNER_EMAIL).first()
    if form_data.username != OWNER_EMAIL or not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Correo o contraseña incorrectos')
    return TokenResponse(access_token=create_access_token(user.id))

@router.get('/me')
def me(current_user: User = Depends(get_current_user)):
    return {'id': current_user.id, 'email': current_user.email}

@router.get('/config')
def config():
    return {'personal_mode': PERSONAL_MODE}
