# Bilingual lectures: a slide may carry `ru`; the preview switches Kazakh <-> Russian, stacked solution slides render, a lecture without ru shows no switch.
import json, os, sys, datetime, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
AXE=open((os.environ.get('TOOLS','/var/tmp/tools'))+'/node_modules/axe-core/axe.min.js').read()
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5228),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5228/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})


import base64 as b64
SCHOOL='sc'; UP=[]
PNG=b64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAQklEQVR4nO3PMQ0AIADAMEAI/qUgCxEcDcmqYJtn7/GzpQNeNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgXZzXAUT9rEu1AAAAAElFTkSuQmCC')
DATA='data:image/svg+xml;utf8,'+"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><rect width='40' height='20' fill='red'/></svg>"
LESSON={'id':'l-9','title':'Екі тілді','subject':'Информатика','terms':[],'slides':[
 {'type':'title','title':'Символьный тип','subtitle':'Дәріс 1','ru':{'subtitle':'Лекция 1'}},
 {'type':'quiz','title':'Тест','prompt':'Код A?','options':['64','65'],'answer':1,'explanation':'65','notes':'қазақша ескертпе','ru':{'prompt':'Код A? (рус)','options':['64 р','65 р'],'explanation':'65, потому что','notes':'русская заметка'}},
 {'type':'solution','title':'Есеп K','sections':[{'h':'Берілуі','bullets':['Шарты']},{'h':'Алгоритм','hide':True,'bullets':['1. қадам','2. қадам']},{'h':'Дайын код','code':'int main(){}','lang':'C++'}],'ru':{'title':'Задача K','sections':[{'h':'Условие','bullets':['Условие текст']},{'h':'Алгоритм','hide':True,'bullets':['1. шаг','2. шаг']},{'h':'Готовый код','code':'int main(){}','lang':'C++'}]}},
 {'type':'leaderboard','title':'Нәтиже','ru':{'title':'Результаты'}}]}
LESSON2={'id':'l-8','title':'Бір тілді','subject':'Информатика','terms':[],'slides':[{'type':'content','title':'Тек қазақша','bullets':['а']}]}
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/storage/v1/object/' in u.path and q.method=='POST': UP.append((u.path,q.headers.get('content-type'),len(q.post_data_buffer or b''))); return out({'Key':'cf-media/x'})
    if name=='profiles': return out(ME)
    if name=='cf_lessons': return pick([LESSON2 if 'l-8' in q.url else LESSON])
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and 'realtime' not in u: stub(r)
    else: r.abort()
def axe(pg,name,ctx='document'):
    pg.wait_for_timeout(300); pg.evaluate(AXE)
    res=pg.evaluate("axe.run("+ctx+",{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
        pg=c.new_page(); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text and 'Refused to' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    V=page(); V.goto(B+'#preview/l-9'); V.wait_for_selector('h1:text-is("Символьный тип")')
    sw='button[aria-label^="Слайд тілі"]'
    ok('L1 a bilingual lecture offers the language switch, starting in Kazakh', V.locator(sw).count()==1 and 'ҚАЗ' in V.locator(sw).inner_text() and V.locator('text=Дәріс 1').count()==1)
    V.click(sw); V.wait_for_selector('text=Лекция 1')
    ok('L2 switching shows the Russian fields and keeps the rest', V.locator('text=Дәріс 1').count()==0 and V.locator('h1:text-is("Символьный тип")').count()==1 and 'РУС' in V.locator('button[aria-label^="Язык слайдов"]').inner_text())
    V.select_option('select[aria-label="Слайдқа өту"]',index=1)
    rg=V.locator('[role=region]').inner_text(); nt=V.locator('[role=note]').inner_text()
    ok('L3 quiz: options and the teacher hint come in Russian, the right answer stays B', 'B. 65 р' in rg and 'Дұрыс жауап: B. 65 р' in nt and 'русская заметка' in nt and 'қазақша' not in nt, rg+' || '+nt)
    V.select_option('select[aria-label="Слайдқа өту"]',index=2)
    h=V.locator('[role=region] section h3'); ok('L4 solution slide stacks its sections top to bottom', h.count()==3 and V.locator('h2:text-is("Задача K")').count()==1 and h.nth(0).inner_text()=='Условие')
    ys=[V.locator('[role=region] section').nth(k).bounding_box()['y'] for k in range(3)]; ok('L4 …in the written order', ys==sorted(ys) and ys[0]<ys[1]<ys[2], str(ys))
    ok('L4 …with the code in a block at the end', V.locator('[role=region] section pre').count()==1 and 'int main' in V.locator('[role=region] section pre').inner_text())
    ok('L4b a section marked hide shows only its heading and a button', V.locator('[role=region]').inner_text().count('1. шаг')==0 and V.locator('[role=region] button[aria-label="Алгоритм: көрсету"]').count()==1)
    V.click('[role=region] button[aria-label="Алгоритм: көрсету"]'); ok('L4b …a click opens it', '1. шаг' in V.locator('[role=region]').inner_text() and V.locator('[role=region] button[aria-label="Алгоритм: көрсету"]').count()==0)
    V.select_option('select[aria-label="Слайдқа өту"]',index=3); ok('L5 a slide with only a few ru fields falls back for the rest (leaderboard title)', V.locator('h2:text-is("Результаты")').count()==1)
    V.reload(); V.wait_for_selector('h1:text-is("Символьный тип")'); ok('L6 the choice is remembered', V.locator('button[aria-label^="Язык слайдов"]').count()==1)
    V.click('button[aria-label^="Язык слайдов"]'); V.select_option('select[aria-label="Слайдқа өту"]',index=2); axe(V,'solution slide, Kazakh')
    V.click(sw); axe(V,'solution slide, Russian')
    V.set_viewport_size({'width':390,'height':800}); V.select_option('select[aria-label="Слайдқа өту"]',index=2)
    ok('L7 390px: no sideways page scroll on the stacked slide', V.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    O=page(); O.goto(B+'#preview/l-8'); O.wait_for_selector('h2:text-is("Тек қазақша")'); ok('L8 a lecture without ru shows no language switch', O.locator('button[aria-label^="Слайд тілі"], button[aria-label^="Язык слайдов"]').count()==0)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
