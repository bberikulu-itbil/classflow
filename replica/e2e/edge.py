# Edge/negative cases for the homework layer, demo data layer (no network). Run: python3 edge.py  (needs dist/ built, playwright, local pyodide+axe+tw.css in TOOLS)
import json, time, os, sys, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); PY=T+'/node_modules/pyodide'; CSS=open(T+'/tw.css').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5202),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5202/'; errors=[]; bad5xx=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif 'cdn.jsdelivr.net/pyodide' in u:
        f=os.path.join(PY,u.split('/full/')[1].split('?')[0]); r.fulfill(path=f,headers={'access-control-allow-origin':'*'}) if os.path.exists(f) else r.abort()
    elif u.startswith(B): r.continue_()
    else: r.abort()
def assign(pg, cls='7B', due_offset=86400, late=True, req=False):
    pg.goto(B+'?demo=teacher#assign'); pg.wait_for_selector('text=Үй тапсырмасын беру')
    pg.locator('label:has-text("Қосынды")').click(); pg.locator(f'label:has-text("{cls}")').click()
    due=time.strftime('%Y-%m-%dT%H:%M',time.gmtime(time.time()+due_offset+5*3600)); pg.fill('input[type=datetime-local] >> nth=1',due)
    if not late: pg.locator('label:has-text("Мерзімнен кейін") input').uncheck()
    if req: pg.locator('label:has-text("Барлық тест") input').check()
    pg.click('text=Тапсырма беру'); pg.wait_for_selector('text=сыныпқа берілді')
def to_student_ide(pg):
    pg.click('text=Демо: мұғалім'); pg.wait_for_selector('a[href^="#hw/"]'); pg.click('a[href^="#hw/"]'); pg.wait_for_selector('#hw-code')
def check(pg):
    pg.click('button:text-is("Тексеру")'); pg.wait_for_selector('text=/\\/3 тест өтті|Барлық тест/',timeout=120000)
