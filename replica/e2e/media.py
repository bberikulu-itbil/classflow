# Pictures on slides: editor panel (pick slide, upload to the cf-media bucket, img + alt written into the JSON), preview rendering, unsafe sources ignored.
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
srv=socketserver.TCPServer(('127.0.0.1',5227),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5227/'; errors=[]; results=[]
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
    if name=='cf_lessons': return pick([LESSON])
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
    E=page(); E.goto(B+'#edit/new'); E.wait_for_selector('section[aria-label="Сурет қосу"]'); P='section[aria-label="Сурет қосу"]'; E.click('details > summary')
    ok('M1 editor has the picture panel with the slide list (leaderboard-like kinds are disabled)', E.locator(P+' select option').count()==9 and E.locator(P+' select option[disabled]').count()==4, str(E.locator(P+' select option[disabled]').count()))
    E.select_option(P+' select',index=1); E.fill(P+' input[type=text], '+P+' label:has-text("сипаттамасы") input','Пернетақтаның үш қатары')
    E.set_input_files(P+' input[type=file]',files=[{'name':'k.png','mimeType':'image/png','buffer':PNG}]); E.wait_for_selector(P+' [role=status]:has-text("қосылды")')
    ok('M2 the file went to the school folder of the cf-media bucket as a re-encoded picture', len(UP)==1 and UP[0][0].startswith('/storage/v1/object/cf-media/sc/') and UP[0][0].endswith(('.webp','.jpg')) and UP[0][1].startswith('multipart/form-data'), str(UP))
    js=E.locator('textarea[aria-label="Слайдтар JSON"]').input_value(); sl=json.loads(js)[1]
    ok('M3 the slide JSON now carries img (public URL of that file) and the description as alt', sl.get('img','').startswith('https://') and '/storage/v1/object/public/cf-media/sc/' in sl['img'] and sl.get('alt')=='Пернетақтаның үш қатары', str(sl)[:200])
    ok('M3 only that slide changed', 'img' not in json.loads(js)[0] and 'img' not in json.loads(js)[2])
    ok('M4 a slide kind without picture support cannot take a file', E.locator(P+' input[type=file]').is_enabled())
    E.select_option(P+' select',index=8); ok('M4 …and the picker is off for it', E.locator(P+' input[type=file]').is_disabled())
    E.select_option(P+' select',index=1); E.click(P+' button:text-is("Суретті алып тастау")'); ok('M5 remove takes img and alt away again', 'img' not in json.loads(E.locator('textarea[aria-label="Слайдтар JSON"]').input_value())[1] and 'alt' not in json.loads(E.locator('textarea[aria-label="Слайдтар JSON"]').input_value())[1])
    E.fill('textarea[aria-label="Слайдтар JSON"]','{ oops'); ok('M6 broken JSON: the panel says so instead of guessing', 'қатені түзет' in E.locator(P).inner_text() and E.locator(P+' input[type=file]').count()==0)
    E.fill('textarea[aria-label="Слайдтар JSON"]','[{"type":"content","title":"a","bullets":["b"]}]')
    E.set_input_files(P+' input[type=file]',files=[{'name':'t.txt','mimeType':'text/plain','buffer':b'hello'}]); E.wait_for_selector(P+' [role=status]:has-text("PNG, JPEG")')
    ok('M6 a text file is refused in words, nothing uploaded', len(UP)==1)
    axe(E,'picture panel (the legacy JSON editor around it is not audited here)',"document.querySelector('section[aria-label=\"Сурет қосу\"]')")
    # showing it
    V=page(); V.goto(B+'#preview/l-9'); V.wait_for_selector('text=Кіріспе')
    V.keyboard.press('ArrowRight'); V.wait_for_selector('h2:text-is("Пернетақта")')
    ok('M7 preview draws the picture with its alt text', V.locator('figure img[alt="Қызыл тіктөртбұрыш"]').count()==1 and V.locator('figure img').evaluate('e=>e.naturalWidth')>0)
    V.keyboard.press('ArrowRight'); V.wait_for_selector('h2:text-is("Қауіпті")'); ok('M8 a javascript: source is never put into the page', V.locator('figure img').count()==0 and V.locator('img[src^="javascript"]').count()==0)
    V.keyboard.press('ArrowLeft'); V.wait_for_selector('h2:text-is("Пернетақта")'); axe(V,'preview with a picture')
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
