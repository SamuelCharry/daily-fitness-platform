from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import Exercise, Routine, SetLog, User, Workout, WorkoutExercise, WorkoutSession

router = APIRouter(prefix="/api", tags=["routines"])


class WorkoutExerciseBody(BaseModel):
    exercise_id: int
    order_index: int = 0
    target_sets: Optional[int] = None
    rep_range_min: Optional[int] = None
    rep_range_max: Optional[int] = None
    rir_target: Optional[int] = None
    rest_seconds: Optional[int] = None
    comments: Optional[str] = None


class WorkoutBody(BaseModel):
    name: str
    day_index: int = 0
    exercises: List[WorkoutExerciseBody] = []


class RoutineBody(BaseModel):
    name: str


def _serialize_workout(workout: Workout):
    return {
        "id": workout.id,
        "name": workout.name,
        "day_index": workout.day_index,
        "exercises": [
            {
                "id": we.id,
                "order_index": we.order_index,
                "target_sets": we.target_sets,
                "rep_range_min": we.rep_range_min,
                "rep_range_max": we.rep_range_max,
                "rir_target": we.rir_target,
                "rest_seconds": we.rest_seconds,
                "comments": we.comments,
                "exercise_id": we.exercise.id,
                "name": we.exercise.name,
                "equipment": we.exercise.equipment,
                "muscle": we.exercise.muscle.name,
                "joint_action": we.exercise.joint_action,
                "plane": we.exercise.plane,
            }
            for we in workout.exercises
        ],
    }


def _serialize_routine(routine: Routine):
    return {
        "id": routine.id,
        "name": routine.name,
        "is_active": routine.is_active,
        "workouts": [_serialize_workout(w) for w in routine.workouts],
    }


def _get_owned_routine(routine_id: int, user: User, db: Session) -> Routine:
    routine = db.query(Routine).filter(Routine.id == routine_id, Routine.user_id == user.id).first()
    if routine is None:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


def _cascade_delete_workout(workout: Workout, db: Session):
    """SQLite doesn't enforce FK constraints here, so sessions/sets/exercise
    rows referencing this workout have to be removed explicitly before it."""
    workout_exercise_ids = [we.id for we in workout.exercises]
    session_ids = [
        s.id for s in db.query(WorkoutSession.id).filter(WorkoutSession.workout_id == workout.id).all()
    ]
    if session_ids:
        db.query(SetLog).filter(SetLog.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(WorkoutSession).filter(WorkoutSession.id.in_(session_ids)).delete(synchronize_session=False)
    if workout_exercise_ids:
        db.query(SetLog).filter(SetLog.workout_exercise_id.in_(workout_exercise_ids)).delete(
            synchronize_session=False
        )
    db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout.id).delete(synchronize_session=False)
    db.delete(workout)


