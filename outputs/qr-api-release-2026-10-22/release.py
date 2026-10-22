"""Private server-side acceptance for the authorized night release."""
import ast
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess as sp
import sys
import time
import urllib.request

os.umask(0o077)
R = Path('/var/lib/qr-s-release/20261022-qr-api')
R.mkdir(mode=0o700, parents=True, exist_ok=True)
RESOURCE = 'o08skcsckso0o4o8o88ow08s'
SHA = 'c2d4b0b576cc8f525f77fb0fc357ebd5cd6010c4'
OLD = 'a4d6b13b72315ff135264b33091490182c278203'
IMAGE = 'qr-api-release:' + SHA[:7]
BUILDER = 'qr-api-release-builder:' + SHA[:7]
NET, PG, APP = 'qr-api-release-qa-20261022', 'qr-api-release-pg-20261022', 'qr-api-release-app-20261022'
DB = 'postgresql://postgres@' + PG + ':5432/qr_saas?schema=public'

SNAP = r"""
import{PrismaClient}from'@prisma/client';import{createHash}from'node:crypto';
const db=new PrismaClient(),out={};
try{for(const model of ['user','workspace','membership','subscription','payment','uploadedFile','blogPost','blogRedirect','blogApiToken','blogRevision','blogPendingRevision','legalAcceptance','qrCode','qrRevision','project','apiKey','userSignupSource']){
 const rows=await db[model].findMany().then(rows=>rows.sort((a,b)=>String(a.id??a.userId).localeCompare(String(b.id??b.userId))));
 out[model]=Object.fromEntries(rows.map(({views,likes,creationSource,...row})=>[row.id??row.userId,createHash('sha256').update(JSON.stringify(row)).digest('hex')]));
}console.log(JSON.stringify(out));}finally{await db.$disconnect();}
"""
HTTP = r"""
import{PrismaClient}from'@prisma/client';import{createHash}from'node:crypto';
import{needsHostedPage}from'./src/lib/qr-content.ts';import{requiredConsentVersion}from'./src/lib/qr-consent.ts';
const db=new PrismaClient(),out=[],hash=s=>createHash('sha256').update(s).digest('hex');
try{const rows=await db.qrCode.findMany({where:{isArchived:false,shortCode:{not:null},passwordHash:null,maxScans:null,OR:[{expireAt:null},{expireAt:{gt:new Date()}}]},orderBy:{id:'asc'}});
for(const q of rows){
 const prefix=q.contentType==='VCARD'?'v':needsHostedPage(q.contentType)?'p':q.kind==='DYNAMIC'&&q.contentType==='URL'?'r':null;
 if(!prefix||q.payload?.trackingPixels)continue;
 const cookie=`gdpr_qr_${q.shortCode}=${requiredConsentVersion(q.payload??{})}; ab_variant_${q.shortCode}=A`;
 for(const route of prefix==='r'?[prefix,'g']:[prefix]){
  const response=await fetch(`http://127.0.0.1:3000/${route}/${q.shortCode}`,{redirect:'manual',headers:{Cookie:cookie,'User-Agent':'QR-S-release-acceptance'}});
  const html=await response.text();let content=null;
  if(route==='r'){if(![302,307].includes(response.status)||!response.headers.get('location'))throw new Error('Redirect contract');}
  else if(route==='v'){if(response.status!==200||!html.includes('BEGIN:VCARD'))throw new Error('vCard contract');content=hash(html);}
  else if(route==='p'){if(response.status!==200)throw new Error('Hosted contract');const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]??html;content=hash(main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());}
  else if(![200,307].includes(response.status))throw new Error('Gate contract');
  out.push({id:q.id,type:q.contentType,route,status:response.status,location:response.headers.get('location'),content});
 }
}console.log(JSON.stringify(out));}finally{await db.$disconnect();}
"""
FILES = r"""
import{PrismaClient}from'@prisma/client';const db=new PrismaClient(),out=[];
try{const files=await db.uploadedFile.findMany().then(rows=>rows.sort((a,b)=>String(a.id??a.userId).localeCompare(String(b.id??b.userId)))),base=new URL(process.env.S3_PUBLIC_URL);
for(const f of files){let url;try{url=new URL(f.url);}catch{continue;}if(url.protocol!=='https:'||url.host!==base.host)continue;
const r=await fetch(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});
if(!r.ok)throw new Error('Existing uploaded file unavailable');out.push({id:f.id,url:url.href,status:r.status,etag:r.headers.get('etag'),length:r.headers.get('content-length')});}
console.log(JSON.stringify(out));}finally{await db.$disconnect();}
"""

def run(args, file=None, data=None):
    p = sp.run(args, input=data, stdout=sp.PIPE, stderr=sp.PIPE)
    if file: (R / file).write_bytes(p.stdout + p.stderr)
    if p.returncode:
        (R/'last-command-error.log').write_bytes(p.stdout+p.stderr)
        raise RuntimeError('Command failed; private diagnostics: ' + str(file or args[:2]))
    return p.stdout

