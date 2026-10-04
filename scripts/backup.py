"""Consistent SQLite backup; works while the application is running."""
import argparse
import sqlite3
from pathlib import Path
from datetime import datetime
parser = argparse.ArgumentParser()
parser.add_argument('database', type=Path)
parser.add_argument('--output', type=Path, default=Path('backups'))
args = parser.parse_args()
if not args.database.is_file():
    parser.error('Database does not exist')
args.output.mkdir(parents=True, exist_ok=True)
destination = args.output / f'fitness-{datetime.now():%Y%m%d-%H%M%S-%f}.db'
with sqlite3.connect(f'{args.database.resolve().as_uri()}?mode=ro', uri=True) as source:
    with sqlite3.connect(destination) as target:
        source.backup(target)
print(f'Backup saved: {destination}')
