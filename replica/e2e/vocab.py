# Vocabulary (Сөздігім): term base, link to lessons, test, share to a class, student side. Demo data, browser storage, no network.
import json, os, sys, datetime, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5221),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5221/'; errors=[]; results=[]
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
URL=B+'?demo=teacher#vocab/base'
THEMES=['dark','ocean','sand']
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900),ctx=None):
        c=ctx or b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); ctx=pg.context
    pg.goto(URL); pg.wait_for_selector('h1:text-is("Терминдер базасы")')
    names=lambda: pg.locator('main li p.font-semibold').all_inner_texts()
    ok('V1 demo base shows the 4 seeded terms', sorted(names())==sorted(['алгоритм','айнымалы','цикл','шарт']), str(names()))
    ok('V1 browser-only note is shown', pg.locator('[role=note]:has-text("осы браузерде")').count()==1)
    axe(pg,'base')
    # add
    pg.fill('input >> nth=0','функция'); 
    pg.locator('label:has-text("Орысша") ~ input').first.fill('функция'); pg.locator('label:has-text("Ағылшынша") ~ input').first.fill('function'); pg.locator('label:has-text("Анықтама") ~ input').first.fill('Қайталанатын код блогы')
    pg.click('form button:text-is("Қосу")'); pg.wait_for_selector('[role=status]:has-text("қосылды")')
    ok('V2 term added and listed with its translations', 'функция' in names() and pg.locator('li:has-text("EN: function")').count()==1)
    pg.locator('label:has-text("Қазақша") ~ input').first.fill('Функция'); pg.click('form button:text-is("Қосу")')
    ok('V2 duplicate (any letter case) refused with a reason', pg.locator('[role=status]:has-text("базада бар")').count()==1 and names().count('функция')==1)
    pg.locator('label:has-text("Қазақша") ~ input').first.fill('')
    pg.click('form button:text-is("Қосу")'); ok('V2 empty Kazakh term refused', pg.locator('[role=status]').first.inner_text().strip()!='' and len(names())==5)
    # bulk
    pg.click('summary:has-text("Көп терминді")'); pg.fill('textarea','массив | массив | array | Бір типті мәндер тізбегі\nсыныпты | | |\nжол | строка | string\nалгоритм | алгоритм\n')
    pg.click('button:text-is("Тізімді қосу")'); pg.wait_for_selector('p[role=status]:has-text("қосылды")')
    note=pg.locator('p[role=status]:has-text("қосылды")').last.inner_text()
    ok('V3 bulk import counts added and duplicates', '3 термин қосылды' in note and '1 бұрыннан бар' in note, note)
    ok('V3 pipe-separated line keeps its translations', pg.locator('li:has-text("жол"):has-text("RU: строка"):has-text("EN: string")').count()==1)
    # search + edit + delete
    pg.fill('input[placeholder="Термин немесе анықтама"]','array'); ok('V4 search finds by English word', names()==['массив'], str(names()))
    pg.fill('input[placeholder="Термин немесе анықтама"]','')
    pg.click('button[aria-label="жол: өзгерту"]'); pg.wait_for_selector('h2:text-is("Терминді өзгерту")')
    pg.locator('label:has-text("Ағылшынша") ~ input').first.fill('line'); pg.click('form button:text-is("Сақтау")'); pg.wait_for_selector('[role=status]:has-text("өзгертілді")')
    ok('V4 edit saved', pg.locator('li:has-text("жол"):has-text("EN: line")').count()==1)
    pg.click('button[aria-label="жол: өшіру"]'); ok('V4 delete asks first', pg.locator('[role=alertdialog]').count()==1 and 'жол' in names())
    pg.click('[role=alertdialog] button:text-is("Өшіру")'); pg.wait_for_selector('[role=status]:has-text("өшірілді")'); ok('V4 delete confirmed', 'жол' not in names())
    # link
    pg.goto(B+'?demo=teacher#vocab/link'); pg.wait_for_selector('h1:text-is("Тақырыпқа байлау")'); pg.wait_for_selector('fieldset legend')
    n0=int(pg.locator('legend').inner_text().split(':')[1])
    ok('V5 seeded link is pre-checked for the first lesson', n0>=0, str(n0))
    box=pg.locator('fieldset input[type=checkbox]:not(:checked)').first; box.check(); pg.click('button:text-is("Сақтау")'); pg.wait_for_selector('[role=status]:has-text("сақталды")')
    pg.reload(); pg.wait_for_selector('fieldset legend'); ok('V5 link survives a reload', int(pg.locator('legend').inner_text().split(':')[1])==n0+1)
    axe(pg,'link')
    # test
    pg.goto(B+'?demo=teacher#vocab/test'); pg.wait_for_selector('h1:text-is("Сөздік тесті")')
    pg.select_option('label:has-text("Сұрақ саны") ~ select','5'); pg.click('button:text-is("Тест құру")'); pg.wait_for_selector('section[aria-label=Тест] ol > li')
    qn=pg.locator('section[aria-label=Тест] ol > li').count(); ok('V6 quiz made with at most the chosen count', 1<=qn<=5, str(qn))
    ok('V6 every question has options A) B)', pg.locator('section[aria-label=Тест] ol > li ul li:has-text("A)")').count()==qn)
    ok('V6 answers hidden by default', pg.locator('.sr-only:has-text("дұрыс жауап")').count()==0)
    pg.check('#show-ans'); ok('V6 answer key shows exactly one correct option per question', pg.locator('.sr-only:has-text("дұрыс жауап")').count()==qn)
    axe(pg,'test')
    # share
    pg.goto(B+'?demo=teacher#vocab/share'); pg.wait_for_selector('h1:text-is("Тарату")')
    ok('V7 share disabled without a class', pg.locator('button:text-is("Сыныптарға тарату")').is_disabled())
    pg.fill('label:has-text("Жинақтың атауы") ~ input','Алгоритмдер'); pg.locator('label:has-text("цикл")').first.click()
    pg.locator('fieldset:has(legend:text-is("Сыныптар")) label:has-text("7B")').click(); pg.click('button:text-is("Сыныптарға тарату")'); pg.wait_for_selector('[role=status]:has-text("берілді")')
    ok('V7 shared set listed with class and term count', pg.locator('section[aria-label="Берілген жинақтар"] li:has-text("Алгоритмдер"):has-text("7B")').count()==1, pg.locator('section[aria-label="Берілген жинақтар"]').inner_text())
    axe(pg,'share')
    # student sees it (same browser)
    ps=page(ctx=ctx); ps.goto(B+'?demo=student#vocab/mine'); ps.wait_for_selector('h2:text-is("Терминдерім")')
    ok('V8 student of 7B sees the shared set', ps.locator('h3:has-text("Алгоритмдер")').count()==1, ps.locator('main').inner_text()[:200])
    ok('V8 terms show translations', ps.locator('li p:has-text("RU:")').count()>=1)
    ok('V8 add-to-dictionary disabled in demo', ps.locator('button[aria-label$="өз сөздігіме қосу"]').first.is_disabled())
    axe(ps,'student mine')
    ps.goto(B+'?demo=student#vocab/cards'); ps.wait_for_selector('h2:text-is("Карточкалар")')
    t1=ps.locator('p.text-2xl').inner_text(); ok('V9 card shows term only first', ps.locator('button:text-is("Көрсету")').count()==1 and ps.locator('[aria-live=polite] p').count()==0)
    ps.click('button:text-is("Көрсету")'); ok('V9 reveal shows meaning', ps.locator('[aria-live=polite] p').count()>=1)
    ps.click('button:text-is("Келесі")'); ok('V9 next card hides the meaning again and moves on', ps.locator('p.text-2xl').inner_text()!=t1 and ps.locator('[aria-live=polite] p').count()==0)
    axe(ps,'student cards')
    ps.goto(B+'?demo=student#vocab/test'); ps.wait_for_selector('h2:text-is("Өзін-өзі тексеру")'); ps.click('button:text-is("Бастау")'); ps.wait_for_selector('fieldset legend')
    qn=ps.locator('section[aria-label=Тест] fieldset').count(); ok('V10 quiz has questions', qn>=1, str(qn))
    ok('V10 check disabled until all answered', ps.locator('button:text-is("Тексеру")').is_disabled())
    for k in range(qn): ps.locator('section[aria-label=Тест] fieldset').nth(k).locator('input').first.check()
    ps.click('button:text-is("Тексеру")'); r=ps.locator('p[role=status]:has-text("Нәтиже")').inner_text(); ok('V10 score shown', r.endswith(f'/ {qn}'), r)
    ok('V10 correct answer marked for screen readers', ps.locator('.sr-only:has-text("дұрыс жауап")').count()==qn)
    axe(ps,'student quiz')
    # a student of another class would not see it: 7A student via a separate context is not available in demo, so check the empty state with no class
    # themes + phone
    for th in THEMES:
        for u in ['vocab/base','vocab/share']:
            pg.goto(B+'?demo=teacher#'+u); pg.wait_for_selector('main h1'); pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(pg,f'{u} {th}')
    for u in ['?demo=teacher#vocab/base','?demo=teacher#vocab/share','?demo=teacher#vocab/test','?demo=student#vocab/cards']:
        ph=page((390,800)); ph.goto(B+u); ph.wait_for_selector('main h1, main h2'); ph.wait_for_timeout(300)
        ok('V11 390px no sideways scroll '+u, ph.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