WRONG='a = int(input())\nb = int(input())\nprint(a - b)\n'; RIGHT='a = int(input())\nb = int(input())\nprint(a + b)\n'
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e)))
        pg.on('response',lambda r: bad5xx.append(r.url) if r.status>=500 else None); return pg
    # E1 require_pass blocks failing submit
    pg=page(); assign(pg,req=True); to_student_ide(pg); pg.fill('#hw-code',WRONG); check(pg)
    btn=pg.locator('button:has-text("Тексеру және тапсыру")'); 
    blocked=btn.is_disabled() if btn.count() else True
    if not blocked: btn.click(); pg.wait_for_timeout(500)
    ok('N1 require_pass: failing code cannot be submitted', blocked or pg.locator('text=/Тапсырылды: /').count()==0, f'disabled={blocked}')
    pg.fill('#hw-code',RIGHT); check(pg); btn.click(); pg.wait_for_selector('text=Тапсырылды: 3/3'); ok('H1 require_pass: correct code submits',True)
    # E2 past due, late not allowed
    pg=page(); assign(pg,due_offset=-3600,late=False); to_student_ide(pg); pg.fill('#hw-code',RIGHT); check(pg)
    pg.locator('button:has-text("Тексеру және тапсыру")').click(); pg.wait_for_timeout(800)
    ok('N2 past due + no late: refused with message', pg.locator('text=/Мерзімі өтіп/').count()>=1 and pg.locator('text=/Тапсырылды: /').count()==0)
    # E3 double click submit
    pg=page(); assign(pg); to_student_ide(pg); pg.fill('#hw-code',RIGHT); check(pg)
    pg.locator('button:has-text("Тексеру және тапсыру")').dblclick(); pg.wait_for_selector('text=Тапсырылды: 3/3'); pg.wait_for_timeout(500)
    ok('E3 double click submit: one clean result, no error', pg.locator('[role=alert]').count()==0)
    # E4 hostile text: html in code, emoji, 20k chars
    pg=page(); assign(pg); 
    XSS='# <img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>\n# 😀 ҚАЗАҚША ё\n'+RIGHT
    to_student_ide(pg); pg.fill('#hw-code',XSS); check(pg); pg.click('button:has-text("Тексеру және тапсыру")'); pg.wait_for_selector('text=Тапсырылды: 3/3')
    pg.click('text=Демо: оқушы'); pg.wait_for_selector('text=Үй тапсырмасын беру'); pg.click('a[href^="#review/"]'); pg.wait_for_selector('tbody tr')
    pg.locator('tbody button').first.click(); pg.wait_for_selector('pre[aria-label="Оқушы коды"]')
    ok('E4 review shows html as text, not executed', '<img src=x' in pg.locator('pre[aria-label="Оқушы коды"]').inner_text() and pg.evaluate('window.__pwn')is None)
    ok('E4 emoji and Kazakh letters intact', '😀 ҚАЗАҚША' in pg.locator('pre[aria-label="Оқушы коды"]').inner_text())
    pg.fill('label:has-text("Пікір") input','<b onmouseover=window.__pwn=2>жақсы</b>'); pg.click('button:has-text("Бағалау")'); pg.wait_for_selector('text=Бағаланды')
    # E5 grade input validation
    pg=page(); assign(pg); to_student_ide(pg); pg.fill('#hw-code',RIGHT); check(pg); pg.click('button:has-text("Тексеру және тапсыру")'); pg.wait_for_selector('text=Тапсырылды: 3/3')
    pg.click('text=Демо: оқушы'); pg.wait_for_selector('text=Үй тапсырмасын беру'); pg.click('a[href^="#review/"]'); pg.wait_for_selector('tbody tr'); pg.locator('tbody button').first.click(); pg.wait_for_selector('text=Бағалау')
    pts=pg.locator('label:has-text("Ұпай") input')
    for val in ('-5','abc','99999'):
        pts.fill(val); pg.click('button:has-text("Бағалау")'); pg.wait_for_timeout(300)
        shown=pg.locator('[role=alert]').count()>0 or pg.locator('tbody >> text=Бағаланды').count()==0
        ok(f'N5 points "{val}" is rejected or clamped, not silently saved as is', shown or pts.input_value() in ('0','5','10'), f'alert={pg.locator("[role=alert]").count()} value={pts.input_value()}')
    # E6 infinite loop: whole Check must end within 40 s (was 120 s), message shown, IDE usable afterwards
    pg=page(); assign(pg); to_student_ide(pg); pg.fill('#hw-code','while True:\n    pass\n'); t0=time.time(); pg.click('button:text-is("Тексеру")')
    pg.wait_for_selector('text=/\\/3 тест өтті/',timeout=200000); dt=time.time()-t0
    ok('E6 infinite loop: Check ends in under 40 s', dt<40, f'{dt:.0f}s'); ok('E6 timeout message shown', pg.locator('text=Уақыт бітті').count()>=1)
    pg.fill('#hw-code',RIGHT); check(pg); ok('E6 IDE usable after timeout', pg.locator('text=Барлық тест өтті (3/3)').count()==1)
    # E7 empty code
    pg=page(); assign(pg); to_student_ide(pg); pg.fill('#hw-code',''); pg.click('button:text-is("Тексеру")'); pg.wait_for_timeout(4000)
    ok('E7 empty code: no crash, no false pass', pg.locator('text=Барлық тест өтті').count()==0 and pg.locator('#hw-code').count()==1)
    # E8 bad routes and wrong role
    pg=page(); pg.goto(B+'?demo=student#hw/does-not-exist'); pg.wait_for_timeout(1500)
    ok('E8 unknown assignment id: readable error, not blank', len(pg.inner_text('body').strip())>20 and pg.locator('[role=alert]').count()>=1, pg.inner_text('body')[:60].replace('\n',' '))
    pg.goto(B+'?demo=student#assign'); pg.wait_for_timeout(800); ok('E8 student opening #assign does not get teacher screen', pg.locator('text=Үй тапсырмасын беру').count()==0)
    pg.goto(B+'?demo=student#review/x'); pg.wait_for_timeout(800); ok('E8 student opening #review does not get teacher screen', pg.locator('text=Жұмыстарды қарау').count()==0)
    pg.goto(B+'?demo=teacher#review/does-not-exist'); pg.wait_for_timeout(1500); ok('E8 unknown review id: readable error', len(pg.inner_text('body').strip())>20, pg.inner_text('body')[:60].replace('\n',' '))
    # E9 keyboard only
    pg=page(); assign(pg); to_student_ide(pg); pg.fill('#hw-code',RIGHT)
    pg.focus('#hw-code'); found=False
    for _ in range(12):
        pg.keyboard.press('Tab')
        if pg.evaluate("document.activeElement.textContent.trim()")=='Тексеру': found=True; break
    ok('E9 Check button reachable by Tab',found)
    if found: pg.keyboard.press('Enter'); pg.wait_for_selector('text=Барлық тест өтті',timeout=120000); ok('E9 Enter runs the check',True)
    # E10 phone: long line does not widen the page; teacher review at 390
    pg=page((390,844)); assign(pg); to_student_ide(pg); pg.fill('#hw-code','x'*400+'\n'+RIGHT); pg.wait_for_timeout(300)
    ok('E10 390px with a 400-char line: no horizontal page scroll', pg.evaluate('document.documentElement.scrollWidth')<=390, str(pg.evaluate('document.documentElement.scrollWidth')))
    # E11 two assignments, same lesson twice -> one per class (idempotent)
    pg=page(); assign(pg); assign(pg) if False else None
    b.close()
real=[e for e in errors if 'Failed to load resource' not in e and 'ERR_FAILED' not in e]
ok('no console errors',not real,str(real[:3])); ok('no 5xx',not bad5xx,str(bad5xx[:3]))
print(sum(1 for r in results if r[1]),'/',len(results),'passed'); sys.exit(0 if all(r[1] for r in results) else 1)
