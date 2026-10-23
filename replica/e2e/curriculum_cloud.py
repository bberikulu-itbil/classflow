# Modules screen against a fake Supabase: choose a class, start a lecture as a live lesson (rpc cf_start_session), refusal shown.
import json, os, sys, datetime, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5224),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5224/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
CLASSES=[{'id':'c-7b','name':'7B'}]; LESSONS=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
LES=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
RPC=[]; MODE={'rpc':'ok'}
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    if name=='profiles': return out(ME)
    if name=='classes': return out([{'id':'c-7a','name':'7A'},{'id':'c-7b','name':'7B'}])
    if name=='cf_lessons': return out(LES)
    if name=='cf_curr_courses': return out([{'id':'cr1','title':'Информатика 7','subject':'Информатика','grade':7}])
    if name=='cf_curr_modules': return out([{'id':'m1','course_id':'cr1','title':'Алгоритмдер','position':0}])
    if name=='cf_curr_lessons': return out([{'lesson_id':'l-1','module_id':'m1','position':0},{'lesson_id':'l-2','module_id':'m1','position':1}])
    if name=='cf_start_session':
        RPC.append(json.loads(q.post_data))
        return out({'code':'P0001','message':'Сабақ табылмады'},400) if MODE['rpc']=='fail' else out({'id':'sess-9'})
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and 'realtime' not in u: stub(r)
    else: r.abort()
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':1440,'height':900}); c.route('**/*',route)
    c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
    A=c.new_page(); A.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text else None); A.on('pageerror',lambda e: errors.append(str(e)))
    A.goto(B+'#lessons'); A.wait_for_selector('section[aria-label="Алгоритмдер"]')
    ok('M1 the section opens on Модульдер мен дәрістер', A.locator('h1:text-is("Модульдер мен дәрістер")').count()==1 and A.locator('nav[aria-label="Сабақтар бөлімдері"] a[aria-current=page]').inner_text().strip()=='Модульдер мен дәрістер')
    ok('M1 tables exist: no browser-only note', A.locator('[role=note]').count()==0)
    ok('M2 no class: nothing to start', A.locator('button:has-text("Бастау")').count()==0)
    A.locator('fieldset:has(input[name=start-class]) label:has-text("7B")').click()
    btn=A.locator('button[aria-label="Циклдер: 7B сыныбымен бастау"]'); ok('M3 start button is enabled in the cloud', btn.is_enabled() and A.locator('button:has-text("Бастау · 7B")').count()==2)
    MODE['rpc']='fail'; btn.click(); A.wait_for_selector('[role=alert]:has-text("Сабақ табылмады")'); ok('M4 refusal shown, stays on the page, button usable again', A.evaluate('location.hash')=='#lessons' or 'lessons' in A.evaluate('location.hash'))
    ok('M4 button is clickable again after the failure', btn.is_enabled())
    MODE['rpc']='ok'; btn.click(); A.wait_for_function("location.hash==='#remote/sess-9'")
    ok('M5 starts that lecture for that class with the default groups', RPC[-1]=={'p_lesson':'l-1','p_class':'c-7b','p_groups':3}, str(RPC))
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
