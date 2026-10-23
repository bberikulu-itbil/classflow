# Profile and settings page: profile card, teaching settings (quarter calendar, defaults) that the rest of the app reads. Demo data, browser storage, no network.
import json, os, sys, datetime, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5220),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5220/'; errors=[]; results=[]
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
URL=B+'?demo=teacher#settings/profile'
def dates(pg): return [pg.locator('input[type=date]').nth(i).input_value()[5:] for i in range(8)]
def setdate(pg,i,md): pg.locator('input[type=date]').nth(i).fill(('2001-' if int(md[:2])>=9 else '2002-')+md)
def pick(pg,group,label): pg.locator(f'fieldset:has(input[name={group}]) label:has-text("{label}")').first.click()
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); pg.goto(URL); pg.wait_for_selector('h2:text-is("Оқыту баптаулары")')
    ok('P1 profile card: initial, name, role', pg.locator('span[aria-hidden=true]:text-is("Б")').count()==1 and pg.locator('p:text-is("Бағдәулет Е.")').count()==1)
    ok('P1 empty optional rows (login, school) are hidden, not shown as "—"', pg.locator('span:text-is("Логин")').count()==0 and pg.locator('span:text-is("Мектеп")').count()==0)
    ok('P2 default quarter calendar', dates(pg)==['09-01','10-25','11-03','12-27','01-12','03-20','03-30','05-31'], str(dates(pg)))
    ok('P2 defaults: groups 3, ҚБ max 10', pg.locator('label:has-text("топ саны") ~ input').input_value()=='3' and pg.locator('label:has-text("ҚБ бағанының") ~ input').input_value()=='10')
    axe(pg,'profile (teacher)')
    # P3 validation
    setdate(pg,1,'08-31'); pg.click('button:text-is("Баптауларды сақтау")'); ok('P3 August is refused and explained', pg.locator('[role=alert]:has-text("Тамыз")').count()==1)
    setdate(pg,1,'09-01'); setdate(pg,0,'09-05'); pg.click('button:text-is("Баптауларды сақтау")'); ok('P3 end before start is refused and explained', pg.locator('[role=alert]:has-text("1-тоқсанның аяқталу күні")').count()==1)
    setdate(pg,0,'09-01')
    setdate(pg,1,'10-20'); setdate(pg,2,'10-10'); pg.click('button:text-is("Баптауларды сақтау")'); ok('P3 overlapping quarters refused', pg.locator('[role=alert]:has-text("2-тоқсан 1-тоқсаннан бұрын")').count()==1)
    pg.locator('label:has-text("топ саны") ~ input').fill('9'); setdate(pg,2,'11-05'); pg.click('button:text-is("Баптауларды сақтау")'); ok('P3 groups outside 1-8 refused', pg.locator('[role=alert]:has-text("Топ саны")').count()==1)
    pg.locator('label:has-text("топ саны") ~ input').fill('5'); pg.locator('label:has-text("ҚБ бағанының") ~ input').fill('20'); pg.click('button:text-is("Баптауларды сақтау")'); pg.wait_for_selector('[role=status]:has-text("сақталды")')
    ok('P4 valid settings saved', True)
    # P5 the rest of the app reads them
    pg.reload(); pg.wait_for_selector('h2:text-is("Оқыту баптаулары")')
    ok('P5 survive a reload', dates(pg)[1]=='10-20' and dates(pg)[2]=='11-05' and pg.locator('label:has-text("топ саны") ~ input').input_value()=='5')
    pg.goto(B+'?demo=teacher#lessons/schedule'); pg.wait_for_selector('h1:has-text("КТП")'); pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан'); pg.wait_for_selector('h2:has-text("Ұяшықтар құру")')
    ok('P5 КТП form starts from the saved quarter dates', pg.locator('label:has-text("Бастап") ~ input').input_value()==f'{Y}-09-01' and pg.locator('label:has-text("Дейін") ~ input').input_value()==f'{Y}-10-20')
    pick(pg,'quarter','2-тоқсан'); pg.wait_for_selector('h2:has-text("2-тоқсан")'); ok('P5 quarter 2 starts on 5 November', pg.locator('label:has-text("Бастап") ~ input').input_value()==f'{Y}-11-05')
    pg.goto(B+'?demo=teacher#journal/grid'); pg.wait_for_selector('h1:text-is("Сынып журналы")'); pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан'); pg.wait_for_selector('form button:text-is("Қосу")')
    ok('P5 new ҚБ column proposes the saved maximum (20)', pg.locator('label:has-text("Ең жоғары ұпай") ~ input').last.input_value()=='20')
    # P6 current quarter follows the calendar: check a date exactly on a boundary by reading the quarter chips label for today
    pg.goto(URL); pg.wait_for_selector('h2:text-is("Оқыту баптаулары")'); pg.click('button:text-is("Әдепкіге қайтару")'); pg.wait_for_selector('[role=status]:has-text("Әдепкі")')
    ok('P6 reset restores the defaults', dates(pg)[1]=='10-25' and pg.locator('label:has-text("топ саны") ~ input').input_value()=='3' and pg.evaluate("localStorage.getItem('cf_prefs')") is None)
    # P7 student: the profile without teaching settings
    ps=page(); ps.goto(B+'?demo=student#profile'); ps.wait_for_selector('h1:has-text("Профиль")')
    ok('P7 student has no teaching settings, still has appearance and password', ps.locator('h2:text-is("Оқыту баптаулары")').count()==0 and ps.locator('h2:text-is("Құпиясөзді өзгерту")').count()==1)
    axe(ps,'profile (student)')
    pg.goto(URL); pg.wait_for_selector('h2:text-is("Оқыту баптаулары")')
    for th in ['dark','ocean','sand']:
        pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(pg,'profile '+th)
    pg2=page((390,800)); pg2.goto(URL); pg2.wait_for_selector('h2:text-is("Оқыту баптаулары")')
    ok('P8 390px: no sideways scroll', pg2.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    axe(pg2,'profile phone')
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
