# Jeopardy saving against a fake Supabase: cloud rows, two devices, moving local games up, table missing, server error.
# Run: python3 jeopardy_cloud.py   (needs dist/ built, playwright, TOOLS with tw.css + axe-core)
import json, os, sys, time, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
import base64
from playwright.sync_api import sync_playwright
DIST=os.environ.get('DIST','/tmp/claude-0/-home-claude/3a2d47be-3b49-56e8-bda5-86e8ad6471fd/scratchpad/cf/dist')
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read(); AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5208),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5208/'; errors=[]; bad5xx=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)


ROWS={}; MODE={'v':'ok'}; POSTS=[]
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
def stub(r):
    q=r.request; u=urlparse(q.url); qs=parse_qs(u.query); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    if name=='profiles': return out(ME)
    if name!='cf_jeopardy': return out([])
    if MODE['v']=='missing': return out({'code':'PGRST205','message':"Could not find the table 'public.cf_jeopardy' in the schema cache"},404)
    if MODE['v']=='boom': return out({'code':'XX000','message':'database is on fire'},500)
    if q.method=='GET': return out(sorted(ROWS.values(),key=lambda x:x['_t'],reverse=True))
    if q.method=='POST':
        d=json.loads(q.post_data); POSTS.append(d); d['_t']=time.time(); ROWS[d['id']]=d; return r.fulfill(status=201,headers=h,body='')
    if q.method=='DELETE': ROWS.pop(qs['id'][0].replace('eq.',''),None); return r.fulfill(status=204,headers=h)
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u: stub(r)
    else: r.abort()
def axe(pg,name):
    pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))
