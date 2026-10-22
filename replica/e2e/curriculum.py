# Content library (Сабақтар › Курстар, Модульдер мен дәрістер): course -> module -> lesson. Demo data, browser storage, no network.
import json, os, sys, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5216),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5216/'; errors=[]; results=[]
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
COURSES=B+'?demo=teacher#lessons/courses'
def lessons_of(pg,mod): return [x.strip() for x in pg.locator(f'section[aria-label="{mod}"] ol li a').all_inner_texts()]
def modules(pg): return [pg.locator('section input').nth(i).input_value() for i in range(pg.locator('section > div > input').count())]
def free(pg): return pg.locator('p:has-text("Модульге қосылмаған дәрістер")').inner_text()
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); pg.goto(COURSES); pg.wait_for_selector('h1:text-is("Курстар")')
    ok('C1 tab is current and real (not "soon")', pg.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='Курстар')
    ok('C1 demo course with counts', pg.locator('li:has(h2:text-is("Информатика 7"))').inner_text().count('2 модуль · 2 дәріс')==1, '')
    ok('C1 subject and grade shown', 'Информатика · 7-сынып' in pg.locator('li:has(h2:text-is("Информатика 7"))').inner_text())
    axe(pg,'courses')
    pg.click('button:text-is("Қосу")'); ok('C2 empty title refused', pg.locator('text=Курстың атауын жазыңыз').count()==1 and pg.locator('li:has(h2)').count()==1)
    pg.fill('label:has-text("Атауы") ~ input','Математика 7'); pg.fill('label:has-text("Пән") ~ input','Математика'); pg.select_option('select','7'); pg.click('button:text-is("Қосу")')
    pg.wait_for_selector('h2:text-is("Математика 7")')
    ok('C2 course added, empty', '0 модуль · 0 дәріс' in pg.locator('li:has(h2:text-is("Математика 7"))').inner_text() and pg.locator('label:has-text("Атауы") ~ input').input_value()=='')
    pg.click('a[aria-label="Математика 7: ашу"]'); pg.wait_for_selector('h1:text-is("Модульдер мен дәрістер")')
    ok('C3 "Ашу" opens that course in the modules tab', pg.locator('input[name=course]:checked').evaluate("e=>e.parentElement.innerText.trim()")=='Математика 7' and pg.locator('text=Бұл курста модуль жоқ').count()==1)
    ok('C3 modules tab is current', pg.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='Модульдер мен дәрістер')
    pg.locator('fieldset:has(input[name=course]) label:has-text("Информатика 7")').click(); pg.wait_for_selector('section[aria-label="Алгоритмдер"]')
    ok('C4 modules in order, lessons in order', lessons_of(pg,'Алгоритмдер')==['Циклдер','Айнымалылар'] and pg.locator('section[aria-label="Бағдарламалау негіздері"]').count()==1, str(lessons_of(pg,'Алгоритмдер')))
    ok('C4 free lessons counted', '2.' in free(pg), free(pg))
    axe(pg,'modules')
    ok('C5 first lesson cannot go up, last cannot go down', pg.locator('button[aria-label="Циклдер: жоғары"]').is_disabled() and pg.locator('button[aria-label="Айнымалылар: төмен"]').is_disabled())
    pg.click('button[aria-label="Циклдер: төмен"]'); pg.wait_for_function("document.querySelector('section[aria-label=\"Алгоритмдер\"] ol li a').innerText.trim()==='Айнымалылар'")
    ok('C5 lesson moves down', lessons_of(pg,'Алгоритмдер')==['Айнымалылар','Циклдер'])
    pg.select_option('select[aria-label="Бағдарламалау негіздері: дәріс қосу"]', label='Шартты оператор'); pg.click('section[aria-label="Бағдарламалау негіздері"] button:text-is("Дәріс қосу")')
    pg.wait_for_selector('section[aria-label="Бағдарламалау негіздері"] ol')
    ok('C6 lesson added to the second module, free count drops', lessons_of(pg,'Бағдарламалау негіздері')==['Шартты оператор'] and '1.' in free(pg), free(pg))
    ok('C6 the same lesson is not offered again', 'Шартты оператор' not in pg.locator('select[aria-label="Алгоритмдер: дәріс қосу"]').inner_text())
    ok('C6 lesson links to its editor', pg.locator('section[aria-label="Бағдарламалау негіздері"] ol a').get_attribute('href').startswith('#edit/'))
    pg.click('button[aria-label="Шартты оператор: модульден алу"]'); pg.wait_for_selector('section[aria-label="Бағдарламалау негіздері"] p:text-is("Модульде дәріс жоқ.")')
    ok('C7 removing from a module only unlinks it', '2.' in free(pg) and 'Шартты оператор' in pg.locator('select[aria-label="Алгоритмдер: дәріс қосу"]').inner_text())
    # rename + persistence
    n=pg.locator('input[aria-label="Модуль 1: атауы"]'); n.fill('Алгоритмдер және блок-схемалар'); n.press('Enter'); pg.wait_for_selector('section[aria-label="Алгоритмдер және блок-схемалар"]')
    ok('C8 rename a module', True)
    n=pg.locator('input[aria-label="Модуль 1: атауы"]'); n.fill(''); n.press('Enter'); ok('C8 empty name is not accepted, old name stays', pg.locator('input[aria-label="Модуль 1: атауы"]').input_value()=='Алгоритмдер және блок-схемалар')
    # add module + move
    pg.fill('label:has-text("Атауы") ~ input','Деректер'); pg.click('form button:text-is("Қосу")'); pg.wait_for_selector('section[aria-label="Деректер"]')
    pg.click('button[aria-label="Деректер: жоғары"]'); pg.wait_for_function("document.querySelectorAll('section > div > input')[1].value==='Деректер'")
    ok('C9 module added and moved up', pg.locator('section > div > input').evaluate_all("els=>els.map(e=>e.value)")==['Алгоритмдер және блок-схемалар','Деректер','Бағдарламалау негіздері'])
    pg.reload(); pg.wait_for_selector('section[aria-label="Деректер"]')
    ok('C9 everything survives a reload (course remembered too)', pg.locator('input[name=course]:checked').evaluate("e=>e.parentElement.innerText.trim()")=='Информатика 7' and lessons_of(pg,'Алгоритмдер және блок-схемалар')==['Айнымалылар','Циклдер'])
    # delete module: cancel, then yes; lessons survive
    pg.click('button[aria-label="Алгоритмдер және блок-схемалар: өшіру"]'); ok('C10 asks before deleting', pg.locator('[role=alertdialog]').count()==1)
    pg.click('[role=alertdialog] button:text-is("Болдырмау")'); ok('C10 cancel keeps it', pg.locator('[role=alertdialog]').count()==0 and pg.locator('section[aria-label="Алгоритмдер және блок-схемалар"]').count()==1)
    pg.click('button[aria-label="Алгоритмдер және блок-схемалар: өшіру"]'); pg.click('[role=alertdialog] button:text-is("Өшіру")'); pg.wait_for_selector('section[aria-label="Алгоритмдер және блок-схемалар"]',state='detached')
    ok('C10 deleting a module frees its lessons', '4.' in free(pg), free(pg))
    # delete course from the list
    pg.goto(COURSES); pg.wait_for_selector('h2:text-is("Математика 7")')
    pg.click('button[aria-label="Математика 7: өшіру"]'); pg.click('[role=alertdialog] button:text-is("Өшіру")'); pg.wait_for_selector('h2:text-is("Математика 7")',state='detached')
    ok('C11 course deleted, the other stays', pg.locator('h2:text-is("Информатика 7")').count()==1)
    for th in ['dark','sand']:
        pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(pg,'courses '+th)
    # phone
    pg2=page((390,800)); pg2.goto(B+'?demo=teacher#lessons/modules'); pg2.wait_for_selector('section[aria-label="Алгоритмдер"]')
    ok('C12 390px: no sideways scroll', pg2.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    axe(pg2,'modules phone')
    ps=page(); ps.goto(B+'?demo=student#lessons/courses'); ps.wait_for_timeout(500)
    ok('C13 student has no content library', ps.locator('h1:text-is("Курстар")').count()==0)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
