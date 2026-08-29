from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import BodyStat, User

router = APIRouter(prefix="/api/body-stats", tags=["body-stats"])


class BodyStatBody(BaseModel):
    date: date
    weight: Optional[float] = None
    waist: Optional[float] = None
    neck: Optional[float] = None
    hip: Optional[float] = None
    body_fat_manual: Optional[float] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    steps: Optional[int] = None
    sleep_minutes: Optional[int] = None
    cardio_minutes: Optional[int] = None
    on_diet: Optional[bool] = None
    cheat_meal: Optional[bool] = None
    notes: Optional[str] = None


def _serialize(stat: BodyStat):
    return {
        "id": stat.id,
        "date": stat.date,
        "weight": stat.weight,
        "waist": stat.waist,
        "neck": stat.neck,
        "hip": stat.hip,
        "body_fat_manual": stat.body_fat_manual,
        "calories": stat.calories,
        "protein_g": stat.protein_g,
        "carbs_g": stat.carbs_g,
        "fat_g": stat.fat_g,
        "steps": stat.steps,
        "sleep_minutes": stat.sleep_minutes,
        "cardio_minutes": stat.cardio_minutes,
        "on_diet": stat.on_diet,
        "cheat_meal": stat.cheat_meal,
        "notes": stat.notes,
    }


@router.post("")
def upsert_body_stat(
    body: BodyStatBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    stat = (
        db.query(BodyStat)
        .filter(BodyStat.user_id == current_user.id, BodyStat.date == body.date)
        .first()
    )
    if stat is None:
        stat = BodyStat(user_id=current_user.id, date=body.date)
        db.add(stat)

    for field, value in body.model_dump(exclude={"date"}, exclude_unset=True).items():
        setattr(stat, field, value)

    db.commit()
    db.refresh(stat)
    return _serialize(stat)


@router.get("")
def list_body_stats(
    days: int = 56, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    since = date.today() - timedelta(days=days)
    stats = (
        db.query(BodyStat)
        .filter(BodyStat.user_id == current_user.id, BodyStat.date >= since)
        .order_by(BodyStat.date)
        .all()
    )
    return [_serialize(s) for s in stats]
