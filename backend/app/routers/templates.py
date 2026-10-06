import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..auth import get_current_user, get_db
from ..creator_template import KEY
from ..models import PublishedRoutineTemplate, Routine, User, Workout, WorkoutExercise
from .routines import _serialize_routine

router = APIRouter(prefix='/api/routine-templates', tags=['templates'])


@router.get('/creator')
def creator_template(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    template = db.get(PublishedRoutineTemplate, KEY)
    if not template:
        return None
    body = json.loads(template.payload)
    return {'key': KEY, 'name': body['name'], 'days': [w['name'] for w in body['workouts']],
            'label': 'Favorita del creador'}


@router.post('/creator/copy')
def copy_creator_template(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    template = db.get(PublishedRoutineTemplate, KEY)
    if not template:
        raise HTTPException(404, 'La plantilla del creador todavía no está publicada.')
    body = json.loads(template.payload)
    routine = Routine(user_id=user.id, name=body['name'], is_active=db.query(Routine).filter(Routine.user_id == user.id).count() == 0)
    db.add(routine)
    db.flush()
    for w in body['workouts']:
        workout = Workout(routine_id=routine.id, name=w['name'], day_index=w['day_index'], weekday=w['weekday'])
        db.add(workout)
        db.flush()
        for e in w['exercises']:
            db.add(WorkoutExercise(workout_id=workout.id, **e))
    db.commit()
    db.expire_all()
    return _serialize_routine(routine)
