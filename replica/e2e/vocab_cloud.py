# Vocabulary against a fake Supabase: rows of cf_vocab / cf_vocab_lessons / cf_vocab_sets, sync into cf_lessons.terms (hand-typed entries kept), duplicates, tables missing.
import json, os, sys, datetime, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5222),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5222/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
CLASSES=[{'id':'c-7b','name':'7B'}]; LESSONS=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
import uuid
TERMS={}; LINKS=[]; SETS={}; LES={'l-1':{'id':'l-1','title':'Циклдер','subject':'Информатика','terms':[{'term':'қолдан','definition':'қолмен жазылған'}]},'l-2':{'id':'l-2','title':'Массивтер','subject':'Информатика','terms':[]}}
LOG={'terms':[],'lessonpatch':[],'sets':[]}; MODE={'v':'ok','dup':False}
def flt(qs,col):
    v=(qs.get(col) or [''])[0]
    if v.startswith('eq.'): return [v[3:]]
    if v.startswith('in.('): return v[4:-1].split(',')
    return None
def stub(r):
    q=r.request; u=urlparse(q.url); qs=parse_qs(u.query); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    if name=='profiles': return out(ME)
    if name=='classes': return out(CLASSES)
    if name in ('cf_vocab','cf_vocab_lessons','cf_vocab_sets') and MODE['v']=='missing': return out({'code':'PGRST205','message':f"Could not find the table 'public.{name}' in the schema cache"},404)
    if name=='cf_lessons':
        ids=flt(qs,'id')
        if q.method=='PATCH': d=json.loads(q.post_data); LOG['lessonpatch'].append((ids[0],d)); LES[ids[0]].update(d); return r.fulfill(status=204,headers=h)
        rows=[LES[i] for i in ids if i in LES] if ids else list(LES.values())
        if one: return out(rows[0]) if rows else out(None)
        return out(rows)
    if name=='cf_vocab':
        ids=flt(qs,'id')
        if q.method=='GET': return out([t for t in TERMS.values() if not ids or t['id'] in ids])
        if q.method=='POST':
            d=json.loads(q.post_data); d=d if isinstance(d,list) else [d]; LOG['terms'].extend(d)
            for x in d:
                if MODE['dup'] or any(t['kk'].lower()==x['kk'].lower() for t in TERMS.values()): return out({'code':'23505','message':'duplicate key'},409)
            for x in d: x.setdefault('id',str(uuid.uuid4())); TERMS[x['id']]=x
            return r.fulfill(status=201,headers=h,body='')
        if q.method=='PATCH': TERMS[ids[0]].update(json.loads(q.post_data)); return r.fulfill(status=204,headers=h)
        if q.method=='DELETE':
            TERMS.pop(ids[0],None); LINKS[:]=[l for l in LINKS if l['term_id']!=ids[0]]; return r.fulfill(status=204,headers=h)
    if name=='cf_vocab_lessons':
        les=flt(qs,'lesson_id'); tm=flt(qs,'term_id')
        if q.method=='GET': return out([l for l in LINKS if (not les or l['lesson_id'] in les) and (not tm or l['term_id'] in tm)])
        if q.method=='POST': d=json.loads(q.post_data); LINKS.extend(d if isinstance(d,list) else [d]); return r.fulfill(status=201,headers=h,body='')
        if q.method=='DELETE': LINKS[:]=[l for l in LINKS if not ((not les or l['lesson_id'] in les) and (not tm or l['term_id'] in tm))]; return r.fulfill(status=204,headers=h)
    if name=='cf_vocab_sets':
        if q.method=='GET': return out(list(SETS.values()))
        if q.method=='POST':
            d=json.loads(q.post_data); d=d if isinstance(d,list) else [d]; LOG['sets'].extend(d)
            for x in d: SETS[x['id']]=x
            return r.fulfill(status=201,headers=h,body='')
        if q.method=='DELETE': SETS.pop(flt(qs,'id')[0],None); return r.fulfill(status=204,headers=h)
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u: stub(r)
    else: r.abort()
