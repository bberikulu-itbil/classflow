# Menu (sidebar) and section screens. Two modes: ?demo (in-memory) and "live-like" (a fake logged-in session + canned Supabase REST answers).
# Run: python3 nav.py   (needs dist/ built, playwright, TOOLS with tw.css + axe-core)
import json, os, sys, time, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5203),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5203/'; errors=[]; bad5xx=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)

# ---- canned data -------------------------------------------------------------------------------------------------
CLASSES=[{'id':'c7a','name':'7A'},{'id':'c7b','name':'7B'},{'id':'c10','name':'10A'}]
STUDENTS=[{'id':'s1','full_name':'Айдар Нұрланов','class_id':'c7b'},{'id':'s2','full_name':'Дана Серікова','class_id':'c7b'},{'id':'s3','full_name':'Ерлан Қасым','class_id':'c7a'}]
LESSONS=[{'id':'l1','title':'Циклдер','subject':'Информатика','class_id':'c7b'},{'id':'l2','title':'Айнымалылар','subject':'Информатика','class_id':'c7a'},
         {'id':'l3','title':'Алгоритм','subject':None,'class_id':'c7a'},{'id':'l4','title':'Жалпы сабақ','subject':None,'class_id':None}]
PAST=[{'id':'p1','title':'Циклдер','class_id':'c7b','status':'ended','ended_at':'2026-10-20T08:00:00Z'},{'id':'p2','title':'Айнымалылар','class_id':'c7a','status':'ended','ended_at':'2026-10-21T09:30:00Z'}]
def work(a,cls,title): return {'assignment_id':a,'cf_assignments':{'classes':{'name':cls},'cf_activities':{'title':title}}}
WORK=[work('a1','7B','Қосынды')]*3+[work('a2','7A','Орташа')]
def mk(i,title,status,due,pts=None,fb=None): return {'assignment_id':i,'title':title,'kind':'code','unit_title':'Үй жұмысы','course_title':'Үй тапсырмалары','opens_at':None,'due_at':due,'locked':False,'max_points':5,'status':status,'tests_passed':None,'tests_total':None,'points':pts,'feedback':fb,'late':False}
MY=[mk('a1','Қосынды','not_started','2026-10-25T12:00:00Z'),mk('a2','Циклдер','draft','2026-10-23T12:00:00Z'),mk('a3','Массивтер','submitted','2026-10-20T12:00:00Z'),
    mk('a4','Шартты оператор','finalized','2026-10-18T12:00:00Z',4,'Жарайсың'),mk('a5','Қатемен','needs_work',None,None,'Қайта жаса')]
TERMS=[{'term':'Алгоритм','definition':'Қадамдар тізбегі'},{'term':'Цикл','definition':None}]
PLANS=[{'id':'pl1','kind':'quarter','title':'2-тоқсан','quarter':2,'updated_at':'2026-10-01T00:00:00Z'}]
PERSONA={'teacher':{'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None},
         'student':{'id':'s1','full_name':'Айдар Нұрланов','role':'student','school_id':'sc','class_id':'c7b'}}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
def session_js(p):
    s={'access_token':jwt(p['id']),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':p['id'],'aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}}
    return "try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(json.dumps(s))

def stub(r, who):
    q=r.request; u=urlparse(q.url); qs=parse_qs(u.query); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    def out(d,status=200,extra=None):
        hh=dict(h); hh.update(extra or {})
        r.fulfill(status=status,content_type='application/json',headers=hh,body=json.dumps(d))
    if name=='profiles': return out(PERSONA[who] if 'id' in qs else STUDENTS) if not one else out(PERSONA[who])
    if name=='classes': return out(CLASSES[1] if one else CLASSES)
    if name=='cf_lessons': return out(LESSONS)
    if name=='cf_sessions': return out([] if (qs.get('status') or [''])[0]=='eq.live' else PAST)
    if name=='cf_work': return out(WORK)
    if name=='cf_integrity_flags': return r.fulfill(status=200,headers={**h,'content-range':'*/2'},body='')
    if name=='cf_assignments': return out([])
    if name=='cf_plans': return out(PLANS)
    if name=='cf_my_terms': return out(TERMS)
    if name=='cf_my_assignments': return out(MY)
    if name=='cf_live_for_me': return out([])
    if name=='cf_join': return out({'message':'Код табылмады','code':'P0001'},400)
    return out([])

