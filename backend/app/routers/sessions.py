import json
from sqlalchemy import text
from sqlalchemy.orm import object_session
from ..timekeeping import today as local_today
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import Exercise, Routine, User, Workout, WorkoutExercise, WorkoutSession, SetLog

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
_session_start_lock = Lock()


class StartSessionBody(BaseModel):
    workout_id: int


class SubstituteBody(BaseModel):
    workout_exercise_id: int
    exercise_id: int
    expected_exercise_id: int


class SetLogBody(BaseModel):
    exercise_id: Optional[int] = None
    workout_exercise_id: int
    set_number: int = Field(ge=1, le=100)
    weight: Optional[float] = Field(default=None, ge=0, le=2000)
    reps: Optional[int] = Field(default=None, ge=1, le=1000)
    rir: Optional[int] = Field(default=None, ge=0, le=10)


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


def _choice_ids(session):
    return json.loads(session.substitutions or '{}')


def _actual_exercise(s):
    return s.performed_exercise or s.workout_exercise.exercise


def _serialize_session(session: WorkoutSession):
    db = object_session(session)
    choices = {}
    for slot_id, exercise_id in _choice_ids(session).items():
        ex = db.get(Exercise, exercise_id)
        if ex:
            choices[slot_id] = {'id': ex.id, 'name': ex.name, 'equipment': ex.equipment,
                'muscle': ex.muscle.name, 'joint_action': ex.joint_action, 'plane': ex.plane}

    return {
        "id": session.id,
        "workout_id": session.workout_id,
        "workout_name": session.workout.name,
        "date": session.date,
        "started_at": session.started_at,
        "finished_at": session.finished_at,
        "substitutions": choices,
        "sets": [
            {
                "id": s.id,
                "workout_exercise_id": s.workout_exercise_id,
                "exercise_id": _actual_exercise(s).id,
                "exercise_name": _actual_exercise(s).name,
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
    since = local_today() - timedelta(days=days)
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
            {"exercise_id": _actual_exercise(s).id, "set_number": s.set_number, "weight": s.weight, "reps": s.reps, "rir": s.rir}
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

    with _session_start_lock:
        # Resume today's unfinished workout; reopening the screen is not a new session.
        existing = db.query(WorkoutSession).filter(
            WorkoutSession.workout_id == workout.id,
            WorkoutSession.date == local_today(),
            WorkoutSession.finished_at.is_(None),
        ).order_by(WorkoutSession.id.desc()).first()
        if existing:
            if existing.started_at is None:
                existing.started_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(existing)
            return _serialize_session(existing)
        session = WorkoutSession(workout_id=workout.id, date=local_today(), started_at=datetime.now(timezone.utc))
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
    if db.bind.dialect.name == "sqlite":
        db.execute(text("BEGIN IMMEDIATE"))
    session = _get_owned_session(session_id, current_user, db)
    if session.finished_at:
        raise HTTPException(status_code=409, detail="La sesión ya está finalizada")

    workout_exercise = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.id == body.workout_exercise_id, WorkoutExercise.workout_id == session.workout_id)
        .first()
    )
    if workout_exercise is None:
        raise HTTPException(status_code=400, detail="Exercise does not belong to this session's workout")

    set_log = db.query(SetLog).filter(
        SetLog.session_id == session.id,
        SetLog.workout_exercise_id == body.workout_exercise_id,
        SetLog.set_number == body.set_number,
    ).first()
    actual_id = (_actual_exercise(set_log).id if set_log else
                 _choice_ids(session).get(str(workout_exercise.id), workout_exercise.exercise_id))
    if body.exercise_id is not None and body.exercise_id != actual_id:
        raise HTTPException(409, "El ejercicio cambió. Recarga la sesión antes de guardar.")
    if set_log is None:
        set_log = SetLog(session_id=session.id, workout_exercise_id=body.workout_exercise_id, set_number=body.set_number)
        db.add(set_log)
    set_log.performed_exercise_id = actual_id
    set_log.weight, set_log.reps, set_log.rir = body.weight, body.reps, body.rir
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


@router.post("/{session_id}/substitute")
def substitute(session_id: int, body: SubstituteBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.bind.dialect.name == "sqlite":
        db.execute(text("BEGIN IMMEDIATE"))
    session = _get_owned_session(session_id, user, db)
    if session.finished_at:
        raise HTTPException(409, "La sesión ya está finalizada.")
    slot = db.query(WorkoutExercise).filter(WorkoutExercise.id == body.workout_exercise_id,
        WorkoutExercise.workout_id == session.workout_id, WorkoutExercise.retired.isnot(True)).first()
    exercise = db.get(Exercise, body.exercise_id)
    if slot is None or exercise is None:
        raise HTTPException(400, "No se encontró el ejercicio de esta sesión.")
    choices = _choice_ids(session)
    current = choices.get(str(slot.id), slot.exercise_id)
    if current != body.expected_exercise_id:
        raise HTTPException(409, "La sustitución cambió en otro dispositivo. Recarga la sesión.")
    def muscle(name):
        return 'chest' if name in ('upper_pec','lower_pec') else 'upper_back' if name == 'traps' else name
    if muscle(exercise.muscle.name) != muscle(slot.exercise.muscle.name):
        raise HTTPException(400, "Elige una alternativa del mismo músculo.")
    if body.exercise_id != slot.exercise_id and any(
        e.id != slot.id and not e.retired and choices.get(str(e.id), e.exercise_id) == body.exercise_id
        for e in session.workout.exercises):
        raise HTTPException(409, "Ese ejercicio ya está en otro bloque de hoy.")
    # Freeze legacy rows before switching, and never relabel already logged sets.
    for logged in session.sets:
        if logged.workout_exercise_id == slot.id and logged.performed_exercise_id is None:
            logged.performed_exercise_id = current
    if body.exercise_id == slot.exercise_id:
        choices.pop(str(slot.id), None)
    else:
        choices[str(slot.id)] = body.exercise_id
    session.substitutions = json.dumps(choices)
    db.commit()
    db.expire_all()
    return _serialize_session(session)