@router.get("/routines")
def list_routines(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    routines = db.query(Routine).filter(Routine.user_id == current_user.id).order_by(Routine.id).all()
    return [_serialize_routine(r) for r in routines]


@router.post("/routines")
def create_routine(
    body: RoutineBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    is_first = db.query(Routine).filter(Routine.user_id == current_user.id).count() == 0
    routine = Routine(user_id=current_user.id, name=body.name, is_active=is_first)
    db.add(routine)
    db.commit()
    db.refresh(routine)
    return _serialize_routine(routine)


@router.put("/routines/{routine_id}")
def rename_routine(
    routine_id: int,
    body: RoutineBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    routine = _get_owned_routine(routine_id, current_user, db)
    routine.name = body.name
    db.commit()
    db.refresh(routine)
    return _serialize_routine(routine)


@router.patch("/routines/{routine_id}/activate")
def activate_routine(
    routine_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    target = _get_owned_routine(routine_id, current_user, db)
    db.query(Routine).filter(Routine.user_id == current_user.id).update({"is_active": False})
    target.is_active = True
    db.commit()
    db.refresh(target)
    return _serialize_routine(target)


@router.delete("/routines/{routine_id}", status_code=204)
def delete_routine(
    routine_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    routine = _get_owned_routine(routine_id, current_user, db)
    for workout in list(routine.workouts):
        _cascade_delete_workout(workout, db)
    db.delete(routine)
    db.commit()


@router.post("/routines/{routine_id}/workouts")
def create_workout(
    routine_id: int,
    body: WorkoutBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    routine = _get_owned_routine(routine_id, current_user, db)
    workout = Workout(routine_id=routine.id, name=body.name, day_index=body.day_index)
    db.add(workout)
    db.flush()

    _sync_workout_exercises(workout, body.exercises, current_user, db)

    db.commit()
    db.refresh(workout)
    return _serialize_workout(workout)


@router.put("/workouts/{workout_id}")
def update_workout(
    workout_id: int,
    body: WorkoutBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = (
        db.query(Workout)
        .join(Routine)
        .filter(Workout.id == workout_id, Routine.user_id == current_user.id)
        .first()
    )
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    workout.name = body.name
    workout.day_index = body.day_index

    _sync_workout_exercises(workout, body.exercises, current_user, db)

    db.commit()
    db.refresh(workout)
    return _serialize_workout(workout)


@router.delete("/workouts/{workout_id}", status_code=204)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = (
        db.query(Workout)
        .join(Routine)
        .filter(Workout.id == workout_id, Routine.user_id == current_user.id)
        .first()
    )
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    _cascade_delete_workout(workout, db)
    db.commit()


def _sync_workout_exercises(workout: Workout, exercises: List[WorkoutExerciseBody], user: User, db: Session):
    exercise_ids = [e.exercise_id for e in exercises]
    if exercise_ids:
        found = db.query(Exercise.id).filter(Exercise.id.in_(exercise_ids)).count()
        if found != len(set(exercise_ids)):
            raise HTTPException(status_code=400, detail="One or more exercises not found")

    # Match by exercise_id and update rows in place rather than delete-and-recreate,
    # so existing WorkoutExercise ids (and the SetLog history that references them)
    # survive routine edits like reordering or changing target sets.
    existing_by_exercise_id = {we.exercise_id: we for we in workout.exercises}
    keep_exercise_ids = set()

    for e in exercises:
        keep_exercise_ids.add(e.exercise_id)
        existing = existing_by_exercise_id.get(e.exercise_id)
        if existing is not None:
            existing.order_index = e.order_index
            existing.target_sets = e.target_sets
            existing.rep_range_min = e.rep_range_min
            existing.rep_range_max = e.rep_range_max
            existing.rir_target = e.rir_target
            existing.rest_seconds = e.rest_seconds
            existing.comments = e.comments
        else:
            db.add(
                WorkoutExercise(
                    workout_id=workout.id,
                    exercise_id=e.exercise_id,
                    order_index=e.order_index,
                    target_sets=e.target_sets,
                    rep_range_min=e.rep_range_min,
                    rep_range_max=e.rep_range_max,
                    rir_target=e.rir_target,
                    rest_seconds=e.rest_seconds,
                    comments=e.comments,
                )
            )

    for exercise_id, we in existing_by_exercise_id.items():
        if exercise_id not in keep_exercise_ids:
            db.delete(we)


@router.get("/workouts/today")
def workout_today(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    routine = (
        db.query(Routine)
        .filter(Routine.user_id == current_user.id, Routine.is_active.is_(True))
        .first()
    )
    if routine is None:
        raise HTTPException(
            status_code=404,
            detail="No active routine set yet. Pick which program (3x/4x/5x/6x) is current.",
        )

    workouts = (
        db.query(Workout)
        .filter(Workout.routine_id == routine.id)
        .order_by(Workout.day_index)
        .all()
    )
    if not workouts:
        raise HTTPException(status_code=404, detail="Active routine has no workouts yet.")

    today_index = date.today().toordinal() % len(workouts)
    workout = workouts[today_index]

    return {
        "routine_id": routine.id,
        "routine": routine.name,
        **_serialize_workout(workout),
    }
