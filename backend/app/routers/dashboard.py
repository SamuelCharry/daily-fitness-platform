import math
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_db
from ..models import (
    BodyStat,
    Exercise,
    Routine,
    SetLog,
    User,
    UserProfile,
    Workout,
    WorkoutExercise,
    WorkoutSession,
)

router = APIRouter(prefix="/api", tags=["dashboard"])

# Rough anterior/posterior split for the strength-map body view toggle.
# A muscle can appear in both views if it's commonly trained/seen from either side.
FRONT_MUSCLES = {
    "chest", "upper_pec", "front_delt", "side_delt", "biceps", "brachialis",
    "forearms", "quads", "abs", "obliques",
}
BACK_MUSCLES = {
    "rear_delt", "triceps", "lats", "upper_back", "traps", "spinal_erectors",
    "hamstrings", "glutes", "calves", "forearms",
}


def _navy_body_fat(sex: str, height_cm: float, waist: float, neck: float, hip: Optional[float]) -> Optional[float]:
    if not height_cm or not waist or not neck:
        return None
    try:
        if sex == "female":
            if not hip:
                return None
            denom = 1.29579 - 0.35004 * math.log10(waist + hip - neck) + 0.22100 * math.log10(height_cm)
        else:
            denom = 1.0324 - 0.19077 * math.log10(waist - neck) + 0.15456 * math.log10(height_cm)
        return round(495 / denom - 450, 1)
    except (ValueError, ZeroDivisionError):
        return None


def _deurenberg_body_fat(sex: str, weight_kg: float, height_cm: float, age: Optional[int]) -> Optional[float]:
    if not weight_kg or not height_cm or age is None:
        return None
    bmi = weight_kg / ((height_cm / 100) ** 2)
    sex_factor = 1 if sex == "male" else 0
    return round(1.20 * bmi + 0.23 * age - 10.8 * sex_factor - 5.4, 1)


def _ffmi(weight_kg: float, height_cm: float, body_fat_pct: Optional[float]) -> Optional[float]:
    if not weight_kg or not height_cm or body_fat_pct is None:
        return None
    height_m = height_cm / 100
    fat_free_mass = weight_kg * (1 - body_fat_pct / 100)
    ffmi = fat_free_mass / (height_m ** 2)
    normalized = ffmi + 6.1 * (1.8 - height_m)
    return round(normalized, 1)


def _age_from_birthdate(birthdate) -> Optional[int]:
    if not birthdate:
        return None
    today = date.today()
    return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))


@router.get("/dashboard")
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    latest = (
        db.query(BodyStat)
        .filter(BodyStat.user_id == current_user.id)
        .order_by(BodyStat.date.desc())
        .first()
    )

    since = date.today() - timedelta(weeks=8)
    trend = (
        db.query(BodyStat)
        .filter(BodyStat.user_id == current_user.id, BodyStat.date >= since, BodyStat.weight.isnot(None))
        .order_by(BodyStat.date)
        .all()
    )
    bodyweight_trend = [{"date": s.date, "weight": s.weight} for s in trend]

    body_fat_pct = None
    ffmi = None
    if latest and profile and profile.height_cm:
        if latest.body_fat_manual is not None:
            body_fat_pct = latest.body_fat_manual
        else:
            body_fat_pct = _navy_body_fat(profile.sex, profile.height_cm, latest.waist, latest.neck, latest.hip)
        if latest.weight:
            ffmi = _ffmi(latest.weight, profile.height_cm, body_fat_pct)

    body_fat_methods = {"navy": None, "deurenberg": None, "inbody": None}
    if latest and profile and profile.height_cm:
        body_fat_methods["navy"] = _navy_body_fat(profile.sex, profile.height_cm, latest.waist, latest.neck, latest.hip)
        body_fat_methods["deurenberg"] = _deurenberg_body_fat(
            profile.sex, latest.weight, profile.height_cm, _age_from_birthdate(profile.birthdate)
        )
        body_fat_methods["inbody"] = latest.body_fat_manual

    # Adherence: % of the last 14 days that have a logged body stat entry.
    two_weeks_ago = date.today() - timedelta(days=14)
    logged_days = (
        db.query(BodyStat)
        .filter(BodyStat.user_id == current_user.id, BodyStat.date >= two_weeks_ago)
        .count()
    )
    adherence_pct = round(min(logged_days, 14) / 14 * 100)

    today_workout = None
    active_routine = (
        db.query(Routine).filter(Routine.user_id == current_user.id, Routine.is_active.is_(True)).first()
    )
    if active_routine:
        workouts = (
            db.query(Workout)
            .filter(Workout.routine_id == active_routine.id)
            .order_by(Workout.day_index)
            .all()
        )
        if workouts:
            idx = date.today().toordinal() % len(workouts)
            w = workouts[idx]
            today_workout = {
                "id": w.id,
                "name": w.name,
                "exercise_count": len(w.exercises),
                "routine_name": active_routine.name,
            }

    performance = _performance_trends(current_user, db)

    return {
        "weight": latest.weight if latest else None,
        "sleep_minutes": latest.sleep_minutes if latest else None,
        "steps": latest.steps if latest else None,
        "bodyweight_trend": bodyweight_trend,
        "today_workout": today_workout,
        "body_fat_pct": body_fat_pct,
        "body_fat_methods": body_fat_methods,
        "ffmi": ffmi,
        "adherence_pct": adherence_pct,
        "phase": profile.current_phase if profile else None,
        "phase_start_date": profile.phase_start_date if profile else None,
        "performance": performance,
    }


