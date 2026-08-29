# Daily Fitness Platform - backend

## Run locally

    pip install -r requirements.txt
    python -m app.seed
    uvicorn app.main:app --reload

Then check http://127.0.0.1:8000/api/health and
http://127.0.0.1:8000/api/workouts/today
