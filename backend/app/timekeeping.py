from datetime import datetime
from zoneinfo import ZoneInfo
import os

def today():
    return datetime.now(ZoneInfo(os.getenv('TZ', 'America/Bogota'))).date()
