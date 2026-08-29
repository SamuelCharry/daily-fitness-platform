from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import Routine, User, Workout, WorkoutExercise, WorkoutSession, SetLog

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class StartSessionBody(BaseModel):
    workout_id: int


class SetLogBody(BaseModel):
    workout_exercise_id: int
    set_number: int
    weight: Optional[float] = None
    reps: Optional[int] = None
    rir: Optional[int] = None


def _get_owned_session(session_id: int, user: User, db: Session) -> WorkoutSession:
    session = (
        db.query(WorkoutSession)
        .join(Workout)
        .join(Routine)
        .filter(WorkoutSession.id == session_id, Routine.user_id == user.id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _serialize_session(session: WorkoutSession):
    return {
        "id": session.id,
        "workout_id": session.workout_id,
        "workout_name": session.workout.name,
        "date": session.date,
        "finished_at": session.finished_at,
        "sets": [
            {
                "id": s.id,
                "workout_exercise_id": s.workout_exercise_id,
                "set_number": s.set_number,
                "weight": s.weight,
                "reps": s.reps,
                "rir": s.rir,
            }
            for s in session.sets
        ],
    }


@router.get("")
def list_sessions(
    days: int = 180, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    since = date.today() - timedelta(days=days)
    sessions = (
        db.query(WorkoutSession)
        .join(Workout)
        .join(Routine)
        .filter(Routine.user_id == current_user.id, WorkoutSession.date >= since)
        .order_by(WorkoutSession.date.desc())
        .all()
    )
    return [_serialize_session(s) for s in sessions]


@router.get("/last-sets/{workout_id}")
def last_sets(
    workout_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """The most recent finished session's sets for this workout, keyed by
    workout_exercise_id - lets the logging screen show 'last: 60kg x 8' next to
    each set slot so the user can see whether they're progressing."""
    workout = (
        db.query(Workout)
        .join(Routine)
        .filter(Workout.id == workout_id, Routine.user_id == current_user.id)
        .first()
    )
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    last_session = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.workout_id == workout_id, WorkoutSession.finished_at.isnot(None))
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .first()
    )
    if last_session is None:
        return {}

    by_exercise: dict[int, list[dict]] = {}
    for s in sorted(last_session.sets, key=lambda s: s.set_number):
        by_exercise.setdefault(s.workout_exercise_id, []).append(
            {"set_number": s.set_number, "weight": s.weight, "reps": s.reps, "rir": s.rir}
        )
    return by_exercise


@router.post("")
def start_session(
    body: StartSessionBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    workout = (
        db.query(Workout)
        .join(Routine)
        .filter(Workout.id == body.workout_id, Routine.user_id == current_user.id)
        .first()
    )
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    session = WorkoutSession(workout_id=workout.id, date=date.today())
    db.add(session)
    db.commit()
    db.refresh(session)
    return _serialize_session(session)


@router.post("/{session_id}/sets")
def log_set(
    session_id: int,
    body: SetLogBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(session_id, current_user, db)

    workout_exercise = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.id == body.workout_exercise_id, WorkoutExercise.workout_id == session.workout_id)
        .first()
    )
    if workout_exercise is None:
        raise HTTPException(status_code=400, detail="Exercise does not belong to this session's workout")

    set_log = SetLog(
        session_id=session.id,
        workout_exercise_id=body.workout_exercise_id,
        set_number=body.set_number,
        weight=body.weight,
        reps=body.reps,
        rir=body.rir,
    )
    db.add(set_log)
    db.commit()
    db.refresh(session)
    return _serialize_session(session)


@router.post("/{session_id}/finish")
def finish_session(
    session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    session = _get_owned_session(session_id, current_user, db)
    session.finished_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _serialize_session(session)