def status(pg): return pg.locator('[role=status]').first.inner_text()
with sync_playwright() as p:
    b=p.chromium.launch()
    def page():
        c=b.new_context(viewport={'width':1440,'height':900}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
        pg=c.new_page(); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    def add(A,kk,ru='',en='',de=''):
        A.locator('label:has-text("Қазақша") ~ input').first.fill(kk); A.locator('label:has-text("Орысша") ~ input').first.fill(ru); A.locator('label:has-text("Ағылшынша") ~ input').first.fill(en); A.locator('label:has-text("Анықтама") ~ input').first.fill(de)
        A.click('form button:text-is("Қосу")')
    A=page(); A.goto(B+'#vocab/base'); A.wait_for_selector('h1:text-is("Терминдер базасы")'); A.wait_for_selector('text=Әзірге термин жоқ')
    ok('C1 tables exist: no browser-only note', A.locator('[role=note]').count()==0)
    add(A,'цикл','цикл','loop','Қайталау'); A.wait_for_selector('li:has-text("цикл")')
    add(A,'массив','массив','array'); A.wait_for_selector('li:has-text("массив")')
    t=LOG['terms'][0]
    ok('C2 term row carries owner and school, trimmed fields', t['owner_id']=='t-1' and t['school_id']=='sc' and t['kk']=='цикл' and t['en']=='loop', str(t))
    add(A,'ЦИКЛ'); A.wait_for_selector('[role=status]:has-text("базада бар")'); ok('C3 server duplicate (23505) explained', len(TERMS)==2)
    # link
    A.goto(B+'#vocab/link'); A.wait_for_selector('h1:text-is("Тақырыпқа байлау")'); A.wait_for_selector('fieldset input[type=checkbox]')
    A.locator('fieldset label:has-text("цикл")').click(); A.locator('fieldset label:has-text("массив")').click(); A.click('button:text-is("Сақтау")'); A.wait_for_selector('[role=status]:has-text("сақталды")')
    ok('C4 two links written', len(LINKS)==2 and all(l['lesson_id']=='l-1' for l in LINKS), str(LINKS))
    terms=LES['l-1']['terms']
    ok('C5 lesson terms: hand-typed entry kept, base entries added with vid', terms[0]=={'term':'қолдан','definition':'қолмен жазылған'} and sorted(x['term'] for x in terms[1:])==['массив','цикл'] and all(x.get('vid') for x in terms[1:]), str(terms))
    ok('C5 entry carries translations', any(x['term']=='цикл' and x['definition']=='Қайталау · RU: цикл · EN: loop' for x in terms), str(terms))
    A.locator('fieldset label:has-text("массив")').click(); A.click('button:text-is("Сақтау")'); A.wait_for_selector('[role=status]:has-text("сақталды")')
    ok('C6 unlink removes only that base entry', [x['term'] for x in LES['l-1']['terms']]==['қолдан','цикл'], str(LES['l-1']['terms']))
    # edit propagates
    A.goto(B+'#vocab/base'); A.wait_for_selector('li:has-text("цикл")'); A.click('button[aria-label="цикл: өзгерту"]'); A.locator('label:has-text("Ағылшынша") ~ input').first.fill('cycle'); A.click('form button:text-is("Сақтау")'); A.wait_for_selector('[role=status]:has-text("өзгертілді")')
    ok('C7 editing a term updates the lesson entry', any('EN: cycle' in x.get('definition','') for x in LES['l-1']['terms']), str(LES['l-1']['terms']))
    A.click('button[aria-label="цикл: өшіру"]'); A.click('[role=alertdialog] button:text-is("Өшіру")'); A.wait_for_selector('[role=status]:has-text("өшірілді")')
    ok('C8 deleting a term removes it from the lesson, hand entry stays', [x['term'] for x in LES['l-1']['terms']]==['қолдан'] and len(LINKS)==0, str(LES['l-1']['terms']))
    # share
    A.goto(B+'#vocab/share'); A.wait_for_selector('h1:text-is("Тарату")'); A.wait_for_selector('fieldset input[type=checkbox]')
    A.fill('label:has-text("Жинақтың атауы") ~ input','Тест жинағы'); A.locator('fieldset:has(legend:text-is("Сыныптар")) label:has-text("7B")').click(); A.click('button:text-is("Сыныптарға тарату")'); A.wait_for_selector('[role=status]:has-text("берілді")')
    s=LOG['sets'][0]
    ok('C9 set row: owner, school, class, title, copied terms', s['owner_id']=='t-1' and s['school_id']=='sc' and s['class_id']=='c-7b' and s['title']=='Тест жинағы' and [x['kk'] for x in s['terms']]==['массив'], str(s))
    A.wait_for_selector('section[aria-label="Берілген жинақтар"] li:has-text("Тест жинағы")')
    A.click('button[aria-label="Тест жинағы (7B): өшіру"]'); A.click('[role=alertdialog] button:text-is("Өшіру")'); A.wait_for_selector('text=Әзірге ештеңе берілмеген'); ok('C10 set deleted', len(SETS)==0)
    # tables missing: falls back to the browser, says so
    MODE['v']='missing'; M=page(); M.goto(B+'#vocab/base'); M.wait_for_selector('[role=note]:has-text("011_vocab.sql")')
    ok('C11 missing tables: note names the SQL file, no crash', M.locator('[role=note]').count()==1 and M.locator('text=Қате').count()==0)
    add(M,'жол'); M.wait_for_selector('li:has-text("жол")'); ok('C11 term still can be added in the browser', M.locator('li:has-text("жол")').count()==1)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
