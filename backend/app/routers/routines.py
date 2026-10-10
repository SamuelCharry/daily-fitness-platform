from ..timekeeping import today as local_today
import datetime
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import Exercise, Routine, RoutineTuning, ScheduleMove, SetLog, User, Workout, WorkoutExercise, WorkoutSession

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


class ScheduleAssignment(BaseModel):
    workout_id: int
    weekday: Optional[int] = Field(default=None, ge=0, le=6)


class ScheduleBody(BaseModel):
    assignments: List[ScheduleAssignment]


class SwapBody(BaseModel):
    exercise_id: int


class MoveBody(BaseModel):
    workout_id: int
    week_start: date
    date: Optional[datetime.date] = None  # None = back to the usual weekday


def _is_retired(we: WorkoutExercise) -> bool:
    return bool(we.retired)


def _serialize_workout(workout: Workout):
    return {
        "id": workout.id,
        "name": workout.name,
        "day_index": workout.day_index,
        "weekday": workout.weekday,
        # Retired slots only exist so history can still name the exercise behind old sets.
        "history_exercises": [
            {"id": we.id, "exercise_id": we.exercise.id, "name": we.exercise.name}
            for we in sorted(workout.exercises, key=lambda e: (e.order_index or 0, e.id))
            if _is_retired(we)
        ],
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
            for we in sorted(workout.exercises, key=lambda e: (e.order_index or 0, e.id))
            if not _is_retired(we)
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
    db.query(ScheduleMove).filter(ScheduleMove.workout_id == workout.id).delete(synchronize_session=False)
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
    db.query(RoutineTuning).filter(RoutineTuning.routine_id == routine.id).delete()
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


@router.post("/workouts/{workout_id}/duplicate")
def duplicate_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(Workout).join(Routine).filter(
        Workout.id == workout_id, Routine.user_id == current_user.id
    ).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    # A separate day with independent settings; never copy sessions or logged sets.
    clone = Workout(routine_id=source.routine_id, name=f"{source.name} · copia",
                    day_index=max((w.day_index or 0 for w in source.routine.workouts), default=-1) + 1,
                    weekday=None)
    db.add(clone)
    db.flush()
    for slot in source.exercises:
        if not _is_retired(slot):
            db.add(WorkoutExercise(workout_id=clone.id, exercise_id=slot.exercise_id,
                order_index=slot.order_index, target_sets=slot.target_sets,
                rep_range_min=slot.rep_range_min, rep_range_max=slot.rep_range_max,
                rir_target=slot.rir_target, rest_seconds=slot.rest_seconds,
                comments=slot.comments, retired=False))
    db.commit()
    db.refresh(clone)
    return _serialize_workout(clone)


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


def _has_history(we: WorkoutExercise, db: Session) -> bool:
    return db.query(SetLog.id).filter(SetLog.workout_exercise_id == we.id).first() is not None


def _retire_or_delete(we: WorkoutExercise, db: Session):
    if _has_history(we, db):
        we.retired = True
    else:
        db.delete(we)


def _sync_workout_exercises(workout: Workout, exercises: List[WorkoutExerciseBody], user: User, db: Session):
    exercise_ids = [e.exercise_id for e in exercises]
    if exercise_ids:
        found = db.query(Exercise.id).filter(Exercise.id.in_(exercise_ids), (Exercise.owner_id.is_(None)) | (Exercise.owner_id == user.id)).count()
        if found != len(set(exercise_ids)):
            raise HTTPException(status_code=400, detail="One or more exercises not found")

    # Match by exercise_id and update rows in place rather than delete-and-recreate,
    # so existing WorkoutExercise ids (and the SetLog history that references them)
    # survive routine edits like reordering or changing target sets. Re-adding an
    # exercise that was retired brings its old slot (and history) back.
    existing_by_exercise_id = {we.exercise_id: we for we in workout.exercises}
    keep_exercise_ids = set()

    for e in exercises:
        keep_exercise_ids.add(e.exercise_id)
        existing = existing_by_exercise_id.get(e.exercise_id)
        if existing is not None:
            existing.retired = False
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
                    retired=False,
                )
            )

    for exercise_id, we in existing_by_exercise_id.items():
        if exercise_id not in keep_exercise_ids and not _is_retired(we):
            _retire_or_delete(we, db)


