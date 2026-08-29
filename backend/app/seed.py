"""
Seeds the exercise library.

Idempotent by design: safe to re-run against a database that already has
users, routines, and logged sessions in it. Muscle groups/muscles are
get-or-created, and exercises are only inserted if no exercise with that
exact name exists yet - so running this again after adding new exercises
to EXERCISES tops up the library without touching anyone's existing data
or WorkoutExercise references (which point at Exercise.id).
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

# name, youtube_url, muscle, movement_pattern, equipment, is_compound, joint_action, plane
EXERCISES = [
    # --- Triceps (existing) ---
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

    # --- Upper back (existing + more) ---
    ("1-Arm Cable Row", "https://www.youtube.com/shorts/ToB7xHrTjpA", "upper_back", "Horizontal Row", "Cable", True, "Horizontal Pull", "Sagittal"),
    ("Cable Row (Wide Grip)", "https://www.youtube.com/watch?v=yGVxPIqSHQE", "upper_back", "Horizontal Row", "Cable", False, "Horizontal Pull", "Sagittal"),
    ("Seated Cable Row", None, "upper_back", "Horizontal Row", "Cable", True, "Horizontal Pull", "Sagittal"),
    ("T-Bar Row", None, "upper_back", "Horizontal Row", "Barbell", True, "Horizontal Pull", "Sagittal"),
    ("Chest-Supported Row", None, "upper_back", "Horizontal Row", "Machine", True, "Horizontal Pull", "Sagittal"),
    ("Barbell Bent-Over Row", None, "upper_back", "Horizontal Row", "Barbell", True, "Horizontal Pull", "Sagittal"),

    # --- Traps (existing + more) ---
    ("Barbell Shrug", "https://youtu.be/CQDTdasj9BA", "traps", "Shrug", "Barbell", False, "Scapular Elevation", "Frontal"),
    ("Dumbbell Shrug", None, "traps", "Shrug", "Dumbbell", False, "Scapular Elevation", "Frontal"),
    ("Cable Shrug", None, "traps", "Shrug", "Cable", False, "Scapular Elevation", "Frontal"),

    # --- Lats ---
    ("Pull-Up", None, "lats", "Vertical Pull", "Bodyweight", True, "Vertical Pull", "Sagittal"),
    ("Chin-Up", None, "lats", "Vertical Pull", "Bodyweight", True, "Vertical Pull", "Sagittal"),
    ("Lat Pulldown", None, "lats", "Vertical Pull", "Cable", True, "Vertical Pull", "Sagittal"),
    ("Close-Grip Pulldown", None, "lats", "Vertical Pull", "Cable", True, "Vertical Pull", "Sagittal"),
    ("Straight-Arm Pulldown", None, "lats", "Shoulder Extension", "Cable", False, "Shoulder Extension", "Sagittal"),
    ("Dumbbell Pullover", None, "lats", "Pullover", "Dumbbell", False, "Shoulder Extension", "Sagittal"),
    ("Single-Arm Dumbbell Row", None, "lats", "Horizontal Row", "Dumbbell", True, "Horizontal Pull", "Sagittal"),

    # --- Spinal erectors ---
    ("Back Extension", None, "spinal_erectors", "Hyperextension", "Bodyweight", False, "Spinal Extension", "Sagittal"),
    ("Weighted Back Extension", None, "spinal_erectors", "Hyperextension", "Other", False, "Spinal Extension", "Sagittal"),
    ("Good Morning", None, "spinal_erectors", "Hinge", "Barbell", True, "Hip Hinge", "Sagittal"),
    ("Conventional Deadlift", None, "spinal_erectors", "Hinge", "Barbell", True, "Hip Hinge", "Sagittal"),

    # --- Chest ---
    ("Barbell Bench Press", None, "chest", "Press", "Barbell", True, "Horizontal Push", "Sagittal"),
    ("Flat Dumbbell Press", None, "chest", "Press", "Dumbbell", True, "Horizontal Push", "Sagittal"),
    ("Machine Chest Press", None, "chest", "Press", "Machine", True, "Horizontal Push", "Sagittal"),
    ("Chest Dip", None, "chest", "Dip", "Bodyweight", True, "Horizontal Push", "Sagittal"),
    ("Flat Dumbbell Fly", None, "chest", "Fly", "Dumbbell", False, "Horizontal Adduction", "Transverse"),
    ("Cable Crossover", None, "chest", "Fly", "Cable", False, "Horizontal Adduction", "Transverse"),
    ("Pec Deck", None, "chest", "Fly", "Machine", False, "Horizontal Adduction", "Transverse"),
    ("Push-Up", None, "chest", "Press", "Bodyweight", True, "Horizontal Push", "Sagittal"),

    # --- Upper pec ---
    ("Incline Barbell Press", None, "upper_pec", "Incline Press", "Barbell", True, "Incline Push", "Sagittal"),
    ("Incline Dumbbell Press", None, "upper_pec", "Incline Press", "Dumbbell", True, "Incline Push", "Sagittal"),
    ("Incline Machine Press", None, "upper_pec", "Incline Press", "Machine", True, "Incline Push", "Sagittal"),
    ("Low-to-High Cable Fly", None, "upper_pec", "Fly", "Cable", False, "Incline Adduction", "Transverse"),

    # --- Front delt ---
    ("Seated Barbell Overhead Press", None, "front_delt", "Overhead Press", "Barbell", True, "Shoulder Flexion", "Sagittal"),
    ("Standing Dumbbell Overhead Press", None, "front_delt", "Overhead Press", "Dumbbell", True, "Shoulder Flexion", "Sagittal"),
    ("Machine Shoulder Press", None, "front_delt", "Overhead Press", "Machine", True, "Shoulder Flexion", "Sagittal"),
    ("Front Raise", None, "front_delt", "Raise", "Dumbbell", False, "Shoulder Flexion", "Sagittal"),
    ("Cable Front Raise", None, "front_delt", "Raise", "Cable", False, "Shoulder Flexion", "Sagittal"),

    # --- Side delt ---
    ("Dumbbell Lateral Raise", None, "side_delt", "Raise", "Dumbbell", False, "Shoulder Abduction", "Frontal"),
    ("Cable Lateral Raise", None, "side_delt", "Raise", "Cable", False, "Shoulder Abduction", "Frontal"),
    ("Machine Lateral Raise", None, "side_delt", "Raise", "Machine", False, "Shoulder Abduction", "Frontal"),
    ("Upright Row", None, "side_delt", "Row", "Barbell", False, "Shoulder Abduction", "Frontal"),

    # --- Rear delt ---
    ("Reverse Pec Deck", None, "rear_delt", "Reverse Fly", "Machine", False, "Horizontal Abduction", "Transverse"),
    ("Bent-Over Dumbbell Rear Raise", None, "rear_delt", "Reverse Fly", "Dumbbell", False, "Horizontal Abduction", "Transverse"),
    ("Face Pull", None, "rear_delt", "Face Pull", "Cable", False, "Horizontal Abduction", "Transverse"),
    ("Cable Reverse Fly", None, "rear_delt", "Reverse Fly", "Cable", False, "Horizontal Abduction", "Transverse"),

    # --- Biceps ---
    ("Barbell Curl", None, "biceps", "Curl", "Barbell", False, "Elbow Flexion", "Sagittal"),
    ("Dumbbell Curl", None, "biceps", "Curl", "Dumbbell", False, "Elbow Flexion", "Sagittal"),
    ("Incline Dumbbell Curl", None, "biceps", "Curl", "Dumbbell", False, "Elbow Flexion", "Sagittal"),
    ("Cable Curl", None, "biceps", "Curl", "Cable", False, "Elbow Flexion", "Sagittal"),
    ("Preacher Curl", None, "biceps", "Curl", "Machine", False, "Elbow Flexion", "Sagittal"),
    ("Concentration Curl", None, "biceps", "Curl", "Dumbbell", False, "Elbow Flexion", "Sagittal"),

    # --- Brachialis ---
    ("Hammer Curl", None, "brachialis", "Curl", "Dumbbell", False, "Elbow Flexion", "Sagittal"),
    ("Cross-Body Hammer Curl", None, "brachialis", "Curl", "Dumbbell", False, "Elbow Flexion", "Sagittal"),
    ("Reverse-Grip Curl", None, "brachialis", "Curl", "Barbell", False, "Elbow Flexion", "Sagittal"),
    ("Rope Hammer Curl", None, "brachialis", "Curl", "Cable", False, "Elbow Flexion", "Sagittal"),

    # --- Forearms ---
    ("Wrist Curl", None, "forearms", "Wrist Curl", "Dumbbell", False, "Wrist Flexion", "Sagittal"),
    ("Reverse Wrist Curl", None, "forearms", "Wrist Curl", "Dumbbell", False, "Wrist Extension", "Sagittal"),
    ("Farmer's Carry", None, "forearms", "Carry", "Dumbbell", True, "Grip", "Sagittal"),

    # --- Quads ---
    ("Barbell Back Squat", None, "quads", "Squat", "Barbell", True, "Knee Extension", "Sagittal"),
    ("Front Squat", None, "quads", "Squat", "Barbell", True, "Knee Extension", "Sagittal"),
    ("Leg Press", None, "quads", "Squat", "Machine", True, "Knee Extension", "Sagittal"),
    ("Hack Squat", None, "quads", "Squat", "Machine", True, "Knee Extension", "Sagittal"),
    ("Bulgarian Split Squat", None, "quads", "Lunge", "Dumbbell", True, "Knee Extension", "Sagittal"),
    ("Walking Lunge", None, "quads", "Lunge", "Dumbbell", True, "Knee Extension", "Sagittal"),
    ("Leg Extension", None, "quads", "Extension", "Machine", False, "Knee Extension", "Sagittal"),

    # --- Hamstrings ---
    ("Romanian Deadlift", None, "hamstrings", "Hinge", "Barbell", True, "Hip Hinge", "Sagittal"),
    ("Stiff-Leg Deadlift", None, "hamstrings", "Hinge", "Dumbbell", True, "Hip Hinge", "Sagittal"),
    ("Lying Leg Curl", None, "hamstrings", "Curl", "Machine", False, "Knee Flexion", "Sagittal"),
    ("Seated Leg Curl", None, "hamstrings", "Curl", "Machine", False, "Knee Flexion", "Sagittal"),
    ("Nordic Curl", None, "hamstrings", "Curl", "Bodyweight", False, "Knee Flexion", "Sagittal"),

    # --- Glutes ---
    ("Barbell Hip Thrust", None, "glutes", "Thrust", "Barbell", True, "Hip Extension", "Sagittal"),
    ("Glute Bridge", None, "glutes", "Thrust", "Bodyweight", True, "Hip Extension", "Sagittal"),
    ("Cable Glute Kickback", None, "glutes", "Kickback", "Cable", False, "Hip Extension", "Sagittal"),
    ("Sumo Deadlift", None, "glutes", "Hinge", "Barbell", True, "Hip Extension", "Sagittal"),
    ("Hip Abduction Machine", None, "glutes", "Abduction", "Machine", False, "Hip Abduction", "Frontal"),

    # --- Calves ---
    ("Standing Calf Raise", None, "calves", "Calf Raise", "Machine", False, "Ankle Plantarflexion", "Sagittal"),
    ("Seated Calf Raise", None, "calves", "Calf Raise", "Machine", False, "Ankle Plantarflexion", "Sagittal"),
    ("Leg Press Calf Raise", None, "calves", "Calf Raise", "Machine", False, "Ankle Plantarflexion", "Sagittal"),
    ("Donkey Calf Raise", None, "calves", "Calf Raise", "Machine", False, "Ankle Plantarflexion", "Sagittal"),

    # --- Abs ---
    ("Cable Crunch", None, "abs", "Crunch", "Cable", False, "Spinal Flexion", "Sagittal"),
    ("Hanging Leg Raise", None, "abs", "Leg Raise", "Bodyweight", False, "Hip Flexion", "Sagittal"),
    ("Ab Wheel Rollout", None, "abs", "Rollout", "Other", True, "Spinal Flexion", "Sagittal"),
    ("Machine Crunch", None, "abs", "Crunch", "Machine", False, "Spinal Flexion", "Sagittal"),
    ("Sit-Up", None, "abs", "Crunch", "Bodyweight", False, "Spinal Flexion", "Sagittal"),

    # --- Obliques ---
    ("Cable Woodchopper", None, "obliques", "Rotation", "Cable", False, "Trunk Rotation", "Transverse"),
    ("Russian Twist", None, "obliques", "Rotation", "Other", False, "Trunk Rotation", "Transverse"),
    ("Side Plank", None, "obliques", "Plank", "Bodyweight", False, "Lateral Flexion", "Frontal"),
    ("Hanging Oblique Raise", None, "obliques", "Leg Raise", "Bodyweight", False, "Lateral Flexion", "Frontal"),
]


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    muscle_by_name = {m.name: m for m in db.query(Muscle).all()}
    group_by_name = {g.name: g for g in db.query(MuscleGroup).all()}

    for group_name, muscle_names in MUSCLE_GROUPS.items():
        group = group_by_name.get(group_name)
        if group is None:
            group = MuscleGroup(name=group_name)
            db.add(group)
            db.flush()
            group_by_name[group_name] = group
        for muscle_name in muscle_names:
            if muscle_name not in muscle_by_name:
                muscle = Muscle(name=muscle_name, muscle_group_id=group.id)
                db.add(muscle)
                db.flush()
                muscle_by_name[muscle_name] = muscle

    pattern_by_name = {p.name: p for p in db.query(MovementPattern).all()}

    def get_pattern(name):
        if name not in pattern_by_name:
            pattern = MovementPattern(name=name)
            db.add(pattern)
            db.flush()
            pattern_by_name[name] = pattern
        return pattern_by_name[name]

    existing_exercise_names = {e.name for e in db.query(Exercise.name).all()}
    added = 0

    for name, url, muscle, pattern_name, equipment, is_compound, joint_action, plane in EXERCISES:
        if name in existing_exercise_names:
            continue
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
        added += 1

    db.commit()
    db.close()
    print(f"Seed complete: {len(MUSCLE_GROUPS)} muscle groups checked, {added} new exercises added "
          f"({len(EXERCISES) - added} already existed).")


if __name__ == "__main__":
    run()