URL=B+'#tasks/jeopardy'
LOCAL_GAME=[{'id':'11111111-1111-4111-8111-111111111111','title':'Ескі ойын','cats':[{'name':'А','qs':[{'q':'q','a':'a'},{'q':'','a':''},{'q':'','a':''},{'q':'','a':''},{'q':'','a':''}]}]}]
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(seed_local=False):
        c=b.new_context(viewport={'width':1440,'height':900}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
        if seed_local: c.add_init_script("try{if(!localStorage.getItem('cf_jeopardy_t-1'))localStorage.setItem('cf_jeopardy_t-1',%s)}catch(e){}"%json.dumps(json.dumps(LOCAL_GAME)))
        pg=c.new_page(); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    def make(pg,title,cat,q,a):
        pg.click('button:has-text("Жаңа ойын")'); pg.wait_for_selector('h2:has-text("Jeopardy құрастыру")')
        pg.fill('label:text-is("Ойын атауы") >> xpath=..//input',title); pg.click('button[aria-label="3-тақырыпты өшіру"]'); pg.click('button[aria-label="2-тақырыпты өшіру"]')
        pg.fill('label:has-text("1-тақырып атауы") >> xpath=..//input',cat); pg.fill(f'input[aria-label="{cat}, 100: сұрақ"]',q); pg.fill(f'input[aria-label="{cat}, 100: жауап"]',a)
        pg.click('button:text-is("Сақтау")')
    # C1 cloud: save goes to the table
    A=page(); A.goto(URL); A.wait_for_selector('text=Әзірге ойын жоқ')
    ok('C1 table exists: no "browser only" warning', A.locator('text=тек осы браузерде сақталады').count()==0)
    make(A,'Бұлттағы ойын','Тақырып','Сұрақ?','Жауап'); A.wait_for_selector('text=Бұлттағы ойын')
    ok('C1 saved as a row of the owner, in the owner school, data is the category list', len(POSTS)==1 and POSTS[0]['owner_id']=='t-1' and POSTS[0]['school_id']=='sc' and POSTS[0]['title']=='Бұлттағы ойын' and POSTS[0]['data'][0]['name']=='Тақырып' and POSTS[0]['data'][0]['qs'][0]['a']=='Жауап', str(POSTS[:1])[:200])
    ok('C1 nothing was put in the browser storage', A.evaluate("localStorage.getItem('cf_jeopardy_t-1')")is None)
    axe(A,'jeopardy list (cloud)')
    # C2 second device
    Bp=page(); Bp.goto(URL); Bp.wait_for_selector('text=Бұлттағы ойын')
    ok('C2 another device (empty browser) sees the game', Bp.locator('text=1 тақырып · 1 сұрақ').count()==1)
    Bp.click('button:text-is("Өңдеу")'); Bp.wait_for_selector('h2:has-text("Jeopardy құрастыру")'); Bp.fill('label:text-is("Ойын атауы") >> xpath=..//input','Атауы өзгерді'); Bp.click('button:text-is("Сақтау")'); Bp.wait_for_selector('text=Атауы өзгерді')
    ok('C2 edit updates the same row (no duplicate)', len(ROWS)==1 and list(ROWS.values())[0]['title']=='Атауы өзгерді')
    A.reload(); A.wait_for_selector('text=Атауы өзгерді'); ok('C2 first device sees the change after reload', A.locator('text=Бұлттағы ойын').count()==0)
    Bp.click('button[aria-label$="ойынын жою"]'); Bp.click('button:text-is("Иә, жою")'); Bp.wait_for_selector('text=Әзірге ойын жоқ'); ok('C3 delete removes the row', len(ROWS)==0)
    # C4 old browser-only games are offered a move
    M=page(seed_local=True); M.goto(URL); M.wait_for_selector('text=Осы браузерде 1 ойын бар')
    ok('C4 games from before the table existed: move offered', M.locator('button:text-is("Аккаунтқа көшіру")').count()==1)
    axe(M,'jeopardy list with move offer')
    M.click('button:text-is("Аккаунтқа көшіру")'); M.wait_for_selector('text=Ескі ойын'); M.wait_for_selector('text=Осы браузерде 1 ойын бар',state='detached')
    ok('C4 moved: row exists, local copy cleared, offer gone', len(ROWS)==1 and list(ROWS.values())[0]['id']==LOCAL_GAME[0]['id'] and M.evaluate("localStorage.getItem('cf_jeopardy_t-1')")=='[]')
    # C5 shared link -> keep a copy goes to the table
    ROWS.clear(); S=page(); S.goto(B+'#tasks/jeopardy'); S.wait_for_selector('text=Әзірге ойын жоқ')
    S.click('button:has-text("Жаңа ойын")'); S.fill('label:text-is("Ойын атауы") >> xpath=..//input','Сілтеме үшін'); S.click('button[aria-label="3-тақырыпты өшіру"]'); S.click('button[aria-label="2-тақырыпты өшіру"]')
    S.fill('label:has-text("1-тақырып атауы") >> xpath=..//input','Т'); S.fill('input[aria-label="Т, 100: сұрақ"]','Q'); S.fill('input[aria-label="Т, 100: жауап"]','A'); S.click('button:text-is("Сақтау")'); S.wait_for_selector('text=Сілтеме үшін')
    S.click('button[aria-label$="бөлісу сілтемесі"]'); frag=S.input_value('input[aria-label="Бөлісу сілтемесі"]').split('#')[1]; ROWS.clear()
    K=page(); K.goto(B+'#'+frag); K.wait_for_selector('button:text-is("Менің ойындарыма сақтау")'); K.click('button:text-is("Менің ойындарыма сақтау")'); K.wait_for_selector('text=тізіміне сақталды')
    ok('C5 "keep a copy" of a shared game writes a row', len(ROWS)==1 and list(ROWS.values())[0]['title']=='Сілтеме үшін')
    # C6 table missing: still works, says why
    MODE['v']='missing'; L=page(); L.goto(URL); L.wait_for_selector('text=Әзірге ойын жоқ')
    ok('C6 table missing: tells that games stay in this browser', L.locator('[role=status]:has-text("006_jeopardy.sql жүргізілмеген")').count()==1)
    axe(L,'jeopardy list (table missing)')
    make(L,'Уақытша','Т','Q','A'); L.wait_for_selector('text=Уақытша'); L.reload(); L.wait_for_selector('text=Уақытша')
    ok('C6 table missing: games still save and survive reload', L.locator('text=1 тақырып · 1 сұрақ').count()==1)
    # C7 real server error is shown, not hidden by the fallback
    MODE['v']='boom'; E=page(); E.goto(URL); E.wait_for_selector('text=database is on fire')
    ok('C7 server error: message and retry button, nothing pretends to be saved', E.locator('text=database is on fire').count()==1 and E.locator('text=Әзірге ойын жоқ').count()==0)
    b.close()
real=[e for e in errors if 'Failed to load resource' not in e and 'ERR_FAILED' not in e and 'PGRST205' not in e]
ok('no console errors',not real,str(real[:3]))
print(sum(1 for r in results if r[1]),'/',len(results),'passed'); sys.exit(0 if all(r[1] for r in results) else 1)
