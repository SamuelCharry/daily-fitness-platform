# Execution plan

1. Preserve existing records and training API; audit current flows.
2. Replace the brand, palette, navigation and dashboard with Cool for the Summer.
3. Ship a daily spreadsheet with editable dated rows, validation, explicit save state and CSV export.
4. Make workouts, weight trend and preparation reachable from the dashboard; persist preparation goals on the server.
5. Provide optional single-user access and a protected, persistent Docker deployment.
6. Build, lint, test critical persistence/access flows, and inspect desktop and mobile views.

Completed: steps 1–4 and local single-user access, protected deployment configuration, persistent storage and backup tooling. Existing data preserved with a SQLite backup. Spreadsheet block paste, session recovery and responsive views verified in a disposable database.

Verification: production frontend build passes; lint has no errors (8 warnings); 7 integration tests pass; desktop/mobile review completed. Compose configuration validates, but Docker image execution remains unverified because the local engine did not respond.

Pending: remote deployment requires the owner's hosting account. Recommended starter: Railway Hobby ($5 monthly minimum with $5 usage included, possible overage). No remote service is running yet. Container startup and persistence must be checked on the chosen host before importing the user's database.
