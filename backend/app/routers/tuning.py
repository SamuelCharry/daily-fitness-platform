import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import RoutineTuning, User
from .routines import _get_owned_routine, _serialize_routine

router = APIRouter(prefix="/api/routines", tags=["tuning"])


class Change(BaseModel):
    id: int
    target_sets: int = Field(ge=1, le=100)
    rest_seconds: int = Field(ge=30, le=600)


class Order(BaseModel):
    workout_id: int
    slot_ids: list[int]


class Adjustment(BaseModel):
    orders: list[Order] = Field(default_factory=list)
    expected: dict
    changes: list[Change] = Field(min_length=1, max_length=500)


def _lock(db):
    # Serialize read/compare/write against other SQLite writers.
    if db.bind.dialect.name == "sqlite":
        db.execute(text("BEGIN IMMEDIATE"))


@router.get("/{routine_id}/tuning")
def status(routine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    routine = _get_owned_routine(routine_id, user, db)
    saved = db.get(RoutineTuning, routine_id)
    return {"can_undo": bool(saved and json.loads(saved.after) == _serialize_routine(routine))}


@router.post("/{routine_id}/tuning")
def apply(routine_id: int, body: Adjustment, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _lock(db)
    routine = _get_owned_routine(routine_id, user, db)
    before = _serialize_routine(routine)
    if body.expected != before:
        raise HTTPException(409, "La rutina cambió. Actualiza la página y calcula otra vista previa.")
    slots = {e.id: e for w in routine.workouts for e in w.exercises if not e.retired}
    ids = [c.id for c in body.changes]
    if len(set(ids)) != len(ids) or any(i not in slots for i in ids):
        raise HTTPException(400, "El ajuste contiene ejercicios repetidos o ajenos a esta rutina.")
    workouts = {w.id: w for w in routine.workouts}
    if len({o.workout_id for o in body.orders}) != len(body.orders):
        raise HTTPException(400, "Días repetidos en el orden.")
    for order in body.orders:
        workout = workouts.get(order.workout_id)
        actual = {e.id for e in workout.exercises if not e.retired} if workout else set()
        if workout is None or len(set(order.slot_ids)) != len(order.slot_ids) or set(order.slot_ids) != actual:
            raise HTTPException(400, "El orden debe incluir exactamente los ejercicios del día.")
    for order in body.orders:
        for index, slot_id in enumerate(order.slot_ids):
            slots[slot_id].order_index = index
    for change in body.changes:
        slots[change.id].target_sets = change.target_sets
        slots[change.id].rest_seconds = change.rest_seconds
    after = _serialize_routine(routine)
    if before == after:
        return after
    saved = db.get(RoutineTuning, routine_id)
    if saved is None:
        saved = RoutineTuning(routine_id=routine_id)
        db.add(saved)
    saved.before, saved.after = json.dumps(before), json.dumps(after)
    db.commit()
    return after


@router.post("/{routine_id}/tuning/undo")
def undo(routine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _lock(db)
    routine = _get_owned_routine(routine_id, user, db)
    saved = db.get(RoutineTuning, routine_id)
    if not saved or json.loads(saved.after) != _serialize_routine(routine):
        raise HTTPException(409, "No se puede deshacer: la rutina cambió después del ajuste.")
    originals = {e['id']: e for w in json.loads(saved.before)['workouts'] for e in w['exercises']}
    for workout in routine.workouts:
        for slot in workout.exercises:
            if slot.id in originals:
                slot.target_sets = originals[slot.id]['target_sets']
                slot.rest_seconds = originals[slot.id]['rest_seconds']
                slot.order_index = originals[slot.id]['order_index']
    db.delete(saved)
    db.commit()
    return _serialize_routine(routine)
