# Schedule (Сабақтар › КТП): weekly timetable -> dated slots of a class per quarter -> a lecture in each slot. Demo data, browser storage, no network.
import json, os, sys, datetime, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5217),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5217/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    else: r.abort()
def axe(pg,name):
    pg.wait_for_timeout(400); pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))
t=datetime.date.today(); Y=t.year if t.month>=9 else t.year-1
sep=[datetime.date(Y,9,d) for d in range(1,31)]
N=sum(1 for d in sep if d.weekday() in (1,4))  # Tuesdays + Fridays of September
URL=B+'?demo=teacher#lessons/schedule'
def pick(pg,group,label): pg.locator(f'fieldset:has(input[name={group}]) label:has-text("{label}")').first.click()
def status(pg): return pg.locator('[role=status]').inner_text()
def summary(pg): return pg.locator('p:has-text("ұяшық ·")').inner_text()
def rangeset(pg,a,b): pg.fill('label:has-text("Бастап") ~ input',a); pg.fill('label:has-text("Дейін") ~ input',b)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); pg.goto(URL); pg.wait_for_selector('h1:has-text("КТП")')
    ok('S1 tab is current', pg.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='КТП (кесте)')
    ok('S1 weekly timetable from the demo', pg.locator('li:has(span:text-is("Сс"))').inner_text().count('2-сабақ · 7B')==1 and pg.locator('li:has(span:text-is("Жм"))').inner_text().count('4-сабақ · 7B')==1)
    axe(pg,'schedule')
    # S2 timetable editing
    pg.select_option('label:has-text("Сынып") ~ select','c7a'); pg.select_option('label:has-text("Күн") ~ select','2'); pg.select_option('label:has-text("Сабақ нөмірі") ~ select','2'); pg.click('button:text-is("Кестеге қосу")')
    pg.wait_for_selector('[role=status]:has-text("бос емес")'); ok('S2 same weekday+period refused (one teacher, one room)', 'бос емес' in status(pg) and pg.locator('li:has(span:text-is("Сс")) >> text=7A').count()==0)
    pg.select_option('label:has-text("Күн") ~ select','1'); pg.select_option('label:has-text("Сабақ нөмірі") ~ select','3'); pg.click('button:text-is("Кестеге қосу")')
    pg.wait_for_selector('li:has(span:text-is("Дс"))'); ok('S2 another period is added', pg.locator('li:has(span:text-is("Дс"))').inner_text().count('3-сабақ · 7A')==1)
    pg.click('button[aria-label="Дс 3-сабақ 7A: өшіру"]'); pg.wait_for_selector('li:has(span:text-is("Дс"))',state='detached'); ok('S2 entry removed', True)
    # S3 generation
    ok('S3 default class is the first one and has no timetable: button disabled with the reason', pg.locator('button:text-is("Ұяшықтарды құру")').is_disabled() and pg.locator('text=алдымен жоғарыдан қосыңыз').count()==1)
    pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан'); pg.wait_for_selector('text=Бұл сынып пен тоқсанда ұяшық жоқ')
    ok('S3 starts with no slots', True)
    rangeset(pg,f'{Y}-09-01',f'{Y}-09-30'); pg.click('button:text-is("Ұяшықтарды құру")'); pg.wait_for_selector('section[aria-label="1-апта"]')
    ok(f'S3 slots created for every Tue/Fri of September ({N})', f'{N} ұяшық' in status(pg) and summary(pg).startswith(f'{N} ұяшық · дәріс қойылғаны: 0'), status(pg)+' | '+summary(pg))
    first=pg.locator('section[aria-label="1-апта"] li').first.inner_text().replace('\n',' ')
    ok('S3 weeks are numbered and the first row is Tuesday 01.09, lesson 2', pg.locator('section[aria-label="1-апта"] h3').inner_text().startswith('1-апта · 31.08') and first.startswith('Сс 01.09 2-сабақ'), first)
    ok('S3 Friday has lesson 4', 'Жм 04.09 4-сабақ' in pg.locator('section[aria-label="1-апта"]').inner_text().replace('\n',' '))
    pg.click('button:text-is("Ұяшықтарды құру")'); pg.wait_for_selector('[role=status]:has-text("бұрыннан бар")'); ok('S4 second run adds nothing', summary(pg).startswith(f'{N} ұяшық'))
    # S5 range checks
    rangeset(pg,f'{Y}-10-05',f'{Y}-09-01'); ok('S5 start after end is refused and the button is off', pg.locator('text=кеш болмауы керек').count()==1 and pg.locator('button:text-is("Ұяшықтарды құру")').is_disabled())
    rangeset(pg,f'{Y}-01-01',f'{Y+1}-01-01'); ok('S5 more than a quarter is refused', pg.locator('text=140 күннен').count()==1 and pg.locator('button:text-is("Ұяшықтарды құру")').is_disabled())
    rangeset(pg,f'{Y}-09-01',f'{Y}-10-25'); pg.click('button:text-is("Ұяшықтарды құру")'); pg.wait_for_selector('[role=status]:has-text("ұяшық құрылды")')
    N2=sum(1 for i in range((datetime.date(Y,10,25)-datetime.date(Y,9,1)).days+1) if (datetime.date(Y,9,1)+datetime.timedelta(i)).weekday() in (1,4))
    ok('S5 widening the range adds only the new days', summary(pg).startswith(f'{N2} ұяшық') and status(pg).startswith(f'{N2-N} ұяшық'), summary(pg)+' | '+status(pg))
    # S6 put a lecture into a slot
    sel='select[aria-label="Сс 01.09, 2-сабақ: дәріс"]'
    ok('S6 lectures grouped by course › module, loose ones last', 'Информатика 7 › Алгоритмдер' in pg.locator(sel).evaluate("e=>[...e.querySelectorAll('optgroup')].map(g=>g.label).join('|')") and pg.locator(sel).evaluate("e=>[...e.querySelectorAll('optgroup')].pop().label")=='Модульсіз дәрістер')
    pg.select_option(sel,label='Циклдер'); pg.wait_for_function("document.querySelector('p.text-sm.text-text-secondary:last-of-type, section p')!==null && [...document.querySelectorAll('p')].some(p=>p.innerText.includes('дәріс қойылғаны: 1'))")
    ok('S6 counter follows', 'дәріс қойылғаны: 1' in summary(pg))
    pg.reload(); pg.wait_for_selector('h1:has-text("КТП")'); pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан'); pg.wait_for_selector(sel)
    ok('S6 lecture and slots survive a reload', pg.locator(sel).evaluate("e=>e.selectedOptions[0].text")=='Циклдер' and summary(pg).startswith(f'{N2} ұяшық'))
    pg.select_option(sel,value=''); pg.wait_for_function("[...document.querySelectorAll('p')].some(p=>p.innerText.includes('дәріс қойылғаны: 0'))"); ok('S6 lecture can be taken out of a slot', True)
    # S7 delete a slot (a holiday)
    pg.click('button[aria-label="01.09, 2-сабақ: ұяшықты өшіру"]'); pg.wait_for_function(f"[...document.querySelectorAll('p')].some(p=>p.innerText.startsWith('{N2-1} ұяшық'))")
    ok('S7 a holiday slot is removed; re-generating brings it back', True)
    pg.click('button:text-is("Ұяшықтарды құру")'); pg.wait_for_selector('[role=status]:has-text("1 ұяшық құрылды")'); ok('S7 only the missing one is created', summary(pg).startswith(f'{N2} ұяшық'))
    # S8 quarters apart
    pick(pg,'quarter','2-тоқсан'); pg.wait_for_selector('text=Бұл сынып пен тоқсанда ұяшық жоқ'); ok('S8 another quarter has its own (empty) schedule', True)
    for th in ['dark','ocean']:
        pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(pg,'schedule '+th)
    pg2=page((390,800)); pg2.goto(URL); pg2.wait_for_selector('h1:has-text("КТП")'); pick(pg2,'class','7B'); pick(pg2,'quarter','1-тоқсан'); pg2.wait_for_timeout(300)
    ok('S9 390px: no sideways scroll', pg2.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    axe(pg2,'schedule phone')
    ps=page(); ps.goto(B+'?demo=student#lessons/schedule'); ps.wait_for_timeout(500); ok('S10 student has no schedule editor', ps.locator('h1:has-text("КТП")').count()==0)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
