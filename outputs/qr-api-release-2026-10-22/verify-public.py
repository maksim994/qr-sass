import json
from pathlib import Path
import urllib.request
import urllib.error

origin = 'https://qr-s.ru'
out = []
def request(path, method='GET', expected=200):
    req = urllib.request.Request(origin+path, method=method, headers={'User-Agent':'QR-S-release-check', **({'Content-Type':'application/json'} if method in ('POST','PATCH') else {})}, data=b'{}' if method in ('POST','PATCH') else None)
    try:
        response = urllib.request.urlopen(req, timeout=15)
    except urllib.error.HTTPError as exc:
        response = exc
    body = response.read()
    assert response.status == expected, (method, path, response.status)
    if path.startswith('/api/v1/qr'):
        assert 'no-store' in response.headers.get('Cache-Control','')
        assert json.loads(body)['code'] == 'UNAUTHORIZED'
    out.append({'method':method,'path':path,'status':response.status,'cacheControl':response.headers.get('Cache-Control')})
    return body

spec = json.loads(request('/api/v1/openapi.json'))
assert spec['info']['version']=='1.5.0'
for path in ['/api/v1/qr','/api/v1/qr/key','/api/v1/qr/{id}','/api/v1/qr/{id}/image','/api/v1/qr/{id}/stats','/api/v1/articles']:
    assert path in spec['paths'], path
for path in ['/api/v1/qr','/api/v1/qr/key','/api/v1/qr/nonexistent','/api/v1/qr/nonexistent/image','/api/v1/qr/nonexistent/stats?from=2026-10-01&to=2026-10-22']:
    request(path,expected=401)
request('/api/v1/qr',method='POST',expected=401)
request('/api/v1/qr/nonexistent',method='PATCH',expected=401)
for path in ['/','/pricing','/privacy-policy','/register','/verify-email','/reset-password']:
    body = request(path)
    if path=='/pricing': assert 'QR API'.encode() in body
    if path=='/privacy-policy': assert b'2026-10-21.3' in body
    if path in ('/verify-email','/reset-password'):
        assert b'mc.yandex.ru/metrika/tag.js' not in body
        assert b'vk.com/js/api/openapi' not in body
Path(__file__).with_name('public-checks.json').write_text(json.dumps({'ok':True,'checks':out,'schemaVersion':spec['info']['version']},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'ok':True,'publicHttpChecks':len(out),'schemaVersion':spec['info']['version']}))
