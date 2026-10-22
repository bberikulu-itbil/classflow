# Jeopardy side panel (demo mode, no network): look, people + random teams, rules, history.
# Run: python3 jeopardy_panel.py   (needs dist/ built, playwright, TOOLS with tw.css + axe-core)
import json, os, sys, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5212),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5212/'; errors=[]; results=[]
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
URL=B+'?demo=teacher#tasks/jeopardy'
PANEL='aside[aria-label="Jeopardy параметрлері"]'
def tab(pg,name): pg.click(f'{PANEL} [role=tab]:text-is("{name}")')
def members(pg):  # team cards in the people tab: [[names], ...]
    return pg.evaluate("[...document.querySelectorAll('aside section[aria-label=\"Командаларға бөлу\"] li')].map(li=>li.lastElementChild.textContent.split(', '))")
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); pg.goto(URL); pg.wait_for_selector('h2:has-text("Jeopardy")')
    # P1 open / close
    btn=pg.locator('button:has-text("Параметрлер")'); btn.click(); pg.wait_for_selector(PANEL)
    ok('P1 panel opens with focus on its heading, button says expanded', pg.evaluate('document.activeElement.textContent')=='Параметрлер' and btn.get_attribute('aria-expanded')=='true')
    ok('P1 four sections as tabs', pg.locator(f'{PANEL} [role=tab]').all_inner_texts()==['Көрініс','Қатысушылар','Ережелер','Тарих'])
    pg.keyboard.press('Escape'); ok('P1 Esc closes it and the focus goes back to the button', pg.locator(PANEL).count()==0 and pg.evaluate('document.activeElement.textContent').strip()=='Параметрлер')
    btn.click(); pg.wait_for_selector(PANEL); pg.click(f'{PANEL} button[aria-label="Панельді жабу"]'); ok('P1 close button works', pg.locator(PANEL).count()==0)
    btn.click(); pg.wait_for_selector(PANEL)
    pg.focus(f'{PANEL} [role=tab][aria-selected=true]'); pg.keyboard.press('ArrowRight'); pg.wait_for_selector(f'{PANEL} [role=tab]:text-is("Қатысушылар")[aria-selected=true]')
    ok('P1 arrow key moves to the next tab', pg.locator(f'{PANEL} [role=tabpanel]').get_attribute('aria-labelledby')=='jp-tab-people')
    # P2 look
    tab(pg,'Көрініс'); pg.check(f'{PANEL} input[name=theme][value=dark]', force=True)
    ok('P2 dark theme applies and is remembered', pg.evaluate("document.documentElement.dataset.theme")=='dark' and pg.evaluate("localStorage.getItem('cf_theme')")=='dark')
    pg.check(f'{PANEL} input[name=font][value="130"]', force=True)
    ok('P2 biggest text: root font 130%', pg.evaluate("getComputedStyle(document.documentElement).fontSize")=='20.8px')
    pg.reload(); pg.wait_for_selector('h2:has-text("Jeopardy")')
    ok('P2 theme and size survive a reload (set before first paint)', pg.evaluate("document.documentElement.dataset.theme")=='dark' and pg.evaluate("getComputedStyle(document.documentElement).fontSize")=='20.8px')
    pg.click('button:has-text("Параметрлер")'); pg.check(f'{PANEL} input[name=font][value="100"]', force=True); pg.check(f'{PANEL} input[name=theme][value=light]', force=True)
    # P3 people
    tab(pg,'Қатысушылар')
    ok('P3 empty list hint', pg.locator(f'{PANEL} >> text=Әзірге ешкім жоқ').count()==1)
    pg.fill(f'{PANEL} textarea','Аян\nБота, Ерлан;  Дана\nаян'); pg.click(f'{PANEL} button:text-is("Қосу") >> nth=0')
    ok('P3 several names at once, repeat (any case) is skipped', pg.locator(f'{PANEL} section[aria-label="Қатысушылар тізімі"] li').count()==4 and 'Қатысушылар · 4' in pg.locator(f'{PANEL} h3').first.inner_text())
    pg.click(f'{PANEL} button[aria-label="Бота: тізімнен алып тастау"]'); ok('P3 one person removed', pg.locator(f'{PANEL} section[aria-label="Қатысушылар тізімі"] li').count()==3)
    pg.select_option(f'{PANEL} select','c7b'); pg.click(f'{PANEL} button:has-text("Қосу") >> nth=1'); pg.wait_for_selector(f'{PANEL} >> text=оқушы қарастырылды')
    names=pg.locator(f'{PANEL} section[aria-label="Қатысушылар тізімі"] li span').all_inner_texts()
    ok('P3 whole class added; same name not twice', len(names)==len(set(n.lower() for n in names)) and 'Айдар Нұрланов' in names and 'Дана Сәрсенова' in names and len(names)==6, str(names))
    axe(pg,'panel people (light)')
    pg.fill(f'{PANEL} input[type=number]','2'); pg.click(f'{PANEL} button:has-text("Рандом бөлу")')
    t=members(pg); flat=sorted(x for g in t for x in g)
    ok('P3 split in 2: sizes 3+3, everyone exactly once', sorted(len(g) for g in t)==[3,3] and flat==sorted(names), str(t))
    seen={json.dumps(sorted(map(sorted,members(pg))))}
    for _ in range(12): pg.click(f'{PANEL} button:has-text("Рандом бөлу")'); seen.add(json.dumps(sorted(map(sorted,members(pg)))))
    ok('P3 pressing again gives different splits', len(seen)>=3, str(len(seen)))
    pg.fill(f'{PANEL} input[type=number]','4'); pg.click(f'{PANEL} button:has-text("Рандом бөлу")'); t=members(pg)
    ok('P3 split in 4 of 6: sizes 2,2,1,1', sorted(len(g) for g in t)==[1,1,2,2], str(t))
    pg.fill(f'{PANEL} input[type=number]','8'); pg.click(f'{PANEL} button:has-text("Рандом бөлу")')
    ok('P3 more teams than people: no empty teams', all(len(g)>=1 for g in members(pg)) and len(members(pg))==6)
    pg.fill(f'{PANEL} input[type=number]','3'); pg.click(f'{PANEL} button:has-text("Рандом бөлу")')
    pg.keyboard.press('Escape'); pg.reload(); pg.wait_for_selector('h2:has-text("Jeopardy")'); pg.click('button:has-text("Параметрлер")'); tab(pg,'Қатысушылар')
    ok('P3 list and teams are still there after reload', pg.locator(f'{PANEL} section[aria-label="Қатысушылар тізімі"] li').count()==6 and len(members(pg))==3)
    # P4 rules
    tab(pg,'Ережелер'); pg.fill(f'{PANEL} input[type=number]','50')
    ok('P4 example follows the percent', pg.locator(f'{PANEL} >> text=−150 ұпай').count()==1)
    pg.fill(f'{PANEL} textarea','Жауапқа 20 секунд'); axe(pg,'panel rules (light)')
    pg.keyboard.press('Escape')
    # build a game: 100 and 300
    pg.click('button:has-text("Жаңа ойын")'); pg.fill('label:text-is("Ойын атауы") >> xpath=..//input','Тест ойыны')
    pg.click('button[aria-label="3-тақырыпты өшіру"]'); pg.click('button[aria-label="2-тақырыпты өшіру"]'); pg.fill('label:has-text("-тақырып атауы") >> xpath=..//input','Т')
    for pts,q in ((100,'Бір?'),(300,'Үш?')): pg.fill(f'input[aria-label="Т, {pts}: сұрақ"]',q); pg.fill(f'input[aria-label="Т, {pts}: жауап"]','Ж')
    pg.click('button:text-is("Сақтау")'); pg.wait_for_selector('text=Тест ойыны')
    pg.click('button:text-is("Ойнау")'); pg.wait_for_selector('section[aria-label="Т"]')
    ok('P4 board shows the rule line with the note', pg.locator('p:has-text("Қате жауап: −50% ұпай"):has-text("Жауапқа 20 секунд")').count()==1)
    ok('P4 teams from the split are on the board with their members, scores start at 0', pg.locator('input[aria-label$="-команда атауы"]').count()==3 and pg.locator('[aria-label$=": 0 ұпай"]').count()==3 and pg.locator('text=Айдар Нұрланов').count()==1)
    pg.click('button[aria-label="Т, 300"]'); pg.click('button:text-is("Жауапты көрсету")')
    ok('P4 wrong button shows 50% of 300', pg.locator('button[aria-label="Команда 1: қате, −150"]').count()==1)
    pg.click('button[aria-label="Команда 1: қате, −150"]'); ok('P4 wrong answer takes 150', pg.locator('[aria-label="Команда 1: -150 ұпай"]').count()==1)
    pg.click('button:text-is("Дайын")')
    # P4b can't go below zero
    pg.click('button:has-text("Параметрлер")'); tab(pg,'Ережелер'); pg.uncheck(f'{PANEL} input[type=checkbox]'); pg.keyboard.press('Escape')
    pg.click('button[aria-label="Т, 100"]'); pg.click('button:text-is("Жауапты көрсету")')
    pg.click('button[aria-label="Команда 2: қате, −50"]'); ok('P4 "not below zero": stays at 0', pg.locator('[aria-label="Команда 2: 0 ұпай"]').count()==1)
    pg.click('button[aria-label="Команда 3: дұрыс, +100"]')
    # P5 history: finishing saves once
    pg.click('button:text-is("Дайын")'); pg.wait_for_selector('text=Ойын аяқталды')
    pg.wait_for_selector('text=Нәтиже тарихқа сақталды')
    ok('P5 finished: winner shown, result saved automatically', pg.locator('text=Жеңімпаз: Команда 3 (100)').count()==1 and pg.locator('button:has-text("Нәтижені сақтау")').count()==0)
    pg.click('button:has-text("Параметрлер")'); tab(pg,'Тарих'); pg.wait_for_selector(f'{PANEL} >> text=Тест ойыны')
    ok('P5 history lists it once: winner, scores, members, rules', pg.locator(f'{PANEL} [role=tabpanel] >> text=Тест ойыны').count()==1 and pg.locator(f'{PANEL} li:has-text("Команда 3: 100 · жеңімпаз")').count()==1 and pg.locator(f'{PANEL} >> text=Қате жауап: −50%, нөлден төмен емес').count()==1)
    axe(pg,'panel history (light)')
    # panel inside fullscreen
    pg.keyboard.press('Escape')
    pg.click('button:has-text("Толық экран")'); pg.wait_for_function("document.fullscreenElement!==null")
    pg.click('button:has-text("Параметрлер")'); pg.wait_for_selector(PANEL)
    ok('P6 panel is usable in full screen (lives inside the fullscreen element)', pg.evaluate("document.fullscreenElement.contains(document.querySelector('aside[aria-label=\"Jeopardy параметрлері\"]'))"))
    pg.evaluate("document.exitFullscreen()"); pg.wait_for_function("document.fullscreenElement===null")
    pg.keyboard.press('Escape')
    # P7 second game saves manually, can be deleted
    pg.click('button:text-is("Ойыннан шығу")'); pg.click('button:text-is("Ойнау")'); pg.wait_for_selector('section[aria-label="Т"]')
    ok('P7 new game starts at zero again', pg.locator('[aria-label$=": 0 ұпай"]').count()==3)
    pg.click('button:has-text("Нәтижені сақтау")'); pg.wait_for_selector('text=Нәтиже тарихқа сақталды')
    pg.click('button:has-text("Параметрлер")'); tab(pg,'Тарих'); pg.wait_for_selector(f'{PANEL} li:has-text("жеңімпаз") >> nth=1')
    ok('P7 manual save adds a second entry', pg.locator(f'{PANEL} [role=tabpanel] >> text=Тест ойыны').count()==2)
    pg.click(f'{PANEL} button[aria-label$="нәтижені жою"] >> nth=0'); pg.click(f'{PANEL} button:text-is("Иә")'); pg.wait_for_function("document.querySelectorAll('aside [role=tabpanel] .font-semibold.break-words').length===1")
    ok('P7 delete removes one entry', pg.locator(f'{PANEL} [role=tabpanel] >> text=Тест ойыны').count()==1)
    # P8 axe in every theme, every tab; 390px
    for th in ('light','dark','ocean','sand'):
        pg.evaluate(f"document.documentElement.dataset.theme='{th}'")
        for name in ('Көрініс','Қатысушылар','Ережелер','Тарих'):
            tab(pg,name); axe(pg,f'panel {name} ({th})')
    pg.evaluate("document.documentElement.dataset.theme='light'")
    m=page((390,800)); m.goto(URL); m.wait_for_selector('h2:has-text("Jeopardy")'); m.click('button:has-text("Параметрлер")'); m.wait_for_selector(PANEL)
    for name in ('Көрініс','Қатысушылар','Ережелер','Тарих'):
        tab(m,name); w=m.evaluate("[document.documentElement.scrollWidth, document.querySelector('aside[aria-label=\"Jeopardy параметрлері\"]').getBoundingClientRect().width]")
        ok(f'P8 390px {name}: no sideways scroll, panel fits', w[0]<=390 and w[1]<=390, str(w))
    m.keyboard.press('Escape'); m.click('button:has-text("Жаңа ойын")')  # sanity: page still works with panel closed
    # P9 a student who opened a shared link: no class loader, results stay in the browser
    pg.keyboard.press('Escape'); pg.click('button:text-is("Ойыннан шығу")') if pg.locator('button:text-is("Ойыннан шығу")').count() else None
    pg.click('button[aria-label$="бөлісу сілтемесі"]'); pg.wait_for_selector('input[aria-label="Бөлісу сілтемесі"]')
    link=pg.input_value('input[aria-label="Бөлісу сілтемесі"]'); payload=link.split('#jeopardy/')[1]
    st=page(); st.goto(B+'?demo=student#jeopardy/'+payload); st.wait_for_selector('section[aria-label="Т"]')
    st.click('button:has-text("Параметрлер")'); tab(st,'Қатысушылар')
    ok('P9 student: people tab works but has no "whole class" loader', st.locator(f'{PANEL} textarea').count()==1 and st.locator(f'{PANEL} select').count()==0)
    st.keyboard.press('Escape'); st.click('button[aria-label="Т, 100"]'); st.click('button:text-is("Дайын")'); st.click('button[aria-label="Т, 300"]'); st.click('button:text-is("Дайын")')
    st.wait_for_selector('text=Нәтиже тарихқа сақталды'); st.click('button:has-text("Параметрлер")'); tab(st,'Тарих'); st.wait_for_selector(f'{PANEL} >> text=Тест ойыны')
    ok('P9 student: result is kept in this browser only', st.evaluate("Object.keys(localStorage).some(k=>k.startsWith('cf_jeopardy_runs_'))"))
    ok('P9 no console errors', not errors, str(errors[:3]))
    b.close()
bad=[r for r in results if not r[1]]; print(f'{len(results)-len(bad)} / {len(results)} passed'); sys.exit(1 if bad else 0)