def _week_volume_and_top_set(user: User, db: Session, start: date, end: date):
    sets = (
        db.query(SetLog)
        .join(WorkoutSession)
        .join(Workout)
        .join(Routine)
        .filter(Routine.user_id == user.id, WorkoutSession.date >= start, WorkoutSession.date < end)
        .all()
    )
    volume = sum((s.weight or 0) * (s.reps or 0) for s in sets)
    top_set = max((s.weight or 0 for s in sets), default=0)
    session_count = (
        db.query(WorkoutSession)
        .join(Workout)
        .join(Routine)
        .filter(Routine.user_id == user.id, WorkoutSession.date >= start, WorkoutSession.date < end)
        .count()
    )
    return volume, top_set, session_count


def _trend_arrow(this_week: float, last_week: float) -> str:
    if this_week > last_week:
        return "↑"
    if this_week < last_week:
        return "↓"
    return "→"


def _performance_trends(user: User, db: Session):
    today = date.today()
    this_week_start = today - timedelta(days=7)
    last_week_start = today - timedelta(days=14)

    this_volume, this_top, this_sessions = _week_volume_and_top_set(user, db, this_week_start, today)
    last_volume, last_top, last_sessions = _week_volume_and_top_set(user, db, last_week_start, this_week_start)

    return [
        {"label": "Strength", "trend": _trend_arrow(this_top, last_top)},
        {"label": "Volume", "trend": _trend_arrow(this_volume, last_volume)},
        {"label": "Consistency", "trend": _trend_arrow(this_sessions, last_sessions)},
    ]


@router.get("/strength-map")
def strength_map(
    view: str = "front", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    latest = (
        db.query(BodyStat)
        .filter(BodyStat.user_id == current_user.id, BodyStat.weight.isnot(None))
        .order_by(BodyStat.date.desc())
        .first()
    )
    if latest is None or not latest.weight:
        return {"muscles": [], "note": "Log a bodyweight entry to see relative strength."}

    bodyweight = latest.weight
    best_by_muscle = {}

    sets = (
        db.query(SetLog, WorkoutExercise)
        .join(WorkoutExercise, SetLog.workout_exercise_id == WorkoutExercise.id)
        .join(WorkoutSession, SetLog.session_id == WorkoutSession.id)
        .join(Workout, WorkoutSession.workout_id == Workout.id)
        .join(Routine, Workout.routine_id == Routine.id)
        .filter(Routine.user_id == current_user.id, SetLog.weight.isnot(None))
        .all()
    )
    for set_log, workout_exercise in sets:
        exercise = db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
        if exercise is None:
            continue
        muscle_name = exercise.muscle.name
        best_by_muscle[muscle_name] = max(best_by_muscle.get(muscle_name, 0), set_log.weight or 0)

    allowed = FRONT_MUSCLES if view == "front" else BACK_MUSCLES
    muscles = []
    for muscle_name, best_weight in best_by_muscle.items():
        if muscle_name not in allowed:
            continue
        ratio = min(best_weight / bodyweight, 1.5) / 1.5  # cap display at 1.5x bodyweight
        muscles.append({"label": muscle_name.replace("_", " ").title(), "ratio": round(ratio, 2), "pct": f"{round(ratio * 100)}%"})

    muscles.sort(key=lambda m: m["ratio"], reverse=True)
    return {"muscles": muscles}
