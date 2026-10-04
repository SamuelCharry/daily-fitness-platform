from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import User, UserProfile

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileBody(BaseModel):
    height_cm: Optional[float] = None
    sex: Optional[str] = None  # "male" | "female"
    birthdate: Optional[date] = None
    current_phase: Optional[str] = None  # "cut" | "maintain" | "bulk"
    phase_start_date: Optional[date] = None
    competition_date: Optional[date] = None
    goal_weight: Optional[float] = Field(default=None, gt=0, le=500)
    target_calories: Optional[int] = Field(default=None, gt=0, le=20000)
    target_protein: Optional[float] = Field(default=None, ge=0, le=1000)
    weekly_sessions: Optional[int] = Field(default=None, ge=1, le=14)
    preparation_notes: Optional[str] = Field(default=None, max_length=5000)


def _serialize(profile: Optional[UserProfile]):
    if profile is None:
        return None
    return {
        "height_cm": profile.height_cm,
        "sex": profile.sex,
        "birthdate": profile.birthdate,
        "current_phase": profile.current_phase,
        "phase_start_date": profile.phase_start_date,
        "competition_date": profile.competition_date,
        "goal_weight": profile.goal_weight,
        "target_calories": profile.target_calories,
        "target_protein": profile.target_protein,
        "weekly_sessions": profile.weekly_sessions,
        "preparation_notes": profile.preparation_notes,
    }


@router.get("")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    return _serialize(profile)


@router.put("")
def update_profile(
    body: ProfileBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile is None:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return _serialize(profile)
