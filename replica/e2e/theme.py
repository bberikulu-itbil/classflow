# Themes: picker, persistence, tokens really change, WCAG A/AA (incl. colour contrast) on key screens in every theme.
# Run: python3 theme.py   (needs dist/ built, playwright, TOOLS with tw.css + axe-core)
import json, os, sys, time, base64, threading, http.server, socketserver
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5210),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5210/'; errors=[]; bad5xx=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)


def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif 'cdn.jsdelivr.net/pyodide' in u: r.abort()
    elif u.startswith(B): r.continue_()
    else: r.abort()
def axe(pg,name):
    pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,100)))")
    ok('axe '+name, not res, str(res))
sys.path.insert(0,'/var/tmp/th')
from themes import THEMES as TOK
LABEL={'light':'Жарық','dark':'Қараңғы','ocean':'Теңіз','sand':'Құм'}
OUT='/home/claude/classflow/replica/clone-screens/'
def rgb(h): return 'rgb(%d, %d, %d)'%tuple(int(h[i:i+2],16) for i in (1,3,5))
def assign(pg):
    pg.goto(B+'?demo=teacher#assign'); pg.wait_for_selector('text=Үй тапсырмасын беру')
    pg.locator('label:has-text("Қосынды")').click(); pg.locator('label:has-text("7B")').click()
    pg.fill('input[type=datetime-local] >> nth=1',time.strftime('%Y-%m-%dT%H:%M',time.gmtime(time.time()+86400+5*3600)))
    pg.click('text=Тапсырма беру'); pg.wait_for_selector('text=сыныпқа берілді')
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route); pg=c.new_page()
        pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    bg=lambda pg: pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim().toUpperCase()")
    pg=page(); pg.goto(B+'?demo=teacher#profile'); pg.wait_for_selector('h2:has-text("Тақырып")')
    ok('H1 default is Light, nothing stored', pg.evaluate("document.documentElement.getAttribute('data-theme')") in (None,'light') and pg.evaluate("localStorage.getItem('cf_theme')") is None and bg(pg)=='#F4F5F7')
    radios=pg.locator('input[name=theme]')
    ok('H1 picker: 4 themes, Light selected', radios.count()==4 and pg.locator('input[name=theme]:checked').get_attribute('value')=='light' and [t.split(chr(10))[0].strip() for t in pg.locator('[role=radiogroup][aria-labelledby=theme-h] label').all_inner_texts()]==[LABEL[k] for k in ('light','dark','ocean','sand')])
    ok('H1 each swatch previews its own theme', pg.evaluate("[...document.querySelectorAll('[role=radiogroup][aria-labelledby=theme-h] [data-theme]')].map(e=>getComputedStyle(e).backgroundColor)")==[rgb(TOK[k]['bg']) for k in ('light','dark','ocean','sand')])
    for k in ('dark','ocean','sand','light'):
        pg.locator('[role=radiogroup] label',has_text=LABEL[k]).click(); pg.wait_for_timeout(100)
        ok(f'H2 {k}: applied to the page and remembered', pg.evaluate("document.documentElement.getAttribute('data-theme')")==k and pg.evaluate("localStorage.getItem('cf_theme')")==k and bg(pg)==TOK[k]['bg'], bg(pg))
        ok(f'H2 {k}: page background really is the theme colour', pg.evaluate("getComputedStyle(document.body).backgroundColor")==rgb(TOK[k]['bg']))
    pg.locator('[role=radiogroup] label',has_text='Қараңғы').click(); pg.reload(); pg.wait_for_selector('h2:has-text("Тақырып")')
    ok('H3 dark survives a reload', pg.evaluate("document.documentElement.getAttribute('data-theme')")=='dark' and pg.locator('input[name=theme]:checked').get_attribute('value')=='dark')
    pg.focus('input[name=theme]:checked'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    ok('H3 arrow keys move the choice (keyboard users)', pg.evaluate("document.documentElement.getAttribute('data-theme')")!='dark')
    pg.evaluate("localStorage.setItem('cf_theme','nonsense')"); pg.reload(); pg.wait_for_selector('h2:has-text("Тақырып")')
    ok('H3 unknown saved value: falls back to Light, no crash', pg.locator('input[name=theme]:checked').get_attribute('value')=='light' and bg(pg)=='#F4F5F7')
    # old screens follow the theme too (legacy slate/blue classes)
    lg=page(); lg.add_init_script("try{localStorage.setItem('cf_theme','dark')}catch(e){}"); lg.goto(B); lg.wait_for_selector('input')
    ok('H4 login (old-style screen) follows the theme: dark page, light text', lg.evaluate("getComputedStyle(document.body).backgroundColor")==rgb(TOK['dark']['bg']) and lg.evaluate("getComputedStyle(document.querySelector('h1')).color")==rgb(TOK['dark']['text']))
    # every theme x key screens
    for k in ('light','dark','ocean','sand'):
        init="try{localStorage.setItem('cf_theme','%s')}catch(e){}"%k
        t=page(); t.add_init_script(init)
        for name,h in (('teacher home','#'),('lessons gallery (soon tab)','#lessons/gallery'),('exams (soon cards)','#exams'),('settings/profile','#settings/profile')):
            t.goto(B+'?demo=teacher'+h); t.wait_for_selector('main'); t.wait_for_timeout(200); axe(t,f'{k}: {name}')
        t.goto(B+'?demo=teacher#tasks/jeopardy'); t.wait_for_selector('h2:has-text("Jeopardy")'); t.click('button:has-text("Жаңа ойын")')
        t.fill('label:text-is("Ойын атауы") >> xpath=..//input','Тақырыптарды тексеру'); t.click('button[aria-label="3-тақырыпты өшіру"]'); t.click('button[aria-label="2-тақырыпты өшіру"]')
        t.fill('label:has-text("1-тақырып атауы") >> xpath=..//input','Python')
        for r in (100,200,300): t.fill(f'input[aria-label="Python, {r}: сұрақ"]',f'Сұрақ {r}'); t.fill(f'input[aria-label="Python, {r}: жауап"]','Жауап')
        axe(t,f'{k}: jeopardy editor')
        t.click('button:text-is("Сақтау")'); t.wait_for_selector('text=Тақырыптарды тексеру'); axe(t,f'{k}: jeopardy list')
        t.click('button:text-is("Ойнау")'); t.wait_for_selector('section[aria-label="Python"]'); t.click('button[aria-label="Python, 200"]'); t.click('button:text-is("Жауапты көрсету")')
        axe(t,f'{k}: jeopardy question + answer'); t.screenshot(path=OUT+f'N-theme-{k}-jeopardy-1440.png')
        t.goto(B+'?demo=teacher#'); t.wait_for_selector('main'); t.wait_for_timeout(200); t.screenshot(path=OUT+f'N-theme-{k}-home-1440.png')
        assign(t); axe(t,f'{k}: assign (old screen)')
        t.click('text=Демо: мұғалім'); t.wait_for_selector('a[href^="#hw/"]'); axe(t,f'{k}: student homework list')
        t.click('a[href^="#hw/"]'); t.wait_for_selector('#hw-code'); axe(t,f'{k}: homework IDE'); t.screenshot(path=OUT+f'N-theme-{k}-ide-1440.png')
        lg=page(); lg.add_init_script(init); lg.goto(B); lg.wait_for_selector('input'); axe(lg,f'{k}: login')
        ph=page((390,844)); ph.add_init_script(init); ph.goto(B+'?demo=teacher#'); ph.wait_for_selector('main'); ok(f'{k}: 390px no sideways scroll', ph.evaluate('document.documentElement.scrollWidth')<=390)
    b.close()
real=[e for e in errors if 'Failed to load resource' not in e and 'ERR_FAILED' not in e and 'pyodide' not in e.lower()]
ok('no console errors',not real,str(real[:3]))
print(sum(1 for r in results if r[1]),'/',len(results),'passed'); sys.exit(0 if all(r[1] for r in results) else 1)
