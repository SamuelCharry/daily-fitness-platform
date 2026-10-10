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
    query = db.query(Exercise).join(Muscle).join(MuscleGroup).filter((Exercise.owner_id.is_(None)) | (Exercise.owner_id == _current_user.id))

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


from pydantic import BaseModel, Field
from fastapi import HTTPException

class CreateExerciseBody(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    muscle: str
    joint_action: str = Field(min_length=2, max_length=80)
    equipment: str = Field(min_length=2, max_length=80)

@router.post("")
def create_exercise(body: CreateExerciseBody, user=Depends(get_current_user), db: Session = Depends(get_db)):
    muscle = db.query(Muscle).filter(Muscle.name == body.muscle).first()
    if not muscle or not body.name.strip():
        raise HTTPException(400, "Indica un nombre y un músculo válido.")
    exercise = Exercise(owner_id=user.id, name=body.name.strip(), muscle_id=muscle.id, joint_action=body.joint_action.strip(), equipment=body.equipment.strip())
    db.add(exercise)
    db.commit()
    return {'id': exercise.id}
