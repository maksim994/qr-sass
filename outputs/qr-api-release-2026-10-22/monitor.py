import datetime
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parent
end = time.monotonic() + 3600
with (root / 'availability.jsonl').open('a', buffering=1) as stream:
    while time.monotonic() < end and not (root / 'stop-monitor').exists():
        at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        started = time.monotonic()
        error = None
        try:
            with urllib.request.urlopen('https://qr-s.ru/api/health', timeout=4) as response:
                status = response.status
        except urllib.error.HTTPError as exc:
            status, error = exc.code, 'HTTPError'
        except Exception as exc:
            status, error = 0, type(exc).__name__
        stream.write(json.dumps({'at': at, 'status': status, 'error': error, 'durationMs': round((time.monotonic()-started)*1000)}) + '\n')
        time.sleep(2)
