from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    routines = relationship("Routine", back_populates="user")
    body_stats = relationship("BodyStat", back_populates="user")


class UserProfile(Base):
    """One-time-ish setup data needed for FFMI / body-fat formulas."""
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    height_cm = Column(Float)
    sex = Column(String)  # "male" | "female" - drives which body-fat formula variant runs
    birthdate = Column(Date)
    current_phase = Column(String, default="maintain")  # "cut" | "maintain" | "bulk"
    phase_start_date = Column(Date)

    user = relationship("User", back_populates="profile")


class MuscleGroup(Base):
    __tablename__ = "muscle_groups"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # Chest, Back, Legs...

    muscles = relationship("Muscle", back_populates="muscle_group")


class Muscle(Base):
    __tablename__ = "muscles"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # upper_pec, front_delt...
    muscle_group_id = Column(Integer, ForeignKey("muscle_groups.id"), nullable=False)

    muscle_group = relationship("MuscleGroup", back_populates="muscles")


class MovementPattern(Base):
    __tablename__ = "movement_patterns"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)  # Horizontal Row, Shrug...


class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    equipment = Column(String)  # Barbell, Cable, Dumbbell, Machine, Bodyweight...
    is_compound = Column(Boolean, default=False)
    youtube_url = Column(String)
    joint_action = Column(String)  # Elbow Extension, Horizontal Pull, Shoulder Abduction...
    plane = Column(String)  # Sagittal, Frontal, Transverse
    muscle_id = Column(Integer, ForeignKey("muscles.id"), nullable=False)
    movement_pattern_id = Column(Integer, ForeignKey("movement_patterns.id"))

    muscle = relationship("Muscle")
    movement_pattern = relationship("MovementPattern")


class Routine(Base):
    """A program variant owned by a user, e.g. 'Scharryt 4 times'. Only one should be active per user."""
    __tablename__ = "routines"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)

    user = relationship("User", back_populates="routines")
    workouts = relationship("Workout", back_populates="routine", order_by="Workout.day_index")


class Workout(Base):
    """A day template within a routine, e.g. 'Upper', 'Push'."""
    __tablename__ = "workouts"
    id = Column(Integer, primary_key=True)
    routine_id = Column(Integer, ForeignKey("routines.id"), nullable=False)
    name = Column(String, nullable=False)
    day_index = Column(Integer)  # order within the routine's week

    routine = relationship("Routine", back_populates="workouts")
    exercises = relationship(
        "WorkoutExercise", back_populates="workout", order_by="WorkoutExercise.order_index"
    )


class WorkoutExercise(Base):
    """An exercise's slot inside a workout day."""
    __tablename__ = "workout_exercises"
    id = Column(Integer, primary_key=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    order_index = Column(Integer, default=0)
    target_sets = Column(Integer)
    comments = Column(String)

    workout = relationship("Workout", back_populates="exercises")
    exercise = relationship("Exercise")


class WorkoutSession(Base):
    """An actual instance of performing a workout on a real date."""
    __tablename__ = "workout_sessions"
    id = Column(Integer, primary_key=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    date = Column(Date, nullable=False)
    finished_at = Column(DateTime(timezone=True))

    workout = relationship("Workout")
    sets = relationship("SetLog", back_populates="session")


class SetLog(Base):
    __tablename__ = "set_logs"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"), nullable=False)
    workout_exercise_id = Column(Integer, ForeignKey("workout_exercises.id"), nullable=False)
    set_number = Column(Integer, nullable=False)
    weight = Column(Float)
    reps = Column(Integer)
    rir = Column(Integer)

    session = relationship("WorkoutSession", back_populates="sets")
    workout_exercise = relationship("WorkoutExercise")


class BodyStat(Base):
    """Daily body tracking. Real dates only - nothing backfilled with guessed dates."""
    __tablename__ = "body_stats"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_body_stats_user_date"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    weight = Column(Float)
    waist = Column(Float)
    neck = Column(Float)
    hip = Column(Float)  # needed for the female Navy body-fat formula
    body_fat_manual = Column(Float)  # e.g. an InBody scan reading, entered by hand
    calories = Column(Float)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    steps = Column(Integer)
    sleep_minutes = Column(Integer)
    cardio_minutes = Column(Integer)
    on_diet = Column(Boolean)
    cheat_meal = Column(Boolean)
    notes = Column(String)

    user = relationship("User", back_populates="body_stats")
