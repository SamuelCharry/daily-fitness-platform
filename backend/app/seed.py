"""
Seeds real data inspected from the SISTEMA Google Sheet.

What's real here:
- Muscle taxonomy (major groups + specific muscles) - confirmed from the
  sheet's PROTOCOLS tables.
- The Triceps and Upper-Back exercise entries - copied directly from the
  exercise library rows, including their real YouTube links.

What's NOT here yet (see chat for why):
- The rest of the exercise library (only 2 of ~6+ muscle groups migrated).
- Which routine (3x/4x/5x/6x) is currently active - nothing is marked
  active until that's confirmed.
- BodyStat history - the sheet has no calendar dates, only relative
  "week N" counters, so nothing is backfilled with guessed dates.
"""

from .database import Base, SessionLocal, engine
from .models import Exercise, Muscle, MuscleGroup, MovementPattern

MUSCLE_GROUPS = {
    "Chest": ["chest", "upper_pec"],
    "Shoulder": ["front_delt", "side_delt", "rear_delt"],
    "Arms": ["triceps", "biceps", "brachialis", "forearms"],
    "Back": ["lats", "upper_back", "traps", "spinal_erectors"],
    "Legs": ["quads", "hamstrings", "glutes", "calves"],
    "Core": ["abs", "obliques"],
}

EXERCISES = [
    # name, youtube_url, muscle, movement_pattern, equipment, is_compound, joint_action, plane
    ("Cable Triceps Kickback", "https://youtu.be/FGJ64JyKod0", "triceps", "Kickback", "Cable", True, "Elbow Extension", "Sagittal"),
    ("Close-Grip Bench Press", "https://youtu.be/XnYH1RfVRKk", "triceps", "Close-Grip Press", "Barbell", False, "Elbow Extension", "Sagittal"),
    ("Close-Grip Dip", "https://youtu.be/G7bonPtkitM", "triceps", "Dip", "Bodyweight", False, "Elbow Extension", "Sagittal"),
    ("Overhead Cable Triceps Extension", "https://youtu.be/7GvY7yTEepM", "triceps", "Overhead Extension", "Cable", False, "Elbow Extension", "Sagittal"),
    ("Overhead DB Triceps Extension", "https://youtu.be/5KX0EjOTMaI", "triceps", "Overhead Extension", "Dumbbell", False, "Elbow Extension", "Sagittal"),
    ("Seated Dip Machine", "https://youtu.be/BRueufxDP2Q", "triceps", "Dip", "Machine", False, "Elbow Extension", "Sagittal"),
    ("Skull Crusher", "https://youtu.be/1n6xrEI5g0Q", "triceps", "Lying Extension", "Other", False, "Elbow Extension", "Sagittal"),
    ("Smith Machine JM Press", "https://youtu.be/WnhjBiezSa8", "triceps", "JM Press", "Smith Machine", False, "Elbow Extension", "Sagittal"),
    ("Straight Bar Cable Pushdown", None, "triceps", "Pressdown", "Cable", False, "Elbow Extension", "Sagittal"),
    ("Triceps Pressdown", "https://youtu.be/B5S2mbg0g5c", "triceps", "Pressdown", "Other", False, "Elbow Extension", "Sagittal"),
    ("1-Arm Cable Row", "https://www.youtube.com/shorts/ToB7xHrTjpA", "upper_back", "Horizontal Row", "Cable", True, "Horizontal Pull", "Sagittal"),
    ("Barbell Shrug", "https://youtu.be/CQDTdasj9BA", "traps", "Shrug", "Barbell", False, "Scapular Elevation", "Frontal"),
    ("Cable Row (Wide Grip)", "https://www.youtube.com/watch?v=yGVxPIqSHQE", "upper_back", "Horizontal Row", "Cable", False, "Horizontal Pull", "Sagittal"),
]


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(MuscleGroup).count() > 0:
        print("Already seeded, skipping.")
        db.close()
        return

    muscle_by_name = {}
    for group_name, muscle_names in MUSCLE_GROUPS.items():
        group = MuscleGroup(name=group_name)
        db.add(group)
        db.flush()
        for muscle_name in muscle_names:
            muscle = Muscle(name=muscle_name, muscle_group_id=group.id)
            db.add(muscle)
            db.flush()
            muscle_by_name[muscle_name] = muscle

    pattern_by_name = {}

    def get_pattern(name):
        if name not in pattern_by_name:
            pattern = MovementPattern(name=name)
            db.add(pattern)
            db.flush()
            pattern_by_name[name] = pattern
        return pattern_by_name[name]

    for name, url, muscle, pattern_name, equipment, is_compound, joint_action, plane in EXERCISES:
        db.add(
            Exercise(
                name=name,
                youtube_url=url,
                equipment=equipment,
                is_compound=is_compound,
                joint_action=joint_action,
                plane=plane,
                muscle_id=muscle_by_name[muscle].id,
                movement_pattern_id=get_pattern(pattern_name).id,
            )
        )

    db.commit()
    db.close()
    print(f"Seeded {len(MUSCLE_GROUPS)} muscle groups and {len(EXERCISES)} exercises.")


if __name__ == "__main__":
    run()
