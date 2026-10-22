# Journal: held lessons of the schedule become ҚБ columns (once), and the annual grade table. Demo data, browser storage, no network.
import json, os, sys, datetime, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5219),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5219/'; errors=[]; results=[]
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
CUR=1 if 901<=t.month*100+t.day<1101 else 2 if t.month*100+t.day>=1101 else 3 if t.month*100+t.day<329 else 4 if t.month*100+t.day<901 else 1
def pick(pg,group,label): pg.locator(f'fieldset:has(input[name={group}]) label:has-text("{label}")').first.click()
def annual_row(pg,name): return [c.strip().replace('\n',' ') for c in pg.locator(f'section[aria-label="Жылдық баға"] tr:has(th:text-is("{name}")) td').all_inner_texts()]
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':1440,'height':900}); c.route('**/*',route); pg=c.new_page()
    pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e)))
    # prepare: two held lessons in the schedule (7B, quarter 1)
    pg.goto(B+'?demo=teacher#lessons/schedule'); pg.wait_for_selector('h1:has-text("КТП")')
    pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан')
    pg.fill('label:has-text("Бастап") ~ input',f'{Y}-09-01'); pg.fill('label:has-text("Дейін") ~ input',f'{Y}-09-14'); pg.click('button:text-is("Ұяшықтарды құру")'); pg.wait_for_selector('section[aria-label="1-апта"]')
    pg.select_option('select[aria-label="Сс 01.09, 2-сабақ: дәріс"]',label='Циклдер'); pg.wait_for_function("[...document.querySelectorAll('p')].some(p=>p.innerText.includes('дәріс қойылғаны: 1'))")
    pg.select_option('select[aria-label="Жм 04.09, 4-сабақ: дәріс"]',label='Айнымалылар'); pg.wait_for_function("[...document.querySelectorAll('p')].some(p=>p.innerText.includes('дәріс қойылғаны: 2'))")
    # a slot with no lecture must not be offered
    pg.goto(B+'?demo=teacher#journal/grid'); pg.reload(); pg.wait_for_selector('h1:text-is("Сынып журналы")'); pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан'); pg.wait_for_selector('h2:text-is("Өткен сабақтар")')
    card=pg.locator('div:has(> h2:text-is("Өткен сабақтар"))')
    ok('J1 two held lessons with a lecture are offered, the empty slots are not', card.locator('li').count()==2 and '01.09 · 2-сабақ · Циклдер' in card.inner_text() and '04.09 · 4-сабақ · Айнымалылар' in card.inner_text(), card.inner_text()[:200])
    axe(pg,'journal lessons card')
    card.locator('input').fill('0'); ok('J2 maximum 0 refused, button off', pg.locator('text=ҚБ үшін ең жоғары ұпай').count()>=1 and pg.locator('button:text-is("Сабақтардан ҚБ бағандарын қосу")').is_disabled())
    card.locator('input').fill('5'); pg.click('button:text-is("Сабақтардан ҚБ бағандарын қосу")'); pg.wait_for_selector('h2:text-is("Өткен сабақтар")',state='detached')
    ok('J3 columns created from the lessons (ҚБ, date, max 5) and the card goes away', pg.locator('thead span.font-semibold:text-is("Циклдер")').count()==1 and pg.locator('thead span.font-semibold:text-is("Айнымалылар")').count()==1 and pg.locator('table').first.locator('thead').inner_text().count('01.09 · max 5')==1)
    pg.reload(); pg.wait_for_selector('h1:text-is("Сынып журналы")'); pick(pg,'class','7B'); pick(pg,'quarter','1-тоқсан'); pg.wait_for_selector('thead span.font-semibold:text-is("Циклдер")')
    ok('J4 after reload the lessons are not offered again (one column per lesson)', pg.locator('h2:text-is("Өткен сабақтар")').count()==0 and pg.locator('thead span.font-semibold:text-is("Циклдер")').count()==1)
    # annual
    ok('J5 annual table: new empty columns do not create a grade (quarter 1 is empty unless it is the demo quarter)', (annual_row(pg,'Айдар Нұрланов')[0]=='—') == (CUR!=1))
    for lab,v in [('Циклдер','5'),('Айнымалылар','4')]:
        i=pg.locator(f'input[aria-label="Айдар Нұрланов: {lab}"]'); i.fill(v); i.press('Enter')
    pg.wait_for_function("document.querySelector('section[aria-label=\"Жылдық баға\"] tbody tr td').innerText.trim().startsWith('5')")
    row=annual_row(pg,'Айдар Нұрланов')
    ok('J5 quarter 1 now has a grade (ҚБ ≈ 87-90% -> 5, provisional) and the year says provisional', row[0].startswith('5') and 'уақытша' in row[0] and row[4].split(' ')[0]=='5' and 'уақытша' in row[4], str(row))
    ok('J5 annual table lists every student', pg.locator('section[aria-label="Жылдық баға"] tbody tr').count()==3)
    axe(pg,'journal annual')
    for th in ['dark','sand']:
        pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(pg,'journal annual '+th)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