@router.post("/workout-exercises/{workout_exercise_id}/swap")
def swap_exercise(
    workout_exercise_id: int,
    body: SwapBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace the exercise in one slot, keeping its sets/reps/RIR/rest and position.
    Logged sets stay with the old exercise; the new one starts with a clean history."""
    old = (
        db.query(WorkoutExercise)
        .join(Workout)
        .join(Routine)
        .filter(WorkoutExercise.id == workout_exercise_id, Routine.user_id == current_user.id)
        .first()
    )
    if old is None or _is_retired(old):
        raise HTTPException(status_code=404, detail="Exercise slot not found")
    if db.query(Exercise.id).filter(Exercise.id == body.exercise_id, (Exercise.owner_id.is_(None)) | (Exercise.owner_id == current_user.id)).first() is None:
        raise HTTPException(status_code=400, detail="Exercise not found")
    workout_id = old.workout_id
    if body.exercise_id == old.exercise_id:
        return _serialize_workout(old.workout)

    target = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.workout_id == workout_id, WorkoutExercise.exercise_id == body.exercise_id)
        .first()
    )
    if target is not None and not _is_retired(target):
        raise HTTPException(status_code=409, detail="Ese ejercicio ya está en este día")

    settings = dict(
        order_index=old.order_index,
        target_sets=old.target_sets,
        rep_range_min=old.rep_range_min,
        rep_range_max=old.rep_range_max,
        rir_target=old.rir_target,
        rest_seconds=old.rest_seconds,
        comments=old.comments,
    )
    if target is not None:
        # The replacement was in this slot before: revive it so its history comes back.
        for key, value in settings.items():
            setattr(target, key, value)
        target.retired = False
        _retire_or_delete(old, db)
    elif _has_history(old, db):
        old.retired = True
        db.add(WorkoutExercise(workout_id=workout_id, exercise_id=body.exercise_id, retired=False, **settings))
    else:
        old.exercise_id = body.exercise_id

    db.commit()
    db.expire_all()
    return _serialize_workout(db.query(Workout).filter(Workout.id == workout_id).first())


@router.put("/routines/{routine_id}/schedule")
def set_schedule(
    routine_id: int,
    body: ScheduleBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign the routine's days to fixed weekdays in one atomic call."""
    routine = _get_owned_routine(routine_id, current_user, db)
    by_id = {w.id: w for w in routine.workouts}
    for a in body.assignments:
        if a.workout_id not in by_id:
            raise HTTPException(status_code=400, detail="Workout does not belong to this routine")
    for a in body.assignments:
        by_id[a.workout_id].weekday = a.weekday
    db.commit()
    db.refresh(routine)
    return _serialize_routine(routine)


def _monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _week_plan(week_start: date, user: User, db: Session):
    week_end = week_start + timedelta(days=6)
    routine = db.query(Routine).filter(Routine.user_id == user.id, Routine.is_active.is_(True)).first()
    if routine is None:
        return {"week_start": week_start, "routine": None, "items": [], "unscheduled": []}

    moves = {
        m.workout_id: m.date
        for m in db.query(ScheduleMove).filter(ScheduleMove.user_id == user.id, ScheduleMove.week_start == week_start)
    }
    sessions = (
        db.query(WorkoutSession)
        .join(Workout)
        .filter(
            Workout.routine_id == routine.id,
            WorkoutSession.date >= week_start,
            WorkoutSession.date <= week_end,
        )
        .all()
    )
    items, unscheduled = [], []
    for w in routine.workouts:
        exercise_count = len([we for we in w.exercises if not _is_retired(we)])
        if w.weekday is None and w.id not in moves:
            unscheduled.append({"workout_id": w.id, "name": w.name, "exercise_count": exercise_count})
            continue
        usual = week_start + timedelta(days=w.weekday) if w.weekday is not None else None
        own = [s for s in sessions if s.workout_id == w.id]
        done = next((s for s in own if s.finished_at is not None), None)
        items.append(
            {
                "workout_id": w.id,
                "name": w.name,
                "exercise_count": exercise_count,
                "usual_date": usual,
                "date": moves.get(w.id, usual),
                "moved": w.id in moves,
                "done": done is not None,
                "done_date": done.date if done else None,
                "in_progress": done is None and any(s.finished_at is None for s in own),
            }
        )
    items.sort(key=lambda i: (i["date"], i["name"]))
    return {
        "week_start": week_start,
        "routine": {"id": routine.id, "name": routine.name},
        "items": items,
        "unscheduled": unscheduled,
    }


@router.get("/schedule/week")
def week_plan(
    start: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The active routine's plan for one Monday-Sunday week: usual weekdays,
    this week's moves applied, and whether each day was actually trained."""
    return _week_plan(_monday(start or local_today()), current_user, db)


@router.put("/schedule/move")
def move_workout(
    body: MoveBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Move one workout to another day of the same week, for that week only."""
    week_start = _monday(body.week_start)
    workout = (
        db.query(Workout)
        .join(Routine)
        .filter(Workout.id == body.workout_id, Routine.user_id == current_user.id)
        .first()
    )
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    move = (
        db.query(ScheduleMove)
        .filter(
            ScheduleMove.user_id == current_user.id,
            ScheduleMove.workout_id == workout.id,
            ScheduleMove.week_start == week_start,
        )
        .first()
    )
    usual = week_start + timedelta(days=workout.weekday) if workout.weekday is not None else None
    if body.date is None or body.date == usual:
        if move is not None:
            db.delete(move)
    else:
        if not week_start <= body.date <= week_start + timedelta(days=6):
            raise HTTPException(status_code=400, detail="Solo puedes mover un entreno dentro de la misma semana")
        if move is None:
            move = ScheduleMove(user_id=current_user.id, workout_id=workout.id, week_start=week_start, date=body.date)
            db.add(move)
        move.date = body.date
    db.commit()
    return _week_plan(week_start, current_user, db)


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

    today_index = local_today().toordinal() % len(workouts)
    workout = workouts[today_index]

    return {
        "routine_id": routine.id,
        "routine": routine.name,
        **_serialize_workout(workout),
    }
