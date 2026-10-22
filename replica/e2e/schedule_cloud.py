# Schedule against a fake Supabase: rows of cf_timetable / cf_slots, starting a slot (rpc + link back), old 009 without session_id, table missing, errors.
import json, os, sys, datetime, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5218),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5218/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
CLASSES=[{'id':'c-7b','name':'7B'}]; LESSONS=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
ENT={}; SLOTS={}; LOG={'tt':[],'slots':[],'patch':[],'rpc':[],'gets':[]}; MODE={'v':'ok','rpc':'ok','dup':False}
t=datetime.date.today(); Y=t.year if t.month>=9 else t.year-1
def stub(r):
    q=r.request; u=urlparse(q.url); qs=parse_qs(u.query); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    idq=(qs.get('id') or [''])[0].replace('eq.','')
    if name=='profiles': return out(ME)
    if name=='classes': return out(CLASSES)
    if name=='cf_lessons': return out(LESSONS)
    if name=='cf_start_session':
        LOG['rpc'].append(json.loads(q.post_data))
        return out({'code':'P0001','message':'Сабақ табылмады'},400) if MODE['rpc']=='fail' else out({'id':'sess-1'})
    if name in ('cf_timetable','cf_slots') and MODE['v']=='missing': return out({'code':'PGRST205','message':f"Could not find the table 'public.{name}' in the schema cache"},404)
    if name=='cf_timetable':
        if q.method=='GET': return out(list(ENT.values()))
        if q.method=='POST': d=json.loads(q.post_data); LOG['tt'].append(d); ENT[d['id']]=d; return r.fulfill(status=201,headers=h,body='')
        if q.method=='DELETE': ENT.pop(idq,None); return r.fulfill(status=204,headers=h)
    if name=='cf_slots':
        if q.method=='GET':
            sel=(qs.get('select') or [''])[0]; LOG['gets'].append(sel)
            if MODE['v']=='nocol' and 'session_id' in sel: return out({'code':'42703','message':'column cf_slots.session_id does not exist'},400)
            rows=[s for s in SLOTS.values() if str(s['school_year'])==qs['school_year'][0].replace('eq.','') and str(s['quarter'])==qs['quarter'][0].replace('eq.','')]
            rows.sort(key=lambda s:(s['held_on'],s['period']))
            if MODE['v']=='nocol': rows=[{k:v for k,v in s.items() if k!='session_id'} for s in rows]
            return out(rows)
        if q.method=='POST':
            d=json.loads(q.post_data); LOG['slots'].append(json.loads(q.post_data))
            if MODE['dup']: return out({'code':'23505','message':'duplicate key value violates unique constraint'},409)
            for s in d: s.setdefault('session_id',None); SLOTS[s['id']]=s
            return r.fulfill(status=201,headers=h,body='')
        if q.method=='PATCH': d=json.loads(q.post_data); LOG['patch'].append((idq,d)); SLOTS[idq].update(d); return r.fulfill(status=204,headers=h)
        if q.method=='DELETE': SLOTS.pop(idq,None); return r.fulfill(status=204,headers=h)
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u: stub(r)
    else: r.abort()
