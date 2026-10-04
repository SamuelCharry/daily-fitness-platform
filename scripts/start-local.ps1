param([string]$OwnerEmail = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$taskPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (!(Test-Path $taskPython)) { throw 'Create .venv and install backend requirements first. See README.md.' }
$dbPath = Join-Path $projectRoot 'backend\fitness.db'
if (!$OwnerEmail -and (Test-Path $dbPath)) {
  $OwnerEmail = & $taskPython -c "import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); users=db.execute('select email from users order by id').fetchall(); print(users[0][0] if len(users)==1 else '')" $dbPath
}
if (!$OwnerEmail) { $OwnerEmail = 'owner@cool.local' }
$env:OWNER_EMAIL = $OwnerEmail
$env:PERSONAL_MODE = 'true'
$env:TZ = 'America/Bogota'
$env:STATIC_DIR = Join-Path $projectRoot 'frontend\dist'
$env:DATABASE_URL = 'sqlite:///' + $dbPath.Replace('\', '/')
Push-Location (Join-Path $projectRoot 'backend')
try {
  & $taskPython -m app.seed
  & $taskPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000
} finally { Pop-Location }
