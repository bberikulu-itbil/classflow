# Modules screen against a fake Supabase: choose a class, start a lecture as a live lesson (rpc cf_start_session), refusal shown.
import json, os, sys, datetime, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5224),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5224/'; errors=[]; results=[]
def axe(pg,name):
    pg.wait_for_timeout(300); pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
CLASSES=[{'id':'c-7b','name':'7B'}]; LESSONS=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
LES=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
PREV={'id':'l-1','title':'Циклдер','subject':'Информатика','slides':[
  {'type':'title','title':'Циклдер','subtitle':'KBO-1 · Дәріс 1'},
  {'type':'content','title':'for циклі','bullets':['бастау; шарт; қадам'],'code':'for (int i = 0; i < n; i++) {\n    s += i;\n}','lang':'C++','notes':'Мұғалімге ескертпе'},
  {'type':'quiz','title':'Не шығады?','prompt':'x = 2 * 3','options':['5','6','7'],'answer':1,'points':2,'explanation':'2 * 3 = 6'}]}
RPC=[]; MODE={'rpc':'ok','v':'012'}; MODS=[{'id':'m1','course_id':'cr1','title':'Алгоритмдер','position':0,'kind':'lesson','quarter':None,'grade':7},{'id':'m2','course_id':'cr1','title':'Үйірме','position':1,'kind':'course','quarter':None,'grade':8}]; LOGM={'post':[],'patch':[]}
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    if name=='profiles': return out(ME)
    if name=='classes': return out([{'id':'c-7a','name':'7A'},{'id':'c-7b','name':'7B'}])
    if name=='cf_lessons':
        if 'slides' in (parse_qs(u.query).get('select') or [''])[0]: return out(PREV)
        return out(LES)
    if name=='cf_curr_courses': return out([{'id':'cr1','title':'Информатика 7','subject':'Информатика','grade':7}])
    if name=='cf_curr_modules':
        if q.method=='POST': d=json.loads(q.post_data); LOGM['post'].append(d); MODS.append({**{'kind':'lesson','quarter':None,'grade':None},**d}); return r.fulfill(status=201,headers=h,body='')
        if q.method=='PATCH': d=json.loads(q.post_data); LOGM['patch'].append(d); [m.update(d) for m in MODS if m['id']==parse_qs(u.query)['id'][0].replace('eq.','')]; return r.fulfill(status=204,headers=h)
        sel=(parse_qs(u.query).get('select') or [''])[0]
        if MODE['v']=='old':
            if 'kind' in sel: return out({'code':'42703','message':'column cf_curr_modules.kind does not exist'},400)
            return out([{k:v for k,v in m.items() if k in ('id','course_id','title','position')} for m in MODS if m['kind']=='lesson'])
        return out(MODS)
    if name=='cf_curr_lessons': return out([{'lesson_id':'l-1','module_id':'m1','position':0},{'lesson_id':'l-2','module_id':'m1','position':1}])
    if name=='cf_start_session':
        RPC.append(json.loads(q.post_data))
        return out({'code':'P0001','message':'Сабақ табылмады'},400) if MODE['rpc']=='fail' else out({'id':'sess-9'})
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and 'realtime' not in u: stub(r)
    else: r.abort()
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':1440,'height':900}); c.route('**/*',route)
    c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
    A=c.new_page(); A.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text else None); A.on('pageerror',lambda e: errors.append(str(e)))
    A.goto(B+'#lessons'); A.wait_for_selector('section[aria-label="Алгоритмдер"]')
    ok('M1 the section opens on its first tab, Сабақтар (modules and lectures)', A.locator('h1:text-is("Модульдер мен дәрістер")').count()==1 and A.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='Сабақтар')
    ok('M1 tables exist: no browser-only note', A.locator('[role=note]').count()==0)
    ok('M2 no class: nothing to start', A.locator('button:has-text("Бастау")').count()==0)
    A.select_option('select[aria-label="Сынып (бастау үшін)"]', label='7B'); A.click('section[aria-label="Алгоритмдер"] h2 button')
    btn=A.locator('button[aria-label="Циклдер: 7B сыныбымен бастау"]'); ok('M3 start button is enabled in the cloud', btn.is_enabled() and A.locator('button:has-text("Бастау · 7B")').count()==2)
    MODE['rpc']='fail'; btn.click(); A.wait_for_selector('[role=alert]:has-text("Сабақ табылмады")'); ok('M4 refusal shown, stays on the page, button usable again', A.evaluate('location.hash')=='#lessons' or 'lessons' in A.evaluate('location.hash'))
    ok('M4 button is clickable again after the failure', btn.is_enabled())
    MODE['rpc']='ok'; btn.click(); A.wait_for_function("location.hash==='#remote/sess-9'")
    ok('M5 starts that lecture for that class with the default groups', RPC[-1]=={'p_lesson':'l-1','p_class':'c-7b','p_groups':3}, str(RPC))
    # ---- module type / quarter / parallel in the cloud (012 applied) ----
    A.goto(B+'#lessons/modules'); A.wait_for_selector('section[aria-label="Алгоритмдер"]')
    nm=lambda pg: pg.locator('section[aria-label]').evaluate_all("els=>els.map(e=>e.getAttribute('aria-label'))")
    def edit(pg,m):
        b=pg.locator(f'button[aria-label="{m}: өңдеу"]')
        if b.get_attribute('aria-pressed')!='true': b.click()
    ok('M6 course-type module is hidden in the default view, lesson module shown', nm(A)==['Алгоритмдер'], str(nm(A)))
    A.locator('fieldset:has(input[name=show]) label:has-text("Курстар")').click(); A.wait_for_selector('section[aria-label="Үйірме"]'); ok('M6 course filter shows the course module', nm(A)==['Үйірме'])
    A.locator('fieldset:has(input[name=show]) label:has-text("Осы тоқсан")').click(); A.wait_for_selector('section[aria-label="Алгоритмдер"]')
    edit(A,'Алгоритмдер'); A.select_option('select[aria-label="Алгоритмдер: тоқсаны"]', value='2'); A.wait_for_timeout(300)
    ok('M7 quarter change is one update of that module, kind kept', LOGM['patch'][-1]=={'kind':'lesson','quarter':2,'grade':7}, str(LOGM['patch']))
    A.locator('fieldset:has(input[name=show]) label:has-text("Барлық сабақтар")').click(); A.wait_for_selector('section[aria-label="Алгоритмдер"]')
    A.select_option('select[aria-label="Алгоритмдер: түрі"]', value='course'); A.wait_for_timeout(300)
    ok('M7 turning a module into a course sends quarter null', LOGM['patch'][-1]=={'kind':'course','quarter':None,'grade':7}, str(LOGM['patch'][-1]))
    A.click('button:has-text("Жасау")'); A.click('#create-menu button:text-is("Модуль жасау")'); A.fill('label:text-is("Атауы") ~ input','Деректер'); A.select_option('label:text-is("Параллель") ~ select', value='7')
    A.click('form button:text-is("Модуль жасау")'); A.wait_for_selector('form:has(label:text-is("Атауы"))', state='detached')
    post=LOGM['post'][-1]
    ok('M8 new module row: course, title, position after the last, kind, quarter, grade', post['course_id']=='cr1' and post['title']=='Деректер' and post['position']==2 and post['kind']=='lesson' and isinstance(post['quarter'],int) and post['grade']==7, str(post))
    # ---- preview: open a lecture and read its slides without starting a lesson ----
    A.goto(B+'#lessons/modules'); A.locator('fieldset:has(input[name=show]) label:has-text("Курстар")').click(); A.wait_for_selector('section[aria-label="Алгоритмдер"]'); A.click('section[aria-label="Алгоритмдер"] h2 button')
    ok('P1 lecture title in a module leads to the preview, not the JSON editor', A.locator('section[aria-label="Алгоритмдер"] ol a').first.get_attribute('href')=='#preview/l-1')
    A.locator('section[aria-label="Алгоритмдер"] ol a').first.click(); A.wait_for_selector('h1:text-is("Циклдер")')
    ok('P1 preview keeps the Сабақтар tab current', A.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='Сабақтар')
    ok('P1 starts on slide 1 of 3, title slide shown, previous is off', A.locator('[role=region][aria-label="Слайд 1 / 3"]').count()==1 and 'KBO-1' in A.locator('[role=region]').inner_text() and A.locator('button[aria-label="Алдыңғы слайд"]').is_disabled())
    A.click('button[aria-label="Келесі слайд"]'); ok('P2 next slide: code shown in a monospace block with its language, teacher note below', A.locator('[role=region] pre').inner_text().startswith('for (int i') and 'C++' in A.locator('[role=region] figcaption').inner_text() and A.locator('[role=note]:has-text("Мұғалімге ескертпе")').count()==1)
    A.keyboard.press('ArrowRight'); ok('P2 arrow key goes on; quiz shows the right answer to the teacher only below the slide', A.locator('[role=region][aria-label="Слайд 3 / 3"]').count()==1 and A.locator('[role=note]:has-text("Дұрыс жауап: B. 6")').count()==1 and A.locator('button[aria-label="Келесі слайд"]').is_disabled())
    A.select_option('select[aria-label="Слайдқа өту"]', index=1); ok('P3 jump list goes to the chosen slide', A.locator('[role=region][aria-label="Слайд 2 / 3"]').count()==1)
    for th in ['light','dark','ocean','sand']:
        A.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(A,'preview '+th)
    A.evaluate("document.documentElement.removeAttribute('data-theme')")
    P=c.new_page(); P.set_viewport_size({'width':390,'height':800}); P.goto(B+'#preview/l-1'); P.wait_for_selector('h1:text-is("Циклдер")'); P.click('button[aria-label="Келесі слайд"]')
    ok('P4 390px: no sideways scroll on a code slide', P.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    A.goto(B+'#lesson/l-1'); A.wait_for_selector('a:has-text("Көру")'); ok('P5 lesson page has a «Көру» button to the preview', A.locator('a:has-text("Көру")').get_attribute('href')=='#preview/l-1')
    # ---- 012 not applied yet ----
    MODE['v']='old'; O=c.new_page(); O.goto(B+'#lessons/modules'); O.wait_for_selector('section[aria-label="Деректер"]'); edit(O,'Деректер')
    ok('M9 old database: note names 012_module_kind.sql, type/quarter/parallel are locked', O.locator('[role=note]:has-text("012_module_kind.sql")').count()==1 and O.locator('select[aria-label="Деректер: түрі"]').is_disabled() and O.locator('select[aria-label="Деректер: параллелі"]').is_disabled())
    n=len(LOGM['post']); O.click('button:has-text("Жасау")'); O.click('#create-menu button:text-is("Модуль жасау")'); O.fill('label:text-is("Атауы") ~ input','Ескі режим'); O.locator('label:text-is("Тоқсан") ~ select').select_option(value=''); O.click('form button:text-is("Модуль жасау")'); O.wait_for_timeout(400)
    ok('M9 a plain lesson module can still be made, the row has no new columns', len(LOGM['post'])==n+1 and set(LOGM['post'][-1])=={'id','course_id','title','position'}, str(LOGM['post'][-1]))
    n=len(LOGM['post']); O.click('button:has-text("Жасау")'); O.click('#create-menu button:text-is("Модуль жасау")'); O.fill('label:text-is("Атауы") ~ input','Курс?'); O.locator('fieldset:has(input[name=new-kind]) label:has-text("Курс")').click(); O.click('form button:text-is("Модуль жасау")'); O.wait_for_selector('[role=status]:has-text("012_module_kind.sql")')
    ok('M9 a course module is refused with the reason, nothing sent', len(LOGM['post'])==n)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
