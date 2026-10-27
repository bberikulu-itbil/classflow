# Lecture editor, page list: add a page (type → template → title), legacy slides read as a type, template vs type change, reorder / copy / delete, undo, save keeps pageType + templateId.
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
srv=socketserver.TCPServer(('127.0.0.1',5229),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5229/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})


import base64 as b64
SCHOOL='sc'; UP=[]; SAVED=[]; DLG=[]; YES=[True]
PNG=b64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAQklEQVR4nO3PMQ0AIADAMEAI/qUgCxEcDcmqYJtn7/GzpQNeNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgXZzXAUT9rEu1AAAAAElFTkSuQmCC')
DATA='data:image/svg+xml;utf8,'+"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><rect width='40' height='20' fill='red'/></svg>"
LESSON={'id':'l-9','title':'Сурет сынағы','subject':'Информатика','terms':[],'slides':[{'type':'title','title':'Кіріспе','subtitle':'сурет'},{'type':'content','title':'Пернетақта','bullets':['qwerty'],'img':DATA,'alt':'Қызыл тіктөртбұрыш'},{'type':'content','title':'Қауіпті','bullets':['x'],'img':'javascript:alert(1)'},{'type':'leaderboard','title':'Нәтиже'}]}
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/storage/v1/object/' in u.path and q.method=='POST': UP.append((u.path,q.headers.get('content-type'),len(q.post_data_buffer or b''))); return out({'Key':'cf-media/x'})
    if name=='profiles': return out(ME)
    if name=='cf_lessons':
        if q.method in ('POST','PATCH'): SAVED.append(json.loads(q.post_data or '{}')); return out([])
        return pick([LESSON])
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
        pg=c.new_page(); pg.on('dialog',lambda d: (DLG.append(d.message), d.accept() if YES[0] else d.dismiss())); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text and 'Refused to' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    E=page(); E.goto(B+'#edit/l-9'); PP='section[aria-label="Беттер"]'; E.wait_for_selector(PP+' li')
    n=len(LESSON['slides']); js=lambda: json.loads(E.locator('details textarea').first.input_value()) if E.locator('details[open]').count() else (E.click('details > summary'), json.loads(E.locator('details textarea').first.input_value()))[1]
    ok('P1 the page list shows every old slide; the raw JSON is folded away', E.locator(PP+' li').count()==n and E.locator('details[open]').count()==0 and 'JSON' in E.locator('details summary').inner_text())
    sel=lambda i,k: E.locator(PP+f' select[aria-label="{i}-бет: {k}"]')
    ok('P2 old slides read as a type: title → slide/Титул, a content slide → slide/Түсіндіру', sel(1,'типі').input_value()=='slide' and sel(1,'үлгісі').input_value()=='title' and sel(2,'үлгісі').input_value()=='explanation')
    E.click(PP+' button:has-text("Бет қосу")'); G=PP+' [role=group][aria-label="Жаңа бет"]'
    ok('P3 the picker starts with slide templates only', E.locator(G+' button:has-text("Титул")').count()==1 and E.locator(G+' button:has-text("Бір жауап")').count()==0 and E.locator(G+' button[aria-pressed=true]').count()==2)
    E.click(G+' button:has-text("Ұзын бет")'); ok('P3 picking Ұзын бет swaps the templates to its own', E.locator(G+' button:has-text("Қадамдық мысал")').count()==1 and E.locator(G+' button:has-text("Титул")').count()==0)
    E.click(G+' button:has-text("Қадамдық мысал")'); E.fill(G+' input','Қосындыны табу'); E.click(G+' button:text-is("Бетті жасау")')
    d=js(); ok('P4 the new page is appended with pageType scroll, templateId worked-example and stacked sections', len(d)==n+1 and d[-1]['pageType']=='scroll' and d[-1]['templateId']=='worked-example' and d[-1]['title']=='Қосындыны табу' and len(d[-1]['sections'])==3, str(d[-1])[:160])
    E.click(PP+' button:has-text("Бет қосу")'); E.click(G+' button:has-text("Интерактивті бет")'); E.click(G+' button:has-text("Қысқа жауап")'); E.click(G+' button:text-is("Бетті жасау")')
    d=js(); ok('P5 an interactive template makes a playable slide (task with accept) and names itself after the template', d[-1]['type']=='task' and d[-1]['pageType']=='interactive' and d[-1]['templateId']=='short-answer' and d[-1]['title']=='Қысқа жауап' and d[-1]['accept'], str(d[-1])[:160])
    k=n+1; before=json.dumps(js()[1])
    sel(2,'үлгісі').select_option('summary'); d=js()
    ok('P6 changing the template does not change the type', d[1]['templateId']=='summary' and d[1]['pageType']=='slide' and d[1]['type']=='content' and d[1]['bullets']==json.loads(before)['bullets'])
    sel(2,'типі').select_option('scroll'); d=js()
    ok('P7 changing the type asks first, keeps the text, resets the template', d[1]['pageType']=='scroll' and d[1]['templateId']=='' and d[1]['bullets']==json.loads(before)['bullets'])
    E.click(PP+' button:has-text("Қайтару")'); d=js(); ok('P7 Қайтару brings the previous draft back', d[1]['pageType']=='slide' and d[1]['templateId']=='summary')
    E.click(PP+' button[aria-label="2-бетті көшіру"]'); ok('P8 copy inserts a duplicate right after', E.locator(PP+' li').count()==n+3 and js()[2]['title']==js()[1]['title'])
    E.click(PP+' button[aria-label="3-бетті жоғары жылжыту"]'); E.click(PP+' button[aria-label="2-бетті төмен жылжыту"]'); ok('P8 up/down reorder; first Up and last Down are off', E.locator(PP+' button[aria-label="1-бетті жоғары жылжыту"]').is_disabled() and E.locator(PP+f' button[aria-label="{n+3}-бетті төмен жылжыту"]').is_disabled())
    YES[0]=False; DLG.clear(); E.click(PP+' button[aria-label="2-бетті өшіру"]'); ok('P9 delete asks first; "no" keeps the page', DLG and 'өшіру керек пе' in DLG[0] and E.locator(PP+' li').count()==n+3)
    YES[0]=True; E.click(PP+' button[aria-label="2-бетті өшіру"]'); ok('P9 …and "yes" removes it', E.locator(PP+' li').count()==n+2)
    E.click('button:text-is("Сақтау")'); E.wait_for_timeout(500)
    sv=SAVED[-1]['slides'] if SAVED else []
    ok('P10 save sends pageType and templateId; untouched old slides stay as they were', len(sv)==n+2 and sv[-1]['pageType']=='interactive' and sv[-2]['templateId']=='worked-example' and 'pageType' not in sv[0], str([x.get('pageType') for x in sv]))
    E.goto(B+'#edit/l-9'); E.wait_for_selector(PP+' li'); E.click('button:has-text("Бет қосу")'); axe(E,'page list with the picker open','document.querySelector("section[aria-label=Беттер]")')
    E.click('details > summary'); E.fill('details textarea >> nth=0','{ oops'); ok('P11 broken JSON: the list says so and cannot add', 'қатесін түзет' in E.locator(PP).inner_text() and E.locator(PP+' button:has-text("Бет қосу")').is_disabled())
    M=page((390,800)); M.goto(B+'#edit/l-9'); M.wait_for_selector(PP+' li'); M.click(PP+' button:has-text("Бет қосу")'); ok('P12 390px: no sideways scroll with the picker open', M.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
