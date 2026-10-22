# Class gradebook (Журнал › Сынып журналы): ҚБ/БЖБ/ТЖБ columns, marks, percentages, quarter grade 25/25/50. Demo data, browser storage, no network.
import json, os, sys, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5215),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5215/'; errors=[]; results=[]
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
URL=B+'?demo=teacher#journal/grid'
def pick(pg,group,label): pg.locator(f'fieldset:has(input[name={group}]) label:has-text("{label}")').first.click()
def row(pg,name): return [c.strip() for c in pg.locator(f'tr:has(th:text-is("{name}")) td').all_inner_texts()]
def cell(pg,label): return pg.locator(f'input[aria-label="{label}"]')
def setv(pg,label,v): c=cell(pg,label); c.fill(v); c.press('Enter')
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    pg=page(); pg.goto(URL); pg.wait_for_selector('h1:text-is("Сынып журналы")'); pg.wait_for_selector('text=оқушы жоқ')
    ok('B1 tab is the journal grid and current', pg.locator('nav[aria-label="Журнал бөлімдері"] a[aria-current=page]').inner_text().strip()=='Сынып журналы')
    ok('B1 first class is picked, no "all classes" option', pg.locator('input[name=class]:checked').get_attribute('value')=='c7a')
    ok('B1 no "whole time" quarter option', pg.locator('input[name=quarter]').count()==4 and pg.locator('input[name=class][value=""]').count()==0)
    # 7A has no students in the demo -> empty state; then 7B
    ok('B2 class without students says so', pg.locator('text=оқушы жоқ').count()==1 and pg.locator('table').count()==0)
    pick(pg,'class','7B'); pg.wait_for_selector('table')
    ok('B3 three students in name order', [x.strip() for x in pg.locator('tbody th').all_inner_texts()]==['Айдар Нұрланов','Дана Сәрсенова','Ерлан Қасымов'])
    ok('B3 columns grouped: ҚБ ×2, БЖБ ×1', pg.locator('thead th:text-is("ҚБ")').count()>=1 and pg.locator('thead th[scope=col] span.font-semibold:has-text("ҚБ")').count()==2 and pg.locator('thead th[scope=col] span.font-semibold:has-text("БЖБ 1")').count()==1)
    ok('B3 БЖБ header shows the points-to-grade thresholds (15 -> 3≥6, 4≥10, 5≥13)', pg.locator('thead').inner_text().count('3≥6 · 4≥10 · 5≥13')==1)
    # Aidar: kb 9+8=17/20=85%, bzb 13/15=86.7% -> provisional (no ТЖБ): (85*25+86.67*25)/50=85.83 -> 5
    r=row(pg,'Айдар Нұрланов'); ok('B4 Aidar: ҚБ 85%, БЖБ 87%, no ТЖБ, total 86%, grade 5 provisional', r[-5:-1]==['85%','87%','—','86%'] and r[-1].replace('\n',' ').startswith('5') and 'уақытша' in r[-1], str(r))
    # Erlan: kb only 3/10 (the empty ҚБ 2 is not a zero) =30%, bzb 5/15=33.3% -> 31.7% -> 2
    r=row(pg,'Ерлан Қасымов'); ok('B4 Erlan: empty cell is not a zero (ҚБ 30%), grade 2', r[-5]=='30%' and r[-1].replace('\n',' ').startswith('2'), str(r))
    ok('B4 per-БЖБ grade shown next to the mark', row(pg,'Айдар Нұрланов')[2].replace('\n',' ').endswith('5') and row(pg,'Дана Сәрсенова')[2].replace('\n',' ').endswith('3'), str(row(pg,'Дана Сәрсенова')))
    axe(pg,'gradebook')
    for th in ['dark','ocean','sand']:
        pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')"); axe(pg,'gradebook theme '+th)
    pg.evaluate("document.documentElement.setAttribute('data-theme','light')")
    # B5 entering marks: ТЖБ column then ТЖБ marks -> not provisional any more
    pick(pg,'kind','ТЖБ'); ok('B5 ТЖБ proposes 25 points', pg.locator('input[aria-invalid]').count()==0 and pg.locator('label:has-text("Ең жоғары ұпай") ~ input').input_value()=='25')
    pg.fill('label:has-text("Ең жоғары ұпай") ~ input','28'); pg.click('button:text-is("Қосу")')
    ok('B5 ТЖБ with 28 points refused with the allowed values', pg.locator('text=25 немесе 30').count()>=2 and pg.locator('thead th:text-is("ТЖБ")').count()==1)
    pg.fill('label:has-text("Ең жоғары ұпай") ~ input','25'); pg.click('button:text-is("Қосу")'); pg.wait_for_selector('input[aria-label="Айдар Нұрланов: ТЖБ 1"]')
    ok('B5 new column appears with a default title', cell(pg,'Айдар Нұрланов: ТЖБ 1').count()==1)
    setv(pg,'Айдар Нұрланов: ТЖБ 1','22'); setv(pg,'Ерлан Қасымов: ТЖБ 1','8'); setv(pg,'Дана Сәрсенова: ТЖБ 1','17.5')
    r=row(pg,'Айдар Нұрланов'); ok('B5 22/25 = 88% ТЖБ; quarter = (85·25+86.7·25+88·50)/100 = 86.9% -> 5, not provisional', r[-3]=='88%' and r[-2]=='87%' and r[-1].replace('\n',' ')=='5' , str(r))
    r=row(pg,'Дана Сәрсенова'); ok('B5 Dana: 17,5/25 = 70% ТЖБ allowed in halves', r[-3]=='70%', str(r))
    # B6 validation of a mark
    setv(pg,'Ерлан Қасымов: ҚБ 2','11'); ok('B6 mark above the maximum is refused and explained', pg.locator('[role=status]:has-text("0 мен 10 аралығында")').count()==1 and cell(pg,'Ерлан Қасымов: ҚБ 2').get_attribute('aria-invalid')=='true')
    setv(pg,'Ерлан Қасымов: ҚБ 2','abc'); ok('B6 text refused', cell(pg,'Ерлан Қасымов: ҚБ 2').get_attribute('aria-invalid')=='true')
    setv(pg,'Ерлан Қасымов: ҚБ 2','10'); ok('B6 valid mark clears the error and recalculates (ҚБ 13/20 = 65%)', cell(pg,'Ерлан Қасымов: ҚБ 2').get_attribute('aria-invalid') is None and row(pg,'Ерлан Қасымов')[-5]=='65%', str(row(pg,'Ерлан Қасымов')))
    setv(pg,'Ерлан Қасымов: ҚБ 2','0'); ok('B6 zero is a real zero (ҚБ 3/20 = 15%)', row(pg,'Ерлан Қасымов')[-5]=='15%', str(row(pg,'Ерлан Қасымов')))
    setv(pg,'Ерлан Қасымов: ҚБ 2',''); ok('B6 clearing the cell makes it "not assessed" again (30%)', row(pg,'Ерлан Қасымов')[-5]=='30%')
    # B7 persistence: reload keeps columns and marks (browser storage in the demo)
    pg.reload(); pg.wait_for_selector('table')
    pick(pg,'class','7B'); pg.wait_for_selector('table')
    ok('B7 marks and the new column survive a reload', cell(pg,'Айдар Нұрланов: ТЖБ 1').input_value()=='22' and row(pg,'Айдар Нұрланов')[-1].replace('\n',' ')=='5')
    # B8 quarters are separate
    q_other='1-тоқсан' if pg.locator('input[name=quarter]:checked').get_attribute('value')!='1' else '2-тоқсан'
    pick(pg,'quarter',q_other); pg.wait_for_selector('text=Бұл тоқсанда баған жоқ'); ok('B8 another quarter starts empty, own marks stay apart', pg.locator('text=Бұл тоқсанда баған жоқ').count()==1 and pg.locator('table').count()==0)
    pg.fill('label:has-text("Атауы") ~ input','БЖБ жаңа'); pick(pg,'kind','БЖБ'); pg.click('button:text-is("Қосу")')
    ok('B8 column added to the other quarter only', pg.locator('thead th[scope=col]').count()>=1 and pg.locator('text=БЖБ жаңа').count()>=1)
    # B9 delete a column with confirmation
    pg.click('button[aria-label$="бағанды өшіру"]'); ok('B9 asks before deleting', pg.locator('[role=alertdialog]').count()==1)
    pg.click('[role=alertdialog] button:text-is("Болдырмау")'); ok('B9 cancel keeps it', pg.locator('[role=alertdialog]').count()==0 and pg.locator('text=БЖБ жаңа').count()>=1)
    pg.click('button[aria-label$="бағанды өшіру"]'); pg.click('[role=alertdialog] button:text-is("Өшіру")'); ok('B9 delete removes it', pg.locator('text=Бұл тоқсанда баған жоқ').count()==1)
    # B10 phone
    pg2=page((390,800)); pg2.goto(URL); pg2.wait_for_selector('h1:text-is("Сынып журналы")'); pick(pg2,'class','7B'); pg2.wait_for_selector('table')
    ok('B10 390px: page does not scroll sideways (table scrolls inside its box)', pg2.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    ok('B10 student column stays sticky', pg2.locator('tbody th').first.evaluate("e=>getComputedStyle(e).position")=='sticky')
    axe(pg2,'gradebook phone')
    # B11 student cannot see it
    ps=page(); ps.goto(B+'?demo=student#journal/grid'); ps.wait_for_timeout(500)
    ok('B11 student has no gradebook', ps.locator('h1:text-is("Сынып журналы")').count()==0)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
