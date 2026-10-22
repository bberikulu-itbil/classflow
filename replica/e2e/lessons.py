# Lessons gallery (filters: class + quarter, a gallery per subject) and the lesson page (one tab per class, results kept apart).
# Demo data, no network. Needs dist/ built. Assumes nothing about today's date except via the quarter the page itself defaults to.
import json, os, sys, datetime, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5214),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5214/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    else: r.abort()
def axe(pg,name):
    pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))
t=datetime.date.today(); md=t.month*100+t.day
CUR=1 if 901<=md<1101 else 2 if md>=1101 else 3 if md<329 else 4 if md<901 else 1
GAL=B+'?demo=teacher#lessons/mine'
def heads(pg): return [x.strip() for x in pg.locator('main section > h3').all_inner_texts()]
def titles(pg,subject): return [x.strip() for x in pg.locator(f'section[aria-label="{subject}"] h4').all_inner_texts()]
def pick(pg,group,label): pg.locator(f'fieldset:has(input[name={group}]) label:has-text("{label}")').first.click()
def rows(pg): return [[c.strip() for c in tr.locator('th,td').all_inner_texts()] for tr in pg.locator('table tbody tr').all()]
def num(pg,key): return pg.locator(f'dl div:has(dt:text-is("{key}")) dd').inner_text().strip()
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); pg.goto(GAL); pg.wait_for_selector('section[aria-label="Информатика"]')
    ok('G1 default: this quarter and every class', pg.locator('input[name=quarter]:checked').get_attribute('value')==str(CUR) and pg.locator('input[name=class]:checked').get_attribute('value')=='' and 'қазір' in pg.locator('label:has(input[name=quarter]:checked)').inner_text())
    pick(pg,'quarter','1-тоқсан')
    ok('G1 one gallery per subject, alphabetical, with counts', heads(pg)==['Информатика · 3','Математика · 1'], str(heads(pg)))
    ok('G1 inside a subject: latest taught first, not taught yet last', titles(pg,'Информатика')==['Циклдер','Айнымалылар','Шартты оператор'], str(titles(pg,'Информатика')))
    cyc=pg.locator('li:has(h4 a:text-is("Циклдер"))')
    ok('G1 card: classes with session counts, last date, edit link', cyc.locator('span:text-is("7B · 2")').count()==1 and cyc.locator('span:text-is("7A · 1")').count()==1 and 'Соңғысы' in cyc.inner_text() and cyc.locator('a[aria-label="Циклдер: өңдеу"]').get_attribute('href')=='#edit/l1')
    ok('G1 untaught lesson says so', pg.locator('li:has(h4 a:text-is("Шартты оператор"))').inner_text().count('Әлі өтілмеген')==1)
    ok('G1 the Lessons tab "Менің сабақтарым" is current', pg.locator('nav[aria-label$="бөлімдері"] a[aria-current=page]').inner_text().strip()=='Менің сабақтарым')
    axe(pg,'gallery')
    # G2 class filter
    pick(pg,'class','7A'); ok('G2 class 7A: only what 7A had, plus untaught lessons without a class', heads(pg)==['Информатика · 2','Математика · 1'] and titles(pg,'Информатика')==['Циклдер','Шартты оператор'], str(titles(pg,'Информатика')))
    ok('G2 count on the card follows the filter', pg.locator('li:has(h4 a:text-is("Циклдер")) span:text-is("7A · 1")').count()==1 and pg.locator('li:has(h4 a:text-is("Циклдер")) span:text-is("7B · 2")').count()==0)
    pg.reload(); pg.wait_for_selector('section[aria-label="Информатика"]')
    ok('G2 filters survive a reload in the same tab', pg.locator('input[name=class]:checked').get_attribute('value')=='c7a' and pg.locator('input[name=quarter]:checked').get_attribute('value')=='1')
    # G3 other quarter / whole time
    pick(pg,'class','Барлық сынып'); pick(pg,'quarter','2-тоқсан')
    ok('G3 empty quarter: only lessons never taught remain', heads(pg)==['Информатика · 1'] and titles(pg,'Информатика')==['Шартты оператор'], str(heads(pg)))
    pick(pg,'quarter','Барлығы'); pick(pg,'class','7B')
    ok('G3 whole time, class 7B: lesson taught earlier shows both sessions', pg.locator('li:has(h4 a:text-is("Айнымалылар")) span:text-is("7B · 2")').count()==1, pg.locator('li:has(h4 a:text-is("Айнымалылар"))').inner_text())
    pg.focus('input[name=quarter]:checked'); pg.keyboard.press('ArrowLeft')
    ok('G3 arrow keys change the quarter (native radios)', pg.locator('input[name=quarter]:checked').get_attribute('value')!='0')
    pick(pg,'quarter','1-тоқсан'); pick(pg,'class','Барлық сынып')
    # D1 detail
    pg.click('li:has(h4 a:text-is("Циклдер")) h4 a'); pg.wait_for_selector('h1:text-is("Циклдер")')
    ok('D1 card opens the lesson page, tab "Менің сабақтарым" still current', pg.url.endswith('#lesson/l1') and pg.locator('nav[aria-label$="бөлімдері"] a[aria-current=page]').inner_text().strip()=='Менің сабақтарым')
    ok('D1 one tab per class it was taught to, in natural order', pg.locator('[role=tab]').all_inner_texts()==['7A','7B'])
    ok('D1 first class opens: its single session, its three students', num(pg,'Өткен сабақ')=='1' and num(pg,'Қатысқан оқушы')=='3' and num(pg,'Жалпы ұпай')=='200', pg.locator('main').inner_text()[:300])
    pg.click('[role=tab]:text-is("7B")'); pg.wait_for_selector('dt:text-is("Өткен сабақ")')
    ok('D2 class 7B is counted on its own: 2 sessions, 1300 points', num(pg,'Өткен сабақ')=='2' and num(pg,'Жалпы ұпай')=='1300', num(pg,'Жалпы ұпай'))
    r=rows(pg); ok('D2 student table: sorted by points, joined x/2', [x[0] for x in r][:2]==['Айдар Нұрланов','Дана Сәрсенова'] and r[0][1]=='2 / 2' and r[0][2]=='450' and r[2][2]=='400', str(r))
    ok('D2 session list: two entries with date, status, winner', pg.locator('section[aria-label="Өткен сабақтар"] li').count()==2 and 'үздік' in pg.locator('section[aria-label="Өткен сабақтар"] li').first.inner_text())
    ok('D2 the sessions panel is a labelled tabpanel', pg.locator('#lc-panel').get_attribute('aria-labelledby')=='lc-tab-c7b')
    axe(pg,'lesson page (7B)')
    pg.focus('[role=tab][aria-selected=true]'); pg.keyboard.press('ArrowLeft'); pg.wait_for_selector('[role=tab]:text-is("7A")[aria-selected=true]')
    ok('D2 arrow keys move between class tabs', num(pg,'Жалпы ұпай')=='200')
    # D3 quarter inside a lesson
    pg.goto(B+'?demo=teacher#lessons/mine'); pg.wait_for_selector('section[aria-label="Информатика"]'); pg.click('li:has(h4 a:text-is("Айнымалылар")) h4 a'); pg.wait_for_selector('h1:text-is("Айнымалылар")')
    ok('D3 this quarter: 7B has 1 session', num(pg,'Өткен сабақ')=='1')
    pick(pg,'quarter','Барлығы'); ok('D3 whole time: the session from last school year is included', num(pg,'Өткен сабақ')=='2')
    pick(pg,'quarter','2-тоқсан'); ok('D3 empty quarter: says so and keeps the start button', pg.locator('text=таңдалған кезеңде сабақ өтпеген').count()==1 and pg.locator('button:has-text("Осы сыныппен бастау")').is_disabled())
    pick(pg,'quarter','1-тоқсан')
    # D4 lesson never taught: choose a class
    pg.goto(B+'?demo=teacher#lesson/l3'); pg.wait_for_selector('h1:text-is("Шартты оператор")')
    ok('D4 never taught: no tabs, hint', pg.locator('[role=tab]').count()==0 and pg.locator('text=ешбір сыныппен өтілмеген').count()==1)
    pg.select_option('select','c7a'); pg.wait_for_selector('[role=tab]:text-is("7A")[aria-selected=true]')
    ok('D4 add a class: its tab appears with start button (disabled in demo)', pg.locator('button:has-text("Осы сыныппен бастау")').is_disabled() and pg.locator('text=Демо режимде').count()==1)
    pg.click('a:has-text("Барлық сабақтар")'); pg.wait_for_selector('section[aria-label="Информатика"]'); ok('D4 back link returns to the gallery', pg.url.endswith('#lessons/mine'))
    pg.goto(B+'?demo=teacher#lesson/nope'); pg.wait_for_selector('text=Сабақ табылмады'); ok('D5 unknown lesson: clear message', True)
    # A themes and sizes
    pg.goto(GAL); pg.wait_for_selector('section[aria-label="Информатика"]'); pick(pg,'quarter','1-тоқсан')
    for th in ('dark','ocean','sand'):
        pg.evaluate(f"document.documentElement.dataset.theme='{th}'"); pg.wait_for_timeout(400); axe(pg,f'gallery ({th})')
    pg.evaluate("document.documentElement.dataset.theme='light'")
    pg.goto(B+'?demo=teacher#lesson/l1'); pg.wait_for_selector('h1:text-is("Циклдер")')
    for th in ('dark','ocean','sand'):
        pg.evaluate(f"document.documentElement.dataset.theme='{th}'"); pg.wait_for_timeout(400); axe(pg,f'lesson page ({th})')
    for name,url in (('gallery',GAL),('lesson page',B+'?demo=teacher#lesson/l1')):
        m=page((390,800)); m.goto(url); m.wait_for_selector('h3, h1:text-is("Циклдер")'); m.wait_for_timeout(400)
        w=m.evaluate("document.documentElement.scrollWidth"); ok(f'A 390px {name}: no sideways scroll', w<=390, str(w))
    ok('no console errors', not errors, str(errors[:3]))
    b.close()
bad=[r for r in results if not r[1]]; print(f'{len(results)-len(bad)} / {len(results)} passed'); sys.exit(1 if bad else 0)
