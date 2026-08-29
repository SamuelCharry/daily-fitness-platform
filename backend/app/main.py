from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, run_migrations
from .routers import auth, body_stats, dashboard, exercises, profile, routines, sessions

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="Daily Fitness Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(exercises.router)
app.include_router(routines.router)
app.include_router(sessions.router)
app.include_router(body_stats.router)
app.include_router(dashboard.router)
