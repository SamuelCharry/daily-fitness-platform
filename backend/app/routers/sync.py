"""Phone sync: an iOS Shortcut posts steps/sleep from Apple Health.

Shortcuts can't log in, so it authenticates with a long-lived personal key instead
of the 7-day session token. The key only allows writing these fields.
"""
import hashlib
import hmac
import secrets
from datetime import date, timedelta
from typing import Optional, Union

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import BodyStat, User
from ..timekeeping import today as local_today

router = APIRouter(prefix="/api/sync", tags=["sync"])

Number = Union[float, int, str, None]


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _number(value: Number, field: str) -> Optional[float]:
    """Shortcuts in a Spanish locale send "7,5" and sometimes "8.432 pasos"-style text."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().split()[0].replace(",", ".")
    # "8.432" as thousands separator: more than one dot, or exactly 3 decimals on steps.
    if field == "steps" and text.count(".") >= 1 and len(text.split(".")[-1]) == 3:
        text = text.replace(".", "")
    try:
        return float(text)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{field}: no es un número ({value})")


class HealthBody(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD; "ayer"/"yesterday" also accepted; default today
    steps: Number = None
    sleep_hours: Number = None
    sleep_minutes: Number = None
    weight: Number = None
    calories: Number = None  # dietary energy consumed, kcal; not active energy burned


@router.get("/token")
def token_status(current_user: User = Depends(get_current_user)):
    return {"active": bool(current_user.sync_token_hash)}


@router.post("/token")
def create_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates (or replaces) the key. The old key stops working immediately."""
    token = "cfts_" + secrets.token_urlsafe(32)
    current_user.sync_token_hash = _hash(token)
    db.commit()
    return {"token": token}


@router.delete("/token", status_code=204)
def revoke_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.sync_token_hash = None
    db.commit()


def _user_for_key(authorization: Optional[str], x_sync_key: Optional[str], db: Session) -> User:
    key = x_sync_key or (authorization[7:] if authorization and authorization.lower().startswith("bearer ") else None)
    if not key or not key.startswith("cfts_"):
        raise HTTPException(status_code=401, detail="Falta la clave de sincronización")
    digest = _hash(key)
    for user in db.query(User).filter(User.sync_token_hash.isnot(None)).all():
        if hmac.compare_digest(user.sync_token_hash, digest):
            return user
    raise HTTPException(status_code=401, detail="Clave de sincronización inválida")


@router.post("/health")
def receive_health(
    body: HealthBody,
    authorization: Optional[str] = Header(default=None),
    x_sync_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    user = _user_for_key(authorization, x_sync_key, db)
    today = local_today()
    raw_date = (body.date or "").strip().lower()
    if raw_date in ("", "hoy", "today"):
        day = today
    elif raw_date in ("ayer", "yesterday"):
        day = today - timedelta(days=1)
    else:
        try:
            day = date.fromisoformat(raw_date[:10])
        except ValueError:
            raise HTTPException(status_code=422, detail="date: usa AAAA-MM-DD")
    if day > today or day < today - timedelta(days=31):
        raise HTTPException(status_code=422, detail="date: solo hoy o los últimos 31 días")

    values = {}
    steps = _number(body.steps, "steps")
    if steps is not None:
        if not 0 <= steps <= 200000:
            raise HTTPException(status_code=422, detail="steps fuera de rango")
        values["steps"] = int(round(steps))
    minutes = _number(body.sleep_minutes, "sleep_minutes")
    hours = _number(body.sleep_hours, "sleep_hours")
    if minutes is None and hours is not None:
        minutes = hours * 60
    if minutes is not None:
        if not 0 <= minutes <= 1440:
            raise HTTPException(status_code=422, detail="sueño fuera de rango")
        values["sleep_minutes"] = int(round(minutes))
    weight = _number(body.weight, "weight")
    if weight is not None:
        if not 20 <= weight <= 400:
            raise HTTPException(status_code=422, detail="weight fuera de rango")
        values["weight"] = round(weight, 2)
    calories = _number(body.calories, "calories")
    if calories is not None:
        if not 0 <= calories <= 20000:
            raise HTTPException(status_code=422, detail="calories fuera de rango")
        values["calories"] = calories
    if not values:
        raise HTTPException(status_code=422, detail="Envía al menos steps, sleep_hours, sleep_minutes, weight o calories")

    stat = db.query(BodyStat).filter(BodyStat.user_id == user.id, BodyStat.date == day).first()
    if stat is None:
        stat = BodyStat(user_id=user.id, date=day)
        db.add(stat)
    for key, value in values.items():
        setattr(stat, key, value)
    db.commit()
    return {"date": day.isoformat(), "saved": values}
