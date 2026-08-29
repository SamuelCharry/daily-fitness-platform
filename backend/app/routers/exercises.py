from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import Exercise, Muscle, MuscleGroup

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


@router.get("")
def list_exercises(
    muscle_group: Optional[str] = None,
    joint_action: Optional[str] = None,
    plane: Optional[str] = None,
    search: Optional[str] = None,
    _current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Exercise).join(Muscle).join(MuscleGroup)

    if muscle_group:
        query = query.filter(MuscleGroup.name == muscle_group)
    if joint_action:
        query = query.filter(Exercise.joint_action == joint_action)
    if plane:
        query = query.filter(Exercise.plane == plane)
    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))

    exercises = query.order_by(Exercise.name).all()
    return [
        {
            "id": ex.id,
            "name": ex.name,
            "equipment": ex.equipment,
            "is_compound": ex.is_compound,
            "youtube_url": ex.youtube_url,
            "joint_action": ex.joint_action,
            "plane": ex.plane,
            "muscle": ex.muscle.name,
            "muscle_group": ex.muscle.muscle_group.name,
        }
        for ex in exercises
    ]


@router.get("/filters")
def exercise_filters(_current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    muscle_groups = [g.name for g in db.query(MuscleGroup).order_by(MuscleGroup.name).all()]
    joint_actions = sorted(
        {row[0] for row in db.query(Exercise.joint_action).filter(Exercise.joint_action.isnot(None)).all()}
    )
    planes = sorted({row[0] for row in db.query(Exercise.plane).filter(Exercise.plane.isnot(None)).all()})
    return {"muscle_groups": muscle_groups, "joint_actions": joint_actions, "planes": planes}
