import html
import json
from pathlib import Path
import re
import urllib.request

results = []
paths = ['/', '/privacy-policy', '/personal-data-consent', '/login', '/register', '/register/yandex', '/pricing', '/skaner-qr-koda', '/qr-s-logotipom', '/api/health', '/verify-email?token=' + 'a'*64, '/reset-password?token=' + 'a'*64]
for path in paths:
    with urllib.request.urlopen('https://qr-s.ru' + path, timeout=20) as response:
        source = response.read().decode()
        assert response.status == 200, path
        text = html.unescape(re.sub('<[^>]+>', ' ', re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', source)))
        if path == '/privacy-policy':
            for value in ['2026-10-21.3', '30.06.2026', '«Бегет»', '«Яндекс»', '«РОБОКАССА»', '«ВК»', 'Вебвизор', 'first-touch', 'Служебные уведомления Telegram отключены']:
                assert value in text, value
            assert '01.01.2023' not in text
        if path == '/personal-data-consent':
            for value in ['2026-10-21.3', '«Бегет»', '«Яндекс»', '«РОБОКАССА»', '«ВК»']:
                assert value in text, value
        if path.startswith(('/verify-email', '/reset-password')):
            assert response.headers.get('Referrer-Policy') == 'no-referrer'
            assert 'no-store' in response.headers.get('Cache-Control', '')
            assert 'noindex' in response.headers.get('X-Robots-Tag', '')
        results.append({'path': path.split('?')[0], 'status': response.status})
Path(__file__).with_name('public-checks.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps({'ok': True, 'checks': len(results)}, ensure_ascii=False))
