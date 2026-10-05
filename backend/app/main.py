import os
import secrets
from pathlib import Path
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine, run_migrations
from .routers import auth, body_stats, dashboard, exercises, profile, routines, sessions, sync
from .auth import OWNER_EMAIL, PERSONAL_MODE, hash_password
from .database import SessionLocal
from .models import User

Base.metadata.create_all(bind=engine)
run_migrations()

with SessionLocal() as db:
    owner = db.query(User).filter(User.email == OWNER_EMAIL).first()
    if owner is None and (PERSONAL_MODE or os.getenv("OWNER_PASSWORD")):
        password = os.getenv("OWNER_PASSWORD") or secrets.token_urlsafe(32)
        if not PERSONAL_MODE and len(password) < 12:
            raise RuntimeError("OWNER_PASSWORD must contain at least 12 characters")
        db.add(User(email=OWNER_EMAIL, password_hash=hash_password(password)))
        db.commit()

app = FastAPI(title="Cool for the Summer")

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
app.include_router(sync.router)

# The production image serves both the SPA and API from the same origin.
static_dir = Path(os.getenv("STATIC_DIR", "/app/static"))
if static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        candidate = (static_dir / path).resolve()
        if candidate.is_relative_to(static_dir.resolve()) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(static_dir / "index.html")