def route(r, who=None):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and who: stub(r,who)
    else: r.abort()
def axe(pg,name):
    pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))

TEACHER_LINKS=['Басты бет','Сабақтар','Тапсырмалар','Сынақтар мен сайыстар','Журнал','EduStudio','Сөздігім']
STUDENT_LINKS=['Басты бет','Тапсырмалар','Курстарым','Сайыстар','Бағаларым','Сөздігім']
nl=lambda pg,name,scope='aside nav': pg.locator(scope).get_by_role('link',name=name,exact=True)
links=lambda pg: [t.strip() for t in pg.locator('aside nav a').all_inner_texts()]

with sync_playwright() as p:
    b=p.chromium.launch()
    def page(who=None, demo=None, vp=(1440,900), start='#'):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',lambda r: route(r,who))
        if who: c.add_init_script(session_js(PERSONA[who]))
        pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e)))
        pg.on('response',lambda r: bad5xx.append(r.url) if r.status>=500 else None)
        pg.goto(B+('?demo='+demo if demo else '')+start); return pg

    # ---------- teacher, demo ----------
    pg=page(demo='teacher'); pg.wait_for_selector('aside nav a')
    ok('T1 teacher menu: 7 links (no Сыныптар, no Баптаулар in the list) in the agreed order', links(pg)==TEACHER_LINKS, str(links(pg)))
    ok('T1 home is marked current', pg.locator('aside nav a[aria-current=page]').inner_text().strip()=='Басты бет')
    w=lambda: round(pg.locator('aside').bounding_box()['width'])
    ok('T2 expanded width 240', w()==240, str(w()))
    pg.click('button[aria-label="Мәзірді жию"]'); pg.wait_for_timeout(400)
    ok('T2 collapsed width 64', w()==64, str(w()))
    ok('T2 collapsed: no visible label text, links keep their names', pg.locator('aside nav a span.truncate').count()==0 and nl(pg,'Сабақтар').count()==1)
    tip=lambda: pg.eval_on_selector('aside nav a[aria-label="Сабақтар"] span[aria-hidden]','e=>getComputedStyle(e).opacity')
    ok('T2 tooltip hidden until hover', tip()=='0')
    pg.hover('aside nav a[aria-label="Сабақтар"]'); pg.wait_for_timeout(100)
    ok('T2 tooltip shows the section name on hover', tip()=='1' and pg.locator('aside nav a[aria-label="Сабақтар"] span[aria-hidden]').inner_text()=='Сабақтар')
    clip=pg.eval_on_selector('aside nav a[aria-label="Сабақтар"] span[aria-hidden]','e=>{const o=[];for(let n=e.parentElement;n&&n.tagName!=="BODY";n=n.parentElement){const c=getComputedStyle(n);if(c.overflowX!=="visible"||c.overflowY!=="visible")o.push(n.tagName)}return o}')
    ok('T2 tooltip sticks out of the narrow sidebar and no ancestor clips it', not clip, str(clip))
    pg.mouse.move(700,500); pg.focus('button[aria-label="Мәзірді жаю"]'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    ok('T2 tooltip also shows on keyboard focus', pg.eval_on_selector('aside nav a[aria-label="Басты бет"] span[aria-hidden]','e=>getComputedStyle(e).opacity')=='1')
    pg.reload(); pg.wait_for_selector('aside nav a'); pg.wait_for_timeout(300)
    ok('T2 collapsed state is remembered after reload', w()==64, str(w()))
    axe(pg,'home collapsed')
    pg.click('button[aria-label="Мәзірді жаю"]'); pg.wait_for_timeout(400); ok('T2 expands again', w()==240, str(w()))
    axe(pg,'teacher home (demo)')
    ok('T3 home shows soon cards, no invented numbers', pg.locator('text=Жақында').count()>=2 and pg.locator('text=Бүгінгі кесте').count()==1)
    ok('T3 home: review card says nothing waiting', pg.locator('text=Тексеруді күтетін жұмыс жоқ.').count()>=1)
    # skip button: first tab stop, off-screen until focused, does not touch the hash router
    sk='button:text-is("Негізгі мазмұнға өту")'
    ok('K1 skip button is the first focusable thing and hidden until focused', pg.evaluate("document.querySelector('button,a[href]').textContent.trim()")=='Негізгі мазмұнға өту' and pg.locator(sk).bounding_box()['width']<=1)
    pg.focus(sk); pg.wait_for_timeout(50)
    ok('K1 skip button shows up when focused', pg.locator(sk).bounding_box()['width']>60)
    axe(pg,'home with the skip button focused')
    h0=pg.evaluate('location.hash'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    ok('K1 skip button moves focus to the content and leaves the route alone', pg.evaluate('document.activeElement.tagName')=='MAIN' and pg.evaluate('location.hash')==h0)

    exp={'Сабақтар':('#lessons/modules','Модульдер мен дәрістер'),'Тапсырмалар':('#assign','Үй тапсырмасын беру'),'Сынақтар мен сайыстар':('#exams','Сынақтар мен сайыстар'),'Журнал':('#journal/lessons','Журнал'),'EduStudio':('#edustudio','EduStudio'),
         'Сөздігім':('#vocab/base','Терминдер базасы')}
    for name,(h,title) in exp.items():
        nl(pg,name).click(); pg.wait_for_timeout(300)
        ok(f'T4 {name}: opens {h}', pg.evaluate('location.hash')==h and pg.locator(f'h1:has-text("{title}")').count()>=1, pg.evaluate('location.hash'))
        ok(f'T4 {name}: section is marked current', pg.locator('aside nav a[aria-current=page]').inner_text().strip()==name)
    pg.goto(B+'?demo=teacher#lessons/gallery'); pg.wait_for_selector('h1:has-text("Сабақтар")')
    ok('T5 planned tab shows what it will hold', pg.locator('text=Дайын сабақтар').count()==1 and pg.locator('text=Жақында').count()>=2)
    ok('T5 tab strip has the 7 lesson tabs (courses, modules and КТП are real)', pg.locator('nav[aria-label="Сабақтар бөлімдері"] a').all_inner_texts()[0].strip()=='Сабақтар' and pg.locator('nav[aria-label="Сабақтар бөлімдері"] a').count()==7)
    axe(pg,'lessons/gallery (tabs, soon)')
    pg.goto(B+'?demo=teacher#lessons/plans'); pg.wait_for_timeout(600)
    ok('T5 tab for an older screen forwards to it (#plans)', pg.evaluate('location.hash')=='#plans' and pg.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().startswith('Жоспарлар'))
    pg.goto(B+'?demo=teacher#exams'); pg.wait_for_selector('h1:has-text("Сынақтар мен сайыстар")')
    ok('T5 fully planned section: 6 cards (exams + contests), no tabs', pg.locator('h2:has-text("БЖБ / ТЖБ")').count()==1 and pg.locator('h2:has-text("Хакатон және код дуэлі")').count()==1 and pg.locator('main h2').count()==6 and pg.locator('nav[aria-label="Сынақтар мен сайыстар бөлімдері"]').count()==0, str(pg.locator('main h2').count()))
    axe(pg,'exams (all soon)')
    pg.goto(B+'?demo=teacher#edustudio'); pg.wait_for_selector('h1:has-text("EduStudio")')
    ok('T5 EduStudio: material and test generation cards', pg.locator('h2:has-text("Материал жасау")').count()==1 and pg.locator('h2:has-text("Тест генерациясы")').count()==1); axe(pg,'edustudio (soon)')
    pg.goto(B+'?demo=teacher#journal/lessons'); pg.wait_for_selector('nav[aria-label="Журнал бөлімдері"]')
    ok('T5 Журнал: lesson log is real and current, class journal is real now', pg.locator('nav[aria-label="Журнал бөлімдері"] a[aria-current=page]').inner_text().strip()=='Сабақ журналы' and pg.locator('nav[aria-label="Журнал бөлімдері"] a:has-text("Сынып журналы")').get_attribute('href')=='#journal/grid')
    pg.goto(B+'?demo=teacher#assign'); pg.wait_for_selector('text=Үй тапсырмасын беру')
    ok('T5 Tasks tabs in the 0.1.0 order', [t.strip().replace('\n',' ').replace(' Жақында','') for t in pg.locator('nav[aria-label="Тапсырмалар бөлімдері"] a').all_inner_texts()]==['Күнделікті тапсырмалар','Жобалар','Jeopardy','Тапсырмалар банкі','Конструктор','Тексеру кезегі','Бағалау жүйесі'], str(pg.locator('nav[aria-label="Тапсырмалар бөлімдері"] a').all_inner_texts()))
    ok('T5 version is shown in the menu', pg.locator('aside >> text=ClassFlow v0.1.0').count()==1)
    prof=pg.locator('aside a[href="#settings/profile"]')
    ok('T6 settings and profile are one block at the bottom (no Баптаулар in the list)', prof.count()==1 and 'Профиль' not in ''.join(links(pg)) and 'Баптаулар' not in links(pg) and 'Сыныптар' not in links(pg))
    prof.click(); pg.wait_for_selector('h1:has-text("Профиль және баптаулар")')
    ok('T6 the block opens the merged page, is current, tabs: profile + planned settings', prof.get_attribute('aria-current')=='page' and pg.locator('nav[aria-label="Профиль және баптаулар бөлімдері"] a').count()==3 and pg.locator('button:text-is("Шығу")').count()==1)
    axe(pg,'merged profile and settings')
    pg.goto(B+'?demo=teacher#profile'); pg.wait_for_selector('h1:has-text("Профиль")'); ok('T6 old #profile link still works and keeps the block current', pg.locator('aside a[href="#settings/profile"][aria-current=page]').count()==1)
    pg.goto(B+'?demo=teacher#journal/classes'); pg.wait_for_selector('nav[aria-label="Журнал бөлімдері"]')
    ok('T6 classes live in Журнал now (4 tabs), Журнал is current', pg.locator('nav[aria-label="Журнал бөлімдері"] a').count()==4 and pg.locator('nav[aria-label="Журнал бөлімдері"] a[aria-current=page]').inner_text().strip()=='Сыныптар' and pg.locator('aside nav a[aria-current=page]').inner_text().strip()=='Журнал')
    pg.goto(B+'?demo=teacher#courses'); pg.wait_for_selector('h1:has-text("Сәлеметсіз бе")'); ok('T5 old #courses no longer a teacher section: falls back to home', True)
    pg.goto(B+'?demo=teacher#assign'); pg.wait_for_selector('text=Үй тапсырмасын беру')
    ok('T5 assign screen sits inside Tasks tabs', pg.locator('nav[aria-label="Тапсырмалар бөлімдері"] a[aria-current=page]').inner_text().startswith('Күнделікті'))
    axe(pg,'assign inside menu')

    # ---------- student, demo ----------
    pg=page(demo='student'); pg.wait_for_selector('aside nav a')
    ok('S1 student menu: 6 sections in the agreed order', links(pg)==STUDENT_LINKS, str(links(pg)))
    nl(pg,'Тапсырмалар').click(); pg.wait_for_selector('h1:has-text("Үй тапсырмасы")')
    ok('S1 Tasks goes to #hw and is current', pg.evaluate('location.hash')=='#hw' and pg.locator('aside nav a[aria-current=page]').inner_text().strip()=='Тапсырмалар')
    for name,h in (('Курстарым','#courses'),('Сайыстар','#contests'),('Бағаларым','#grades/feedback'),('Сөздігім','#vocab/mine')):
        nl(pg,name).click(); pg.wait_for_timeout(300)
        ok(f'S1 {name}: opens {h}', pg.evaluate('location.hash')==h, pg.evaluate('location.hash'))
    pg.goto(B+'?demo=student#tasks'); pg.wait_for_selector('h1:has-text("Үй тапсырмасы")'); ok('S1 student #tasks shows the homework list',True)
    pg.goto(B+'?demo=student#assign'); pg.wait_for_timeout(500)
    ok('S1 student cannot open teacher screens', pg.locator('text=Үй тапсырмасын беру').count()==0 and pg.locator('h1:has-text("Сәлем")').count()==1)
    pg.goto(B+'?demo=student#profile'); pg.wait_for_selector('h1:has-text("Профиль")'); ok('S1 profile page inside the menu (student sees class row)', pg.locator('text=Сынып').count()>=1 and pg.locator('button:text-is("Шығу")').count()==1)
    axe(pg,'student profile')

    # ---------- teacher, live-like ----------
    pg=page(who='teacher'); pg.wait_for_selector('h1:has-text("Сәлеметсіз бе, Бағдәулет")')
    ok('L1 home: lessons in the start card (latest first)', pg.locator('main select >> nth=0').inner_text().split('\n')[0]=='Циклдер')
    pg.wait_for_selector('a[href="#review/a1"]')
    ok('L1 home: pending works are counted and linked', pg.locator('text=Қосынды · 7B').count()==1 and pg.locator('a[href="#review/a1"]').count()==1 and pg.locator('text=Тексеруді күтетін жұмыстар >> xpath=..').inner_text().strip().endswith('4'))
    ok('L1 home: open paste flags counted', pg.locator('text=Көшіру белгісі бар жұмыс:').count()==1 and pg.locator('b:text-is("2")').count()>=1)
    axe(pg,'teacher home (live-like)')
    pg.goto(B+'#lessons/mine'); pg.wait_for_selector('section[aria-label="Информатика"]')
    heads=[t.strip() for t in pg.locator('main section > h3').all_inner_texts()]
    ok('L2 lessons in one gallery per subject, no-subject last', heads==['Информатика · 2','Пәнсіз · 2'], str(heads))
    ok('L2 filters: this quarter is the default, every class', pg.locator('input[name=quarter]:checked').get_attribute('value')=='1' and pg.locator('input[name=class]:checked').get_attribute('value')=='' and 'қазір' in pg.locator('label:has(input[name=quarter]:checked)').inner_text())
    axe(pg,'lessons/mine')
    pg.goto(B+'#journal/lessons'); pg.wait_for_selector('text=Өткен сабақтар журналы'); pg.wait_for_selector('main >> text=Айнымалылар')
    rows=[t.replace('\n',' ') for t in pg.locator('main div.rounded-lg').all_inner_texts()]
    ok('L3 past lessons: newest first', len(rows)==2 and 'Айнымалылар' in rows[0] and 'Циклдер' in rows[1], str(rows))
    pg.goto(B+'#journal/classes'); pg.wait_for_selector('summary')
    ok('L4 classes: natural order and student counts', [t.replace('\n',' ') for t in pg.locator('summary').all_inner_texts()]==['7A 1 оқушы','7B 2 оқушы','10A 0 оқушы'], str(pg.locator('summary').all_inner_texts()))
    pg.locator('summary:has-text("7B")').click()
    ok('L4 roster opens with names', pg.locator('li:has-text("Айдар Нұрланов")').is_visible() and pg.locator('li:has-text("Дана Серікова")').is_visible())
    axe(pg,'classes (roster open)')
    pg.goto(B+'#tasks/queue'); pg.wait_for_selector('a[href="#review/a1"]:text-is("Тексеру")')
    ok('L5 queue lists assignments with counts and a Check link', pg.locator('text=7B · 3 жұмыс').count()==1 and pg.locator('a[href="#review/a1"]:text-is("Тексеру")').count()==1)
    axe(pg,'tasks/queue')
    pg.goto(B+'#plans'); pg.wait_for_selector('h1:has-text("Жоспарлар")')
    pg.wait_for_selector('a[href="#plan/pl1"]')
    ok('L6 plans inside the menu: list + new button', pg.locator('a[href="#plan/pl1"]').count()==1 and pg.locator('a[href="#plan/new"]').count()==1 and pg.locator('aside nav a[aria-current=page]').inner_text().strip()=='Сабақтар')
    axe(pg,'plans')

    # ---------- phone ----------
    pg=page(who='teacher',vp=(390,844)); pg.wait_for_selector('h1:has-text("Сәлеметсіз бе")')
    ok('P1 phone: sidebar hidden, top bar with menu button', not pg.locator('aside').is_visible() and pg.locator('button[aria-label="Мәзірді ашу"]').is_visible())
    ok('P1 phone: skip button is still the first tab stop', pg.evaluate("document.querySelector('button,a[href]').textContent.trim()")=='Негізгі мазмұнға өту')
    for h in ('#','#lessons/mine','#journal/classes','#tasks/queue','#exams','#journal/lessons','#edustudio','#plans','#lessons/gallery'):
        pg.goto(B+h); pg.wait_for_timeout(700)
        sw=pg.evaluate('document.documentElement.scrollWidth'); ok(f'P1 390px no sideways scroll at {h}', sw<=390, str(sw))
    pg.goto(B+'#'); pg.wait_for_selector('h1:has-text("Сәлеметсіз бе")')
    pg.click('button[aria-label="Мәзірді ашу"]'); pg.wait_for_selector('[role=dialog]')
    ok('P2 drawer opens, focus moves to Close', pg.evaluate('document.activeElement.getAttribute("aria-label")')=='Мәзірді жабу')
    ok('P2 drawer lists all 7 links with labels', [t.strip() for t in pg.locator('[role=dialog] nav a').all_inner_texts()]==TEACHER_LINKS)
    axe(pg,'phone drawer open')
    # keyboard trap: Tab from the last control wraps to the first
    pg.focus('[role=dialog] a[href="#settings/profile"]'); pg.keyboard.press('Tab')
    ok('P2 focus stays inside the open drawer', pg.evaluate('!!document.activeElement.closest("[role=dialog]")'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    ok('P2 Escape closes and returns focus to the menu button', pg.locator('[role=dialog]').count()==0 and pg.evaluate('document.activeElement.getAttribute("aria-label")')=='Мәзірді ашу')
    pg.click('button[aria-label="Мәзірді ашу"]'); nl(pg,'Журнал','[role=dialog] nav').click(); pg.wait_for_timeout(300)
    ok('P2 choosing a section navigates and closes the drawer', pg.evaluate('location.hash')=='#journal/lessons' and pg.locator('[role=dialog]').count()==0)
    pg.click('button[aria-label="Мәзірді ашу"]'); pg.click('[role=dialog] button[aria-label="Мәзірді жабу"]'); ok('P2 Close button works', pg.locator('[role=dialog]').count()==0)

    # ---------- student, live-like ----------
    pg=page(who='student'); pg.wait_for_selector('h1:has-text("Сәлем, Айдар")')
    pg.wait_for_selector('main li a span.min-w-0')
    due=[t.strip().split('\n')[0] for t in pg.locator('main li a span.min-w-0').all_inner_texts()]
    ok('SL1 home: nearest deadlines first, finished ones left out', due==['Циклдер','Қосынды','Қатемен'], str(due))
    pg.fill('input[placeholder="000 000"]','000 000'); pg.click('button:text-is("Қосылу")'); pg.wait_for_selector('[role=alert]')
    ok('SL1 wrong join code shows the server message inline (no browser alert)', pg.locator('[role=alert]').inner_text()=='Код табылмады')
    axe(pg,'student home (live-like)')
    pg.goto(B+'#hw'); pg.wait_for_selector('button[aria-pressed]')
    cnt=lambda: pg.locator('main section a[href^="#hw/"]').count()
    ok('SL2 filter All: 5 tasks', cnt()==5, str(cnt()))
    pg.click('button:text-is("Белсенді")'); ok('SL2 filter Active: 3 (not started, draft, needs work)', cnt()==3 and pg.locator('button[aria-pressed=true]').inner_text()=='Белсенді', str(cnt()))
    pg.click('button:text-is("Тапсырылған")'); ok('SL2 filter Submitted: 1', cnt()==1)
    pg.click('button:text-is("Тексерілген")'); ok('SL2 filter Checked: 1 (graded)', cnt()==1 and pg.locator('text=Жарайсың').count()==1)
    axe(pg,'homework list with filters')
    pg.goto(B+'#grades'); pg.wait_for_selector('text=ұпай жиыны')
    ok('SL3 grades: opens on the tab that exists, shows points total', pg.evaluate('location.hash')=='#grades' and pg.locator('text=ұпай жиыны: 4/5').count()==1 and pg.locator('text=💬 Қайта жаса').count()==1)
    ok('SL3 grades: other tabs marked soon', pg.locator('nav[aria-label="Бағаларым бөлімдері"] a:has-text("Жақында")').count()==4)
    axe(pg,'grades')
    pg.goto(B+'#vocab'); pg.wait_for_selector('dt:has-text("Алгоритм")')
    ok('SL4 vocab: terms with and without definition', pg.locator('dd:has-text("Қадамдар тізбегі")').count()==1 and pg.locator('dt:has-text("Цикл")').count()==1 and pg.locator('text=2 термин').count()==1)
    axe(pg,'vocab')
    b.close()
real=[e for e in errors if 'Failed to load resource' not in e and 'ERR_FAILED' not in e]
ok('no console errors',not real,str(real[:3])); ok('no 5xx',not bad5xx,str(bad5xx[:3]))
print(sum(1 for r in results if r[1]),'/',len(results),'passed'); sys.exit(0 if all(r[1] for r in results) else 1)