def d(*args, **kw): return run(['docker', *args], **kw)
def info(name): return json.loads(d('inspect', name))[0]
def live(service='app'):
    names=d('ps','--format','{{.Names}}').decode().splitlines()
    found=[n for n in names if n.startswith(service+'-'+RESOURCE+'-')]
    assert len(found)==1, 'Expected one live service: '+service
    return found[0]
def js(app, source, file):
    result=d('exec','-i',app,'node','--experimental-strip-types','--import','./scripts/register-src-alias.mjs','--input-type=module',data=source.encode())
    (R/file).write_bytes(result)
    return json.loads(result)
def flags(env): return [x for k,v in env.items() for x in ['-e',k+'='+v]]
def waitpg():
    for _ in range(60):
        if sp.run(['docker','exec',PG,'pg_isready','-U','postgres'],stdout=sp.DEVNULL,stderr=sp.DEVNULL).returncode==0:return
        time.sleep(1)
    raise RuntimeError('Isolated PostgreSQL unavailable')
def waitapp():
    for _ in range(75):
        if sp.run(['docker','exec',APP,'node','-e',"fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],stdout=sp.DEVNULL,stderr=sp.DEVNULL).returncode==0:return
        time.sleep(1)
    raise RuntimeError('Isolated app unavailable')
def compare_rows(name, exact=False):
    before=json.loads((R/'rows-before.json').read_text());after=json.loads((R/name).read_text())
    for model,rows in before.items():
        assert (rows==after[model] if exact else all(after[model].get(k)==v for k,v in rows.items())), 'Original rows changed: '+model
    return {model:len(rows) for model,rows in after.items()}
def clean():
    for n in [APP,PG]:sp.run(['docker','rm','-f',n],stdout=sp.DEVNULL,stderr=sp.DEVNULL)
    sp.run(['docker','network','rm',NET],stdout=sp.DEVNULL,stderr=sp.DEVNULL)

def capture():
    assert not (R/'capture.ok').exists(), 'Never overwrite original baseline'
    app,pg,redis=live(),live('postgres'),live('redis')
    before=[info(n) for n in [app,pg,redis]]
    cfg=dict(s.split('=',1) for s in before[0]['Config']['Env'] if '=' in s)
    assert cfg.get('SOURCE_COMMIT')==OLD and cfg['APP_URL']=='https://qr-s.ru/'
    (R/'runtime-before.json').write_text(json.dumps(before))
    d('tag',before[0]['Image'],'qr-s-rollback:qr-api-20261022')
    print('Starting encrypted backup and restore verification',flush=True)
    run(['systemctl','start','qr-s-backup.service'],file='backup-start.log')
    run(['systemctl','start','qr-s-backup-verify.service'],file='backup-verify-start.log')
    for src in ['last-success.json','last-restore-test.json']:
        shutil.copyfile(Path('/var/lib/qr-s-backup')/src,R/src)
    (R/'database.dump').write_bytes(d('exec',pg,'pg_dump','-U','postgres','-d','qr_saas','-Fc'))
    (R/'qr-before.json').write_bytes(d('exec',app,'node','scripts/verify-qr-health.mjs','--snapshot'))
    js(app,SNAP,'rows-before.json')
    finish_capture()

def finish_capture():
    assert not (R/'capture.ok').exists()
    assert (R/'rows-before.json').exists() and (R/'database.dump').exists()
    app=live();http=js(app,HTTP,'http-before.json');files=js(app,FILES,'files-before.json')
    qr=json.loads((R/'qr-before.json').read_text())
    result={'ok':True,'oldSha':OLD,'qr':qr['totals'],'httpContracts':len(http),'files':len(files),'dumpBytes':(R/'database.dump').stat().st_size}
    (R/'capture.ok').write_text(json.dumps(result));print(json.dumps(result),flush=True)

def prepare():
    assert (R/'capture.ok').exists()
    source=R/'source';source.mkdir(exist_ok=True)
    urllib.request.urlretrieve('https://codeload.github.com/maksim994/qr-sass/tar.gz/'+SHA,R/'source.tar.gz')
    run(['tar','-xzf',str(R/'source.tar.gz'),'--strip-components=1','-C',str(source)])
    print('Building runner and builder candidate',flush=True)
    d('build','-t',IMAGE,str(source),file='build.log')
    d('build','--target','builder','-t',BUILDER,str(source),file='build-builder.log')
    before=json.loads((R/'runtime-before.json').read_text())
    oldenv=dict(x.split('=',1) for x in before[0]['Config']['Env'] if '=' in x)
    env={'DATABASE_URL':DB,'JWT_SECRET':'synthetic-isolated-qr-api-20261022-key','ADMIN_INTEGRATIONS_KEY':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','APP_URL':oldenv['APP_URL'],'YANDEX_AUTH_ENABLED':'false','S3_PUBLIC_URL':oldenv.get('S3_PUBLIC_URL','')}
    d('network','create','--internal',NET)
    try:
        d('run','-d','--name',PG,'--network',NET,'--memory','512m','--tmpfs','/var/lib/postgresql/data:rw,size=536870912','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=qr_saas',before[1]['Config']['Image'])
        waitpg()
        d('exec','-i',PG,'pg_restore','--exit-on-error','--no-owner','--no-acl','-U','postgres','-d','qr_saas',data=(R/'database.dump').read_bytes(),file='restore.log')
        d('run','--rm','--network',NET,*flags(env),BUILDER,'node','scripts/migrate-deploy.mjs',file='migrate.log')
        d('run','-d','--name',APP,'--network',NET,'--memory','768m',*flags(env),IMAGE)
        waitapp();js(APP,SNAP,'rows-copy.json');compare_rows('rows-copy.json',True)
        d('exec','-i',APP,'node','scripts/verify-qr-health.mjs','--compare','-','--json',data=(R/'qr-before.json').read_bytes(),file='qr-copy.json')
        js(APP,HTTP,'http-copy.json')
        assert json.loads((R/'http-copy.json').read_text())==json.loads((R/'http-before.json').read_text()), 'HTTP contract changed on copy'
        smoke_env = dict(env, RELEASE_TEST_APP_URL='http://' + APP + ':3000')
        smoke = d('run','--rm','--network',NET,*flags(smoke_env),'-v',str(R/'http-isolated.mjs')+':/app/scripts/test-qr-api-http-isolated.mjs:ro',BUILDER,'node','--experimental-strip-types','--import','./scripts/register-src-alias.mjs','scripts/test-qr-api-http-isolated.mjs',file='qr-api-http-copy.log')
        assert b'"ok":true' in smoke, 'New QR API HTTP acceptance failed'
        d('rm','-f',APP)
        d('run','-d','--name',APP,'--network',NET,'--memory','768m',*flags(env),before[0]['Image'])
        waitapp();d('exec','-i',APP,'node','scripts/verify-qr-health.mjs','--compare','-','--json',data=(R/'qr-before.json').read_bytes(),file='rollback-copy.json')
        js(APP,HTTP,'http-rollback.json')
        assert json.loads((R/'http-rollback.json').read_text())==json.loads((R/'http-before.json').read_text())
        qr=json.loads((R/'qr-before.json').read_text())['totals']['qrCodes']
        result={'ok':True,'sha':SHA,'qrPreserved':qr,'originalRowsExact':True,'httpContracts':len(json.loads((R/'http-copy.json').read_text())),'oldImageCompatible':True}
        (R/'prepare.ok').write_text(json.dumps(result));print(json.dumps(result),flush=True)
    finally:clean()

def post():
    assert (R/'prepare.ok').exists()
    names=[live(s) for s in ['app','postgres','redis']];current=[info(n) for n in names]
    before=json.loads((R/'runtime-before.json').read_text())
    cfg=lambda i:dict(x.split('=',1) for x in i['Config']['Env'] if '=' in x)
    old,new=cfg(before[0]),cfg(current[0]);assert new.get('SOURCE_COMMIT')==SHA
    keys=[k for k in old if k.startswith(('JWT_','S3_','YOOKASSA_','ROBOKASSA_','YANDEX_','SMTP_')) or k in ['APP_URL','DATABASE_URL','REDIS_URL','ADMIN_INTEGRATIONS_KEY','BILLING_PROVIDER','METRIKA_OAUTH_TOKEN','ANALYTICS_RETENTION_DAYS','TRUST_PROXY','TELEGRAM_BOT_TOKEN']]
    assert all(old[k]==new.get(k) for k in keys), 'Protected environment changed'
    mounts=lambda i:sorted((m['Type'],m['Source'],m['Destination']) for m in i['Mounts'])
    assert all(mounts(a)==mounts(b) for a,b in zip(before,current)), 'Mounts changed'
    (R/'runtime-after.json').write_text(json.dumps(current))
    d('exec','-i',names[0],'node','scripts/verify-qr-health.mjs','--compare','-','--json',data=(R/'qr-before.json').read_bytes(),file='qr-after.json')
    js(names[0],SNAP,'rows-after.json');counts=compare_rows('rows-after.json')
    js(names[0],HTTP,'http-after.json');js(names[0],FILES,'files-after.json')
    for prefix in ['http','files']:
        assert json.loads((R/(prefix+'-after.json')).read_text())==json.loads((R/(prefix+'-before.json')).read_text()), prefix+' contract changed'
    worker=info(live('email-worker'))
    assert worker['State']['Running']
    health=json.loads(d('exec',names[0],'node','scripts/email-health.mjs'))
    assert health['alive'] and health['failed']==0
    (R/'email-health.json').write_text(json.dumps(health))
    result={'ok':True,'sha':SHA,'qrPreserved':True,'counts':counts,'environmentUnchanged':True,'mountsUnchanged':True,'httpContracts':len(json.loads((R/'http-after.json').read_text())),'emailHealth':health}
    (R/'post.ok').write_text(json.dumps(result));print(json.dumps(result),flush=True)

if __name__=='__main__': {'capture':capture,'finish-capture':finish_capture,'prepare':prepare,'post':post,'clean':clean}[sys.argv[1]]()
