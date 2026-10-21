import datetime
import json
from pathlib import Path
import time
import urllib.request

root = Path(__file__).resolve().parent
end = time.monotonic() + 3600
with (root / 'availability.jsonl').open('a', buffering=1) as stream:
    while time.monotonic() < end and not (root / 'stop-monitor').exists():
        at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        try:
            with urllib.request.urlopen('https://qr-s.ru/api/health', timeout=4) as response:
                status = response.status
        except Exception:
            status = 0
        stream.write(json.dumps({'at': at, 'status': status}) + '\n')
        time.sleep(2)
