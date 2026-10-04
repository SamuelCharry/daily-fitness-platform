"""Integration checks use a disposable database, never the owner's data."""
import os
import sys
import tempfile
import unittest
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'backend'))
temporary = tempfile.TemporaryDirectory()
database = Path(temporary.name) / 'test.db'
# Simulate an existing profile schema to verify additive migration.
with sqlite3.connect(database) as legacy:
    legacy.execute('CREATE TABLE user_profiles (id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL, height_cm FLOAT, sex VARCHAR, birthdate DATE, current_phase VARCHAR, phase_start_date DATE)')
legacy.close()
os.environ.update(DATABASE_URL=f'sqlite:///{database.as_posix()}', PERSONAL_MODE='false', APP_ENV='production', OWNER_EMAIL='test@example.com', OWNER_PASSWORD='test-only-password-123', JWT_SECRET='test-only-secret-for-isolated-database-123456', STATIC_DIR=str(root / 'frontend' / 'dist'), TZ='America/Bogota')
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine
from app.models import User
from app.auth import hash_password, create_access_token
from app.seed import run
from app.timekeeping import today

class PersistenceAndAccessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run()
        cls.client = TestClient(app)
        token = cls.client.post('/api/auth/login', data={'username': 'test@example.com', 'password': 'test-only-password-123'}).json()['access_token']
        cls.headers = {'Authorization': f'Bearer {token}'}

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        engine.dispose()
        temporary.cleanup()

    def test_access_and_registration(self):
        self.assertEqual(self.client.get('/api/body-stats').status_code, 401)
        self.assertEqual(self.client.get('/api/body-stats', headers={'Authorization': 'Bearer broken'}).status_code, 401)
        self.assertEqual(self.client.post('/api/auth/register', json={'email': 'other@example.com', 'password': 'password123'}).status_code, 403)
        self.assertEqual(self.client.post('/api/auth/login', data={'username': 'wrong@example.com', 'password': 'test-only-password-123'}).status_code, 401)
        self.assertFalse(self.client.get('/api/auth/config').json()['personal_mode'])

    def test_partial_row_update_preserves_existing_fields(self):
        date = str(today())
        self.assertEqual(self.client.post('/api/body-stats', headers=self.headers, json={'date': date, 'weight': 75.2, 'notes': 'kept', 'protein_g': 150}).status_code, 200)
        updated = self.client.post('/api/body-stats', headers=self.headers, json={'date': date, 'weight': 75.5}).json()
        self.assertEqual(updated['notes'], 'kept')
        self.assertEqual(updated['protein_g'], 150)
        self.assertEqual(updated['weight'], 75.5)
        self.client.post('/api/body-stats', headers=self.headers, json={'date': date, 'weight': None})
        rows = self.client.get('/api/body-stats', headers=self.headers).json()
        self.assertEqual(len([r for r in rows if r['date'] == date]), 1)
        self.assertIsNone(rows[-1]['weight'])

    def test_measurement_validation(self):
        for body in [{'weight': -5}, {'steps': -1}, {'sleep_minutes': 1441}, {'protein_g': -1}, {'body_fat_manual': 100}]:
            self.assertEqual(self.client.post('/api/body-stats', headers=self.headers, json={'date': str(today()), **body}).status_code, 422)

    def test_profile_migration_and_persistence(self):
        profile = {'goal_weight': 72.5, 'competition_date': '2027-04-01', 'target_calories': 2400, 'target_protein': 150, 'weekly_sessions': 4, 'preparation_notes': 'test block'}
        result = self.client.put('/api/profile', headers=self.headers, json=profile)
        self.assertEqual(result.status_code, 200)
        saved = self.client.get('/api/profile', headers=self.headers).json()
        for key, value in profile.items(): self.assertEqual(saved[key], value)
        self.assertEqual(self.client.put('/api/profile', headers=self.headers, json={'weekly_sessions': 0}).status_code, 422)

    def test_workout_resume_set_edit_and_history(self):
        routine = self.client.post('/api/routines', headers=self.headers, json={'name': 'Test routine'}).json()
        exercise = self.client.get('/api/exercises', headers=self.headers).json()[0]
        workout = self.client.post(f"/api/routines/{routine['id']}/workouts", headers=self.headers, json={'name': 'Test day', 'exercises': [{'exercise_id': exercise['id'], 'target_sets': 2}]}).json()
        session = self.client.post('/api/sessions', headers=self.headers, json={'workout_id': workout['id']}).json()
        resumed = self.client.post('/api/sessions', headers=self.headers, json={'workout_id': workout['id']}).json()
        self.assertEqual(session['id'], resumed['id'])
        with ThreadPoolExecutor(max_workers=4) as pool:
            ids = list(pool.map(lambda _: self.client.post('/api/sessions', headers=self.headers, json={'workout_id': workout['id']}).json()['id'], range(4)))
        self.assertEqual(set(ids), {session['id']})
        log = {'workout_exercise_id': workout['exercises'][0]['id'], 'set_number': 1, 'weight': 50, 'reps': 8, 'rir': 2}
        url = f"/api/sessions/{session['id']}/sets"
        self.assertEqual(self.client.post(url, headers=self.headers, json=log).status_code, 200)
        edited = self.client.post(url, headers=self.headers, json={**log, 'weight': 52.5}).json()
        self.assertEqual(len(edited['sets']), 1)
        self.assertEqual(edited['sets'][0]['weight'], 52.5)
        self.assertEqual(self.client.post(url, headers=self.headers, json={**log, 'reps': -1}).status_code, 422)
        self.assertEqual(self.client.post(f"/api/sessions/{session['id']}/finish", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post(url, headers=self.headers, json=log).status_code, 409)
        last = self.client.get(f"/api/sessions/last-sets/{workout['id']}", headers=self.headers).json()
        self.assertEqual(last[str(log['workout_exercise_id'])][0]['weight'], 52.5)

    def test_other_account_cannot_read_owner_records(self):
        with SessionLocal() as db:
            user = User(email='isolated@example.com', password_hash=hash_password('test-only-password-123'))
            db.add(user); db.commit(); db.refresh(user)
            token = create_access_token(user.id)
        headers = {'Authorization': f'Bearer {token}'}
        self.assertEqual(self.client.get('/api/body-stats', headers=headers).json(), [])
        self.assertEqual(self.client.get('/api/routines', headers=headers).json(), [])

    def test_spa_deep_links_and_api_404(self):
        self.assertEqual(self.client.get('/app/daily-log').status_code, 200)
        self.assertIn('Cool for the Summer', self.client.get('/app/preparation').text)
        self.assertEqual(self.client.get('/api/not-a-route').status_code, 404)

if __name__ == '__main__': unittest.main()
