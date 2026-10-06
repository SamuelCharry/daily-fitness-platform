"""One-time publication of the creator's explicitly authorized PPL × UL routine.

Copy only programming settings. No email, private comments, sessions or logs enter
the template. Later personal edits never silently change the published snapshot.
"""
import hashlib
import json
import re

from .models import PublishedRoutineTemplate, Routine, User

KEY = 'creator-ppl-ul'
CREATOR_DIGEST = '9db69961a1524a4c676ea4792fc4b222ea39ab654393a1dfa202e0a932caadbd'


def capture_creator_template(db, creator_digest=CREATOR_DIGEST):
    if db.get(PublishedRoutineTemplate, KEY):
        return
    creator = next((u for u in db.query(User.id, User.email).all()
                    if hashlib.sha256(u.email.strip().lower().encode()).hexdigest() == creator_digest), None)
    if creator is None:
        return
    candidates = [r for r in db.query(Routine).filter(Routine.user_id == creator.id).all()
                  if re.sub(r'[^a-z]', '', r.name.lower()) in ('pplxul', 'pplul', 'pushpulllegs') and r.workouts]
    active = [r for r in candidates if r.is_active]
    candidates = active or candidates
    if len(candidates) != 1:
        return  # Do not guess which private routine the creator intended.
    workouts = []
    for w in candidates[0].workouts:
        exercises = []
        for e in w.exercises:
            if e.retired:
                continue
            exercises.append({field: getattr(e, field) for field in (
                'exercise_id', 'order_index', 'target_sets', 'rep_range_min', 'rep_range_max',
                'rir_target', 'rest_seconds')})
        workouts.append({'name': w.name, 'day_index': w.day_index, 'weekday': w.weekday, 'exercises': exercises})
    if not any(w['exercises'] for w in workouts):
        return
    db.add(PublishedRoutineTemplate(key=KEY, payload=json.dumps({'name': 'PPL × UL', 'workouts': workouts})))
    db.flush()
