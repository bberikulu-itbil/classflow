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
    ok('C1 demo course with counts', pg.locator('li:has(h2:text-is("Информатика 7"))').inner_text().count('3 модуль · 2 дәріс')==1, '')
    ok('C1 subject and grade shown', 'Информатика · 7-сынып' in pg.locator('li:has(h2:text-is("Информатика 7"))').inner_text())
    axe(pg,'courses')
    pg.click('button:text-is("Қосу")'); ok('C2 empty title refused', pg.locator('text=Курстың атауын жазыңыз').count()==1 and pg.locator('li:has(h2)').count()==1)
    pg.fill('label:has-text("Атауы") ~ input','Математика 7'); pg.fill('label:has-text("Пән") ~ input','Математика'); pg.select_option('select','7'); pg.click('button:text-is("Қосу")')
    pg.wait_for_selector('h2:text-is("Математика 7")')
    ok('C2 course added, empty', '0 модуль · 0 дәріс' in pg.locator('li:has(h2:text-is("Математика 7"))').inner_text() and pg.locator('label:has-text("Атауы") ~ input').input_value()=='')
    pg.click('a[aria-label="Математика 7: ашу"]'); pg.wait_for_selector('h1:text-is("Модульдер мен дәрістер")')
    ok('C3 "Ашу" opens that course in the modules tab', pg.locator('input[name=course]:checked').evaluate("e=>e.parentElement.innerText.trim()")=='Математика 7' and pg.locator('text=Бұл сүзгіде модуль жоқ').count()==1)
    ok('C3 modules tab is current', pg.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='Сабақтар')
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
    pg.click('button:has-text("Жасау")'); pg.click('button:text-is("Модуль жасау")'); pg.fill('label:has-text("Атауы") ~ input','Деректер'); pg.click('form button:text-is("Модуль жасау")'); pg.wait_for_selector('section[aria-label="Деректер"]')
    pg.click('button[aria-label="Деректер: жоғары"]'); pg.wait_for_function("document.querySelectorAll('section > div > input')[1].value==='Деректер'")
    ok('C9 module added and moved up', pg.locator('section > div > input').evaluate_all("els=>els.map(e=>e.value)")==['Алгоритмдер және блок-схемалар','Деректер','Бағдарламалау негіздері'])
    pg.reload(); pg.wait_for_selector('section[aria-label="Деректер"]')
    ok('C9 everything survives a reload (course remembered too)', pg.locator('input[name=course]:checked').evaluate("e=>e.parentElement.innerText.trim()")=='Информатика 7' and lessons_of(pg,'Алгоритмдер және блок-схемалар')==['Айнымалылар','Циклдер'])
    # start from the modules screen: pick a class, every lecture gets a start button
    pg.goto(B+'?demo=teacher#lessons/modules'); pg.wait_for_selector('section[aria-label^="Алгоритмдер"]')
    ok('C14 Модульдер is the first tab of Сабақтар', pg.locator('nav[aria-label="Сабақтар бөлімдері"] a').first.inner_text().strip()=='Сабақтар')
    ok('C14 no class chosen: no start buttons, hint explains', pg.locator('button:has-text("Бастау")').count()==0 and pg.locator('p:has-text("Сыныпты таңдасаңыз")').count()==1)
    pg.locator('fieldset:has(input[name=start-class]) label:has-text("7B")').click()
    nl=pg.locator('section ol li').count()
    ok('C14 class chosen: one start button per lecture, named with lecture and class', pg.locator('button:has-text("Бастау · 7B")').count()==nl and nl>0 and pg.locator('button[aria-label$="сыныбымен бастау"]').first.get_attribute('aria-label').endswith('7B сыныбымен бастау'))
    ok('C14 demo: start is off and says so', pg.locator('button:has-text("Бастау · 7B")').first.is_disabled() and pg.locator('p:has-text("Демо режимде")').count()==1)
    pg.reload(); pg.wait_for_selector('section[aria-label^="Алгоритмдер"]'); ok('C14 chosen class is remembered', pg.locator('input[name=start-class]:checked').evaluate("e=>e.parentElement.innerText.trim()")=='7B')
    axe(pg,'modules with a class chosen')
    pg.locator('fieldset:has(input[name=start-class]) label:has-text("Таңдалмаған")').click()
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
    # ---- module type, quarter, parallel, filters, create menu ----
    F=page(); F.goto(B+'?demo=teacher#lessons/modules'); F.wait_for_selector('section[aria-label="Алгоритмдер"]')
    names=lambda: F.locator('section > div > input').evaluate_all("els=>els.map(e=>e.value)")
    chip=lambda g,t: F.locator(f'fieldset:has(input[name={g}]) label:has-text("{t}")')
    ok('F1 default view: this quarter, lesson modules only (course module hidden)', chip('show','Осы тоқсан').evaluate("e=>e.querySelector('input').checked") and names()==['Алгоритмдер','Бағдарламалау негіздері'], str(names()))
    ok('F2 chips carry counts', F.locator('fieldset:has(input[name=show])').inner_text().replace('\n',' ').count('·')>=3 and 'Осы тоқсан · 2' in F.locator('fieldset:has(input[name=show])').inner_text() and 'Курстар · 1' in F.locator('fieldset:has(input[name=show])').inner_text())
    ok('F2 module cover says type, quarter, parallel and lecture count', 'Сабақ · ' in F.locator('section[aria-label="Алгоритмдер"] div[aria-hidden=true] span').inner_text() and '7-сынып · 2 дәріс' in F.locator('section[aria-label="Алгоритмдер"] div[aria-hidden=true] span').inner_text(), F.locator('section[aria-label="Алгоритмдер"] div[aria-hidden=true] span').inner_text())
    ok('F2 a quarter-less module says so', 'Тоқсансыз' in F.locator('section[aria-label="Бағдарламалау негіздері"] div[aria-hidden=true] span').inner_text())
    chip('show','Курстар').click(); F.wait_for_selector('section[aria-label="Робототехника үйірмесі"]')
    ok('F3 courses filter: only the course module, with its type and parallel', names()==['Робототехника үйірмесі'] and 'Курс · 8-сынып' in F.locator('section div[aria-hidden=true] span').inner_text(), str(names()))
    ok('F3 a course module has no quarter to pick', F.locator('select[aria-label="Робототехника үйірмесі: тоқсаны"]').is_disabled())
    chip('show','Барлық сабақтар').click(); chip('grade','8-сынып').click(); F.wait_for_selector('text=Бұл сүзгіде модуль жоқ')
    ok('F4 parallel 8 has no lesson module: empty state with a way out', F.locator('button:text-is("Сүзгіні тазалау")').count()==1)
    F.click('button:text-is("Сүзгіні тазалау")'); F.wait_for_selector('section[aria-label="Алгоритмдер"]'); ok('F4 clearing restores all lesson modules', names()==['Алгоритмдер','Бағдарламалау негіздері'] and chip('grade','Барлығы').evaluate("e=>e.querySelector('input').checked"))
    chip('show','Осы тоқсан').click(); chip('grade','7-сынып').click(); ok('F4 parallel 7 keeps both lesson modules', names()==['Алгоритмдер','Бағдарламалау негіздері'])
    chip('grade','Барлығы').click()
    # change type / quarter of a module
    F.select_option('select[aria-label="Алгоритмдер: тоқсаны"]', index=0); F.wait_for_timeout(200)
    ok('F5 quarter "Барлық тоқсан" keeps the module in this quarter', 'Алгоритмдер' in names())
    F.select_option('select[aria-label="Алгоритмдер: тоқсаны"]', value='1'); F.select_option('select[aria-label="Алгоритмдер: тоқсаны"]', value='3'); F.wait_for_timeout(200)
    ok('F5 module of another quarter leaves the "this quarter" view', 'Алгоритмдер' not in names(), str(names()))
    chip('show','Барлық сабақтар').click(); ok('F5 but stays under "all lessons" with its quarter', 'Алгоритмдер' in names() and '3-тоқсан' in F.locator('section[aria-label="Алгоритмдер"] div[aria-hidden=true] span').inner_text())
    F.select_option('select[aria-label="Алгоритмдер: түрі"]', value='course'); F.wait_for_timeout(200)
    ok('F5 turning it into a course removes it from lesson views and clears its quarter', 'Алгоритмдер' not in names())
    chip('show','Курстар').click(); ok('F5 and shows it under courses, no quarter', 'Алгоритмдер' in names() and F.locator('select[aria-label="Алгоритмдер: тоқсаны"]').input_value()=='' and 'Курс' in F.locator('section[aria-label="Алгоритмдер"] div[aria-hidden=true] span').inner_text())
    F.reload(); F.wait_for_selector('h1:text-is("Модульдер мен дәрістер")'); chip('show','Курстар').click(); ok('F5 survives a reload', 'Алгоритмдер' in [x for x in F.locator('section > div > input').evaluate_all("els=>els.map(e=>e.value)")])
    F.select_option('select[aria-label="Алгоритмдер: түрі"]', value='lesson'); chip('show','Барлық сабақтар').click()
    # create menu
    F.click('button:has-text("Жасау")'); ok('F6 menu offers a module and a lecture', F.locator('#create-menu button:text-is("Модуль жасау")').count()==1 and F.locator('#create-menu a:text-is("Дәріс жасау")').get_attribute('href')=='#edit/new' and F.locator('button:has-text("Жасау")').first.get_attribute('aria-expanded')=='true')
    F.keyboard.press('Escape'); ok('F6 Escape closes the menu and returns focus to its button', F.locator('#create-menu').count()==0 and F.evaluate("document.activeElement.textContent.trim()")=='Жасау')
    F.click('button:has-text("Жасау")'); F.click('h1'); ok('F6 click outside closes it', F.locator('#create-menu').count()==0)
    F.click('button:has-text("Жасау")'); F.click('#create-menu button:text-is("Модуль жасау")'); F.wait_for_selector('form:has(label:text-is("Атауы"))')
    ok('F7 form opens with the name focused', F.evaluate("document.activeElement.labels && document.activeElement.labels[0].textContent")=='Атауы')
    F.click('form button:text-is("Модуль жасау")'); ok('F7 empty name refused', F.locator('text=Модульдің атауын жазыңыз').count()==1)
    ok('F7 default type is lesson with this quarter preselected', F.locator('input[name=new-kind]:checked').evaluate("e=>e.value")=='lesson' and F.locator('label:text-is("Тоқсан") ~ select').input_value()!='')
    F.locator('fieldset:has(input[name=new-kind]) label:has-text("Курс")').click(); ok('F7 course type: no quarter', F.locator('label:text-is("Тоқсан") ~ select').is_disabled())
    F.fill('label:text-is("Атауы") ~ input','Үйірме 2'); F.select_option('label:text-is("Параллель") ~ select', value='9'); axe(F,'modules with the create form'); F.click('form button:text-is("Модуль жасау")')
    F.wait_for_selector('form:has(label:text-is("Атауы"))', state='detached'); chip('show','Курстар').click(); F.wait_for_selector('section[aria-label="Үйірме 2"]')
    ok('F7 new course module sits under courses with its parallel', 'Курс · 9-сынып' in F.locator('section[aria-label="Үйірме 2"] div[aria-hidden=true] span').inner_text() and 'Курстар · 2' in F.locator('fieldset:has(input[name=show])').inner_text(), F.locator('fieldset:has(input[name=show])').inner_text())
    chip('grade','9-сынып').click(); ok('F7 parallel chip for 9 appeared', names()==['Үйірме 2'])
    # the lessons gallery has the same menu
    F.goto(B+'?demo=teacher#lessons/mine'); F.wait_for_selector('h2:text-is("Менің сабақтарым")'); F.click('button:has-text("Жасау")')
    ok('F8 gallery: same two choices', F.locator('#create-menu button:text-is("Модуль жасау")').count()==1 and F.locator('#create-menu a:text-is("Дәріс жасау")').count()==1)
    F.click('#create-menu button:text-is("Модуль жасау")'); F.wait_for_selector('form:has(label:text-is("Атауы"))'); ok('F8 "Модуль жасау" lands on the modules screen with the form open', 'lessons/modules' in F.evaluate('location.hash'))
    F.goto(B+'?demo=teacher#lessons/mine'); F.wait_for_selector('h2:text-is("Менің сабақтарым")'); axe(F,'lessons gallery (create menu closed)'); F.click('button:has-text("Жасау")'); axe(F,'lessons gallery (create menu open)')
    for th in ['dark','ocean','sand']:
        F.goto(B+'?demo=teacher#lessons/modules'); F.wait_for_selector('section[aria-label="Алгоритмдер"]'); F.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(F,'modules '+th)
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
