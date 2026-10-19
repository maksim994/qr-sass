"""Read-only SSR checks against the local review server; never writes to a database."""
import json, re, sys, urllib.request, urllib.error, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
BASE='http://localhost:3108'
LANDINGS=['qr-dlya-otzyvov-yandex-karty','qr-na-pdf','qr-dlya-vizitki','dynamic-qr','qr-dlya-telegram','qr-menu','qr-wifi','qr-dlya-otzyvov-2gis','qr-po-ssylke','qr-dlya-whatsapp','qr-dlya-max']
REDIRECTS={
 'staticheskiy-i-dinamicheskiy-qr-kod-dlya-oplaty-raznitsa':'qr-kod-oplata-sbp',
 'staticheskiy-qr-kod-kak-sozdat-i-primenyat':'dinamicheskij-i-staticheskij-qr-kod-raznica',
 'dinamicheskiy-qr-kod-v-chem-otlichie-ot-staticheskogo-i-chto-vybrat':'dinamicheskij-i-staticheskij-qr-kod-raznica',
 'vidy-qr-kodov-staticheskie-dinamicheskie-i-ih-primenenie-v-biznese':'dinamicheskij-i-staticheskij-qr-kod-raznica'}
class Page(HTMLParser):
 def __init__(self):super().__init__();self.h1=0;self.meta={};self.canonical=None;self.scripts=[];self.script=False;self.current='';self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href')
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='script' and a.get('type')=='application/ld+json':self.script=True;self.current=''
 def handle_data(self,data):
  if self.script:self.current+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.script:self.scripts.append(json.loads(self.current));self.script=False
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect)
def get(path):
 try:
  with opener.open(BASE+path,timeout=40) as r:return r.status,r.read().decode(),dict(r.headers)
 except urllib.error.HTTPError as r:return r.code,r.read().decode(),dict(r.headers)
def fail(message):raise AssertionError(message)
rows=[]
for slug in LANDINGS:
 path='/'+slug;status,html,headers=get(path);p=Page();p.feed(html)
 assert status==200,(path,status)
 assert p.h1==1,(path,'H1',p.h1)
 assert p.canonical==BASE+path,(path,p.canonical)
 assert p.meta.get('description'),(path,'missing description')
 graph=[x for s in p.scripts for x in s.get('@graph',[s])]
 faq=next(x for x in graph if x.get('@type')=='FAQPage')
 assert len(faq['mainEntity'])>=6,path
 assert any(x.get('@type')=='BreadcrumbList' for x in graph),path
 assert '<form' in html and 'PNG' in html and 'SVG' in html,path
 rows.append({'path':path,'status':status,'h1':p.h1,'faq':len(faq['mainEntity']),'canonical':p.canonical})
for path in ['/','/pricing','/qr-for-packaging','/qr-for-events','/qr-for-agencies','/bulk-qr-generator','/qr-code-analytics','/blog/razmer-qr-koda-dlya-pechati','/blog/qr-kod-dlya-vkontakte','/blog/dinamicheskij-i-staticheskij-qr-kod-raznica','/blog/qr-kod-oplata-sbp']:
 status,html,headers=get(path);p=Page();p.feed(html)
 assert status==200 and p.h1==1,(path,status,p.h1)
 if path=='/pricing':assert not any(x in html for x in ['workspace','Белой метки нет','До 1 участников'])
 if path=='/blog/razmer-qr-koda-dlya-pechati':assert 'print-size-title' in html and '<table' in html
 if path=='/blog/qr-kod-dlya-vkontakte':assert 'article-generator' in html
 rows.append({'path':path,'status':status,'h1':p.h1})
for source,target in REDIRECTS.items():
 status,html,headers=get('/blog/'+source)
 assert status==301,(source,status)
 assert headers.get('Location',headers.get('location','')).endswith('/blog/'+target),(source,headers)
 rows.append({'path':'/blog/'+source,'status':status,'location':headers.get('Location',headers.get('location'))})
status,xml,headers=get('/sitemap.xml');assert status==200
urls=[e.text for e in ET.fromstring(xml).findall('.//{*}loc')]
assert all(BASE+'/'+slug in urls for slug in LANDINGS)
assert all(BASE+'/blog/'+slug not in urls for slug in REDIRECTS)
assert len(urls)==len(set(urls))
for image in ['link','wifi','vcard','design','download']:
 with urllib.request.urlopen(BASE+'/images/guides/'+image+'.webp') as r:assert r.status==200
result={'base':BASE,'checked':rows,'sitemapCount':len(urls),'allPassed':True}
out=Path('outputs/tz-03-local-2026-10-19/seo-contract-checks.json');out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'pages':len(rows),'sitemapUrls':len(urls),'allPassed':True}))
