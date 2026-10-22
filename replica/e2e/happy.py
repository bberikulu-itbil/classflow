import json, subprocess, time, os, sys, threading, http.server, socketserver, functools, mimetypes
from playwright.sync_api import sync_playwright
DIST='/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist'
OUT=os.environ.get('OUT','/tmp')
PY='/var/tmp/tools/node_modules/pyodide'
CSS=open('/var/tmp/tools/tw.css').read()
AXE=open('/var/tmp/tools/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5201),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
errors=[]; results=[]
def ok(name,cond,extra=''):
    results.append((name,bool(cond),extra)); print(('PASS' if cond else 'FAIL'),name,extra)
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u:
        r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif 'cdn.jsdelivr.net/pyodide' in u:
        f=os.path.join(PY,u.split('/full/')[1].split('?')[0])
        if os.path.exists(f): r.fulfill(path=f,headers={'access-control-allow-origin':'*'})
        else: r.abort()
    elif u.startswith('http://127.0.0.1'): r.continue_()
    else: r.abort()
def axe(pg,name):
    pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,80)))")
    ok('axe '+name, not res, str(res))
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1440,'height':900}); ctx.route('**/*',route)
    pg=ctx.new_page()
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.goto('http://127.0.0.1:5201/?demo=teacher#assign'); pg.wait_for_selector('text=Үй тапсырмасын беру')
    # S16 states: empty list of assigned, slide list loaded
    ok('S16 empty assigned state', pg.locator('text=Әзірге ештеңе берілмеген').count()==1)
    pg.locator('label:has-text("Қосынды")').click()
    pg.screenshot(path=OUT+'/S16-assign-1440.png',full_page=True)
    # validation: no class selected
    pg.click('text=Тапсырма беру'); ok('S16 validation without class', pg.locator('text=Кемінде бір сынып таңда').count()==1)
    pg.locator('label:has-text("7B")').click()
    due=time.strftime('%Y-%m-%dT%H:%M',time.gmtime(time.time()+86400+5*3600))
    pg.fill('input[type=datetime-local] >> nth=1',due)
    axe(pg,'S16')
    pg.click('text=Тапсырма беру'); pg.wait_for_selector('text=1 сыныпқа берілді')
    ok('S16 assigned appears in list', pg.locator('a[href^="#review/"]').count()==1)
    # student
    pg.click('text=Демо: мұғалім'); pg.wait_for_selector('text=Үй тапсырмасы >> nth=0')
    pg.wait_for_selector('a[href^="#hw/"]')
    ok('S04 shows one todo item', pg.locator('a[href^="#hw/"]').count()==1 and pg.locator('text=Орындау керек').count()==1)
    pg.screenshot(path=OUT+'/S04-homework-list-1440.png',full_page=True); axe(pg,'S04')
    pg.click('a[href^="#hw/"]'); pg.wait_for_selector('#hw-code')
    ok('S06 starter loaded', 'a = int(input())' in pg.input_value('#hw-code'))
    ok('S06 hidden test shows no expected text', pg.locator('text=350').count()==0)
    # wrong code first
    pg.fill('#hw-code','a = int(input())\nb = int(input())\nprint(a - b)\n')
    pg.click('button:text-is("Тексеру")'); pg.wait_for_selector('text=тест өтті',timeout=120000)
    ok('S06 wrong code fails tests', pg.locator('text=0/3 тест өтті').count()==1 or pg.locator('text=/[0-2]\\/3 тест өтті/').count()==1, pg.locator('text=/\\/3 тест өтті|Барлық тест/').first.inner_text())
    # paste a big block then correct code
    pg.evaluate("""()=>{const t=document.querySelector('#hw-code');const dt=new DataTransfer();dt.setData('text','#'+'x'.repeat(299));t.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true}))}""")
    code='#'+'x'*299+'\na = int(input())\nb = int(input())\nprint(a + b)\n'
    pg.fill('#hw-code',code)
    pg.click('button:text-is("Тексеру")'); pg.wait_for_selector('text=Барлық тест өтті',timeout=120000)
    ok('S06 correct code passes 3/3 incl. hidden', pg.locator('text=Барлық тест өтті (3/3)').count()==1)
    pg.screenshot(path=OUT+'/S06-ide-1440.png',full_page=True); axe(pg,'S06')
    pg.click('button:has-text("Тексеру және тапсыру")'); pg.wait_for_selector('text=Тапсырылды: 3/3')
    ok('S06 submitted note', True)
    pg.wait_for_selector('text=Тапсырылды >> nth=0')
    # phone layout of IDE
    ph=ctx.new_page(); ph.set_viewport_size({'width':390,'height':844}); ph.on('pageerror',lambda e: errors.append(str(e)))
    ph.goto('http://127.0.0.1:5201/?demo=student#hw'); ph.wait_for_selector('text=Әзірге үй тапсырмасы жоқ')
    ok('S04 empty state', True); ph.screenshot(path=OUT+'/S04-empty-390.png')
    # teacher review in same page (state lives in this page)
    pg.click('text=Демо: оқушы'); pg.wait_for_selector('text=Үй тапсырмасын беру')
    pg.click('a[href^="#review/"]'); pg.wait_for_selector('text=Жұмыстарды қарау')
    ok('S19 three students listed', pg.locator('tbody tr').count()==3)
    ok('S19 others not started', pg.locator('text=Басталмаған').count()==2)
    ok('S19 paste flag shown', pg.locator('text=Тексеру керек').count()>=1)
    pg.click('button:has-text("Айдар")'); pg.wait_for_selector('text=Бағалау')
    ok('S19 code visible', 'print(a + b)' in pg.locator('pre[aria-label="Оқушы коды"]').inner_text())
    ok('S19 paste warning wording', pg.locator('text=айыптау емес').count()==1)
    pg.screenshot(path=OUT+'/S19-review-1440.png',full_page=True); axe(pg,'S19')
    pg.fill('input >> nth=0','5') if False else None
    pts=pg.locator('label:has-text("Ұпай") input'); ok('S19 points prefilled from tests', pts.input_value()=='5', pts.input_value())
    pg.fill('label:has-text("Пікір") input','Жарайсың, келесіде түсініктеме жаз')
    pg.click('button:has-text("Бағалау")'); pg.wait_for_selector('text=Бағаланды')
    ok('S19 finalized chip', pg.locator('tbody >> text=Бағаланды').count()==1)
    # back to student: list shows finalized with feedback, IDE read-only
    pg.click('text=Демо: мұғалім'); pg.wait_for_selector('a[href^="#hw/"]')
    ok('S04 shows finalized + feedback', pg.locator('text=Жарайсың').count()==1 and pg.locator('h2:has-text("Тапсырылған")').count()==1)
    pg.click('a[href^="#hw/"]'); pg.wait_for_selector('#hw-code')
    ok('S06 read-only after grading', pg.locator('#hw-code').get_attribute('readonly') is not None and pg.locator('button:has-text("Тексеру және тапсыру")').count()==0)
    # phone: whole flow screens
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300)
    ok('390px no horizontal scroll (S06)', pg.evaluate('document.documentElement.scrollWidth')<=390, str(pg.evaluate('document.documentElement.scrollWidth')))
    pg.screenshot(path=OUT+'/S06-ide-390.png',full_page=True)
    pg.click('button[role=tab]:has-text("Тапсырма")'); ok('S06 phone tab Тапсырма shows prompt', pg.locator('text=Екі бүтін санды').is_visible())
    pg.goto('http://127.0.0.1:5201/?demo=student#hw'); pg.reload(); pg.wait_for_selector('text=Әзірге үй тапсырмасы жоқ')
    for name,hash_ in (('S16-assign-390','assign'),):
        pg.goto('http://127.0.0.1:5201/?demo=teacher#'+hash_); pg.wait_for_selector('text=Үй тапсырмасын беру')
        ok('390px no horizontal scroll (S16)', pg.evaluate('document.documentElement.scrollWidth')<=390)
        pg.screenshot(path=OUT+'/'+name+'.png',full_page=True)
    b.close()
real=[e for e in errors if 'Failed to load resource' not in e and 'ERR_FAILED' not in e]
ok('no console errors', not real, str(real[:3]))
print(sum(1 for r in results if r[1]),'/',len(results),'passed')
sys.exit(0 if all(r[1] for r in results) else 1)
