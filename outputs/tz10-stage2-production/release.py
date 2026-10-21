"""Run on the existing Coolify host; private data stays under /var/lib only."""
import ast
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess as sp
import sys
import time
import urllib.request

os.umask(0o077)
PRIOR = pathlib.Path('/var/lib/qr-s-release/20261021-tz10')
spec = importlib.util.spec_from_file_location('prior_release', PRIOR / 'release.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
m.R = pathlib.Path('/var/lib/qr-s-release/20261021-tz10-public')
m.R.mkdir(mode=0o700, exist_ok=True)
m.SHA = 'b3a929d'
m.NET = 'qr-tz10-public-isolated'
m.PG = 'qr-tz10-public-postgres'
m.QA = 'qr-tz10-public-candidate'
m.S3 = 'qr-tz10-public-s3'
m.IMAGE = 'qr-tz10-public:b3a929d'
m.BUILDER = 'qr-tz10-public-builder:b3a929d'
m.DB = 'postgresql://postgres:isolated-public-copy@' + m.PG + ':5432/qr_tz10'

# Store per-row hashes privately; allow legitimate new records during release.
SNAP = """import{PrismaClient}from'@prisma/client';import{createHash}from'node:crypto';const db=new PrismaClient(),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');let out={};for(const model of ['user','workspace','membership','subscription','payment','uploadedFile','blogPost','blogRedirect','blogApiToken','blogRevision','blogPendingRevision']){let rows=await db[model].findMany({orderBy:{id:'asc'}});out[model]=Object.fromEntries(rows.map(({views,likes,...row})=>[row.id,hash(row)]));}console.log(JSON.stringify(out));await db.$disconnect();"""

def compare_data(name, exact=False):
    before = json.loads((m.R / 'data-before.json').read_text())
    after = json.loads((m.R / name).read_text())
    for model, rows in before.items():
        if exact:
            assert rows == after[model], 'Restored table differs: ' + model
        else:
            assert all(after[model].get(k) == v for k, v in rows.items()), 'Original rows changed: ' + model
    return {model: len(rows) for model, rows in after.items()}

def capture():
    assert not (m.R / 'capture.ok').exists(), 'Do not overwrite baseline'
    app, pg = m.live(), m.live('postgres-')
    info = m.info(app)
    cfg = dict(x.split('=', 1) for x in info['Config']['Env'])
    assert cfg['SOURCE_COMMIT'].startswith('a6fa101')
    assert cfg['APP_URL'].rstrip('/') == 'https://qr-s.ru'
    (m.R / 'runtime-before.json').write_text(json.dumps(info))
    (m.R / 'pg-before.json').write_text(json.dumps(m.info(pg)))
    (m.R / 'rollback-image').write_text(info['Image'])
    m.d('tag', info['Image'], 'qr-s-rollback:tz10-public-20261021')
    for src, dst in [('last-success.json', 'backup-success.json'), ('last-restore-test.json', 'backup-restore.json')]:
        shutil.copy(pathlib.Path('/var/lib/qr-s-backup') / src, m.R / dst)
    m.d('exec', pg, 'pg_dump', '-U', 'postgres', '-d', 'qr_saas', '-Fc', file='database.dump')
    m.d('exec', app, 'node', 'scripts/verify-qr-health.mjs', '--snapshot', file='qr-before.json')
    m.js(app, SNAP, 'data-before.json')
    m.js(app, m.HTTP, 'http-before.json')
    qr = json.loads((m.R / 'qr-before.json').read_text())
    result = {'ok': True, 'qrCount': qr['totals']['qrCodes'], 'users': qr['totals']['users'], 'contracts': len(json.loads((m.R / 'http-before.json').read_text())), 'dumpBytes': (m.R / 'database.dump').stat().st_size}
    (m.R / 'capture.ok').write_text(json.dumps(result))
    print(json.dumps(result), flush=True)

def prepare():
    assert (m.R / 'capture.ok').exists()
    source = m.R / 'source'
    source.mkdir(exist_ok=True)
    urllib.request.urlretrieve('https://codeload.github.com/maksim994/qr-sass/tar.gz/' + m.SHA, m.R / 'source.tar.gz')
    m.run(['tar', '-xzf', str(m.R / 'source.tar.gz'), '--strip-components=1', '-C', str(source)])
    print('Building candidate image', flush=True)
    m.d('build', '-t', m.IMAGE, str(source), file='build.log')
    m.d('build', '--target', 'builder', '-t', m.BUILDER, str(source), file='build-builder.log')
    print('Mirroring public media read-only', flush=True)
    tree = ast.parse((PRIOR / 'release.py').read_text())
    mirror = next(n.value.value for n in ast.walk(tree) if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'mirror' for t in n.targets))
    m.js(m.live(), mirror, 'media-fixtures.json')
    m.d('network', 'create', '--internal', m.NET)
    m.d('run', '-d', '--name', m.PG, '--network', m.NET, '--tmpfs', '/var/lib/postgresql/data:rw,size=536870912', '-e', 'POSTGRES_PASSWORD=isolated-public-copy', '-e', 'POSTGRES_DB=qr_tz10', 'postgres:16-alpine')
    m.waitpg()
    m.d('exec', '-i', m.PG, 'pg_restore', '-U', 'postgres', '-d', 'qr_tz10', '--no-owner', '--no-privileges', '--exit-on-error', data=(m.R / 'database.dump').read_bytes(), file='restore.log')
    print('Restored dump; running migration runner on isolated copy', flush=True)
    m.d('run', '--rm', '--network', m.NET, '-e', 'DATABASE_URL=' + m.DB, m.BUILDER, 'node', 'scripts/migrate-deploy.mjs', file='migrate.log')
    m.d('run', '-d', '--name', m.S3, '--network', m.NET, '-v', str(m.R) + ':/release:ro', '-e', 'BLOG_TEST_S3=synthetic-only', '-e', 'BLOG_TEST_S3_SEED=/release/media-fixtures.json', '-e', 'HOSTNAME=0.0.0.0', '-e', 'PORT=55439', m.BUILDER, 'node', 'scripts/test-blog-s3.mjs')
    env = {'DATABASE_URL': m.DB, 'JWT_SECRET': m.JWT, 'APP_URL': 'https://qr-s.ru/', 'YANDEX_AUTH_ENABLED': 'false', 'S3_ENDPOINT': 'http://' + m.S3 + ':55439', 'S3_PUBLIC_URL': 'http://' + m.S3 + ':55439', 'S3_BUCKET': 'fixture', 'S3_ACCESS_KEY_ID': 'synthetic', 'S3_SECRET_ACCESS_KEY': 'synthetic', 'S3_REGION': 'ru1', 'S3_PUBLIC_OMIT_BUCKET': 'true'}
    flags = [x for k, v in env.items() for x in ['-e', k + '=' + v]]
    m.d('run', '-d', '--name', m.QA, '--network', m.NET, *flags, m.IMAGE)
    for _ in range(60):
        p = sp.run(['docker', 'exec', m.QA, 'node', '-e', "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], stdout=sp.DEVNULL, stderr=sp.DEVNULL)
        if p.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Candidate failed health check')
    m.js(m.QA, SNAP, 'data-copy.json')
    compare_data('data-copy.json', exact=True)
    m.d('exec', '-i', m.QA, 'node', 'scripts/verify-qr-health.mjs', '--compare', '-', data=(m.R / 'qr-before.json').read_bytes(), file='qr-copy.json')
    m.js(m.QA, m.HTTP, 'http-copy.json', {'QA_HTTP_ORIGIN': 'http://127.0.0.1:3000'})
    assert json.loads((m.R / 'http-copy.json').read_text()) == json.loads((m.R / 'http-before.json').read_text()), 'HTTP contract differs'
    old = (m.R / 'rollback-image').read_text()
    m.d('run', '--rm', '--network', m.NET, '-e', 'DATABASE_URL=' + m.DB, '-e', 'APP_URL=https://qr-s.ru/', '-i', old, 'node', 'scripts/verify-qr-health.mjs', '--compare', '-', data=(m.R / 'qr-before.json').read_bytes(), file='rollback-copy.json')
    result = {'ok': True, 'candidate': m.SHA, 'restoredMigrationRunner': True, 'dataExact': True, 'qrPreserved': json.loads((m.R / 'qr-before.json').read_text())['totals']['qrCodes'], 'httpContracts': len(json.loads((m.R / 'http-copy.json').read_text())), 'rollbackCompatible': True}
    (m.R / 'prepare.ok').write_text(json.dumps(result))
    print(json.dumps(result), flush=True)

def post():
    assert (m.R / 'prepare.ok').exists()
    app, pg = m.live(), m.live('postgres-')
    current = m.info(app)
    before = json.loads((m.R / 'runtime-before.json').read_text())
    cfg = dict(x.split('=', 1) for x in current['Config']['Env'])
    prev = dict(x.split('=', 1) for x in before['Config']['Env'])
    assert cfg['SOURCE_COMMIT'].startswith(m.SHA)
    assert cfg['APP_URL'] == prev['APP_URL']
    pg_before = json.loads((m.R / 'pg-before.json').read_text())
    assert [(v['Source'], v['Destination']) for v in pg_before['Mounts']] == [(v['Source'], v['Destination']) for v in m.info(pg)['Mounts']]
    m.d('exec', '-i', app, 'node', 'scripts/verify-qr-health.mjs', '--compare', '-', data=(m.R / 'qr-before.json').read_bytes(), file='qr-after.json')
    m.js(app, SNAP, 'data-after.json')
    counts = compare_data('data-after.json')
    m.js(app, m.HTTP, 'http-after.json')
    assert json.loads((m.R / 'http-after.json').read_text()) == json.loads((m.R / 'http-before.json').read_text()), 'Production HTTP contract differs'
    result = {'ok': True, 'candidate': cfg['SOURCE_COMMIT'], 'counts': counts, 'qrPreserved': True, 'mountsPreserved': True, 'appUrlExact': True, 'httpContracts': len(json.loads((m.R / 'http-after.json').read_text()))}
    (m.R / 'post.ok').write_text(json.dumps(result))
    print(json.dumps(result), flush=True)

if __name__ == '__main__':
    {'capture': capture, 'prepare': prepare, 'post': post}[sys.argv[1]]()