URL=B+'#lessons/schedule'
def pick(pg,group,label): pg.locator(f'fieldset:has(input[name={group}]) label:has-text("{label}")').first.click()
def status(pg): return pg.locator('[role=status]').inner_text()
def summary(pg): return pg.locator('p:has-text("ұяшық ·")').inner_text()
def rangeset(pg,a,b): pg.fill('label:has-text("Бастап") ~ input',a); pg.fill('label:has-text("Дейін") ~ input',b)
N=sum(1 for d in range(1,31) if datetime.date(Y,9,d).weekday() in (1,4))
with sync_playwright() as p:
    b=p.chromium.launch()
    def page():
        c=b.new_context(viewport={'width':1440,'height':900}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
        pg=c.new_page(); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    A=page(); A.goto(URL); A.wait_for_selector('h1:has-text("КТП")'); A.wait_for_selector('text=Әзірге сабақ қосылмаған')
    ok('K1 tables exist: no "browser only" note, no demo note', A.locator('text=тек осы браузерде').count()==0 and A.locator('text=Демо режимде').count()==0)
    A.select_option('label:has-text("Күн") ~ select','2'); A.select_option('label:has-text("Сабақ нөмірі") ~ select','2'); A.click('button:text-is("Кестеге қосу")'); A.wait_for_selector('button[aria-label="Сс 2-сабақ 7B: өшіру"]')
    ok('K2 timetable row is the teacher\'s, in the teacher\'s school', len(LOG['tt'])==1 and LOG['tt'][0]['owner_id']=='t-1' and LOG['tt'][0]['school_id']=='sc' and LOG['tt'][0]['class_id']=='c-7b' and LOG['tt'][0]['weekday']==2 and LOG['tt'][0]['period']==2, str(LOG['tt']))
    pick(A,'quarter','1-тоқсан'); rangeset(A,f'{Y}-09-01',f'{Y}-09-30'); A.click('button:text-is("Ұяшықтарды құру")'); A.wait_for_selector('section[aria-label="1-апта"]')
    sent=LOG['slots'][0]
    ok('K3 slots sent in one request, owned, with year/quarter, without session_id', len(LOG['slots'])==1 and len(sent)==sum(1 for d in range(1,31) if datetime.date(Y,9,d).weekday()==1) and all(s['owner_id']=='t-1' and s['school_id']=='sc' and s['school_year']==Y and s['quarter']==1 and 'session_id' not in s and s['lesson_id'] is None for s in sent), str(sent[:1]))
    MODE['dup']=True; ENT_BACKUP=dict(ENT)
    A.select_option('label:has-text("Күн") ~ select','5'); A.select_option('label:has-text("Сабақ нөмірі") ~ select','4'); A.click('button:text-is("Кестеге қосу")'); A.wait_for_selector('button[aria-label="Жм 4-сабақ 7B: өшіру"]')
    A.click('button:text-is("Ұяшықтарды құру")'); A.wait_for_selector('[role=status]:has-text("басқа сыныптың")')
    ok('K4 a clash with another class is explained, nothing breaks', 'басқа сыныптың' in status(A) and A.locator('section[aria-label="1-апта"]').count()==1)
    MODE['dup']=False
    sel='select[aria-label="Сс 01.09, 2-сабақ: дәріс"]'
    ok('K5 "Бастау" is off while the slot has no lecture', A.locator('button[aria-label="01.09, 2-сабақ: бастау"]').is_disabled())
    A.select_option(sel,label='Циклдер'); A.wait_for_function("[...document.querySelectorAll('p')].some(p=>p.innerText.includes('дәріс қойылғаны: 1'))")
    first_id=[k for k,v in SLOTS.items() if v['held_on']==f'{Y}-09-01'][0]
    ok('K5 lecture saved with an update of that slot only', LOG['patch'][-1]==(first_id,{'lesson_id':'l-1'}), str(LOG['patch']))
    ok('K5 "Бастау" is on now', not A.locator('button[aria-label="01.09, 2-сабақ: бастау"]').is_disabled())
    ok('K5 no console errors so far', not errors, str(errors[:3]))
    MODE['rpc']='fail'; A.click('button[aria-label="01.09, 2-сабақ: бастау"]'); A.wait_for_selector('[role=status]:has-text("Сабақ табылмады")')
    ok('K6 failed start: the server message is shown, slot not marked, still on the page', 'session_id' not in SLOTS[first_id] or SLOTS[first_id]['session_id'] is None)
    MODE['rpc']='ok'; A.click('button[aria-label="01.09, 2-сабақ: бастау"]'); A.wait_for_function("location.hash==='#remote/sess-1'")
    ok('K7 start calls the existing rpc with lecture, class and 3 groups', LOG['rpc'][-1]=={'p_lesson':'l-1','p_class':'c-7b','p_groups':3}, str(LOG['rpc']))
    ok('K7 the live lesson is remembered on the slot, then the teacher remote opens', LOG['patch'][-1]==(first_id,{'session_id':'sess-1'}) and A.evaluate("location.hash")=='#remote/sess-1', str(LOG['patch'][-1]))
    A.goto(URL); A.reload(); A.wait_for_selector('h1:has-text("КТП")'); pick(A,'quarter','1-тоқсан'); A.wait_for_selector(sel)
    ok('K8 after reload the slot says "Басталды", links to the lesson, lecture is locked', A.locator('li:has(select[aria-label="Сс 01.09, 2-сабақ: дәріс"]) >> text=Басталды').count()==1 and A.locator('a:text-is("Сабақты ашу")').get_attribute('href')=='#remote/sess-1' and A.locator(sel).is_disabled() and A.locator('button[aria-label="01.09, 2-сабақ: бастау"]').count()==0)
    # old 009 without session_id
    MODE['v']='nocol'; C=page(); C.goto(URL); C.wait_for_selector('h1:has-text("КТП")'); pick(C,'quarter','1-тоқсан'); C.wait_for_selector('section[aria-label="1-апта"]')
    ok('K9 old 009 (no session_id column): page still works, retried without the column, no error', C.locator('[role=alert]').count()==0 and any('session_id' not in g for g in LOG['gets'][-2:]) and C.locator('select[aria-label^="Сс 01.09"]').count()==1, str(LOG['gets'][-3:]))
    MODE['v']='missing'; D=page(); D.goto(URL); D.wait_for_selector('text=009_schedule.sql іске қосылмаған')
    ok('K10 tables missing: honest "browser only" note', True)
    MODE['v']='ok'
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
