# Picture practice with a marking scheme (041_sheet_criteria.sql), the light student view, quiz options before the task opens, the video player and the English version.
# Fake Supabase like sheet.py; its cf_submit grades criteria the way the SQL does. SHOTS=dir saves screenshots. Needs node (esbuild) to dump the lesson.
import re, json, os, sys, datetime, base64, threading, http.server, socketserver, subprocess
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
DIST=os.environ.get('DIST',os.path.join(ROOT,'dist'))
subprocess.run(['node','-e',"""
const {build}=require('esbuild');build({entryPoints:['src/lessons/sheetsLab/index.ts'],bundle:true,format:'cjs',outfile:'/tmp/sl-e2e.cjs',logLevel:'error'}).then(()=>{
const {SHEETSLAB_LESSONS_DATA:D}=require('/tmp/sl-e2e.cjs');require('fs').writeFileSync('/tmp/sl-slide.json',JSON.stringify(D['inf8lab-2'].slides));});"""],cwd=ROOT,check=True)
SLIDES=json.load(open('/tmp/sl-slide.json'))
TIDX=[i for i,s in enumerate(SLIDES) if s['type']=='task'][0]; QIDX=[i for i,s in enumerate(SLIDES) if s['type']=='quiz'][0]; VIDX=[i for i,s in enumerate(SLIDES) if s.get('video')][0]
TS=SLIDES[TIDX]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5229),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5229/'; errors=[]; results=[]; RPC=[]; SHOTS=os.environ.get('SHOTS')
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
def session(sub): return json.dumps({'access_token':jwt(sub),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':sub,'aud':'authenticated','email':'u@x.kz'}})
ME='aaaaaaaa-0000-0000-0000-00000000000a'
def strip(sl):  # what cf_slide hands to students: no answers, no notes
    sl=json.loads(json.dumps(sl))
    for blk in [sl,sl.get('ru',{}),sl.get('en',{})]:
        for c in blk.get('criteria',[]): c.pop('accept',None)
        for k in ('answer','notes','explanation','accept'): blk.pop(k,None)
    return sl
def norm(x): return x.strip().lower().replace(',','.')
def grade(a):  # cf_submit for kind 'sheet'
    got=json.loads(a); pts=0; fb=[]
    for c in TS['criteria']:
        g=got.get(c['id'],{}); v=g.get('v',''); f=g.get('f','')
        okc=v.strip()!='' and (not c['accept'] or any(norm(x)==norm(v) for x in c['accept']))
        if okc and c.get('fn'): okc=(c['fn']+'(').upper() in f.upper()
        if okc and c.get('formula'): okc=f.strip().startswith('=')
        if okc: pts+=c['points']
        fb.append(f"{c['id']}:{1 if okc else 0}")
    return pts,','.join(fb)
S={}
def fresh(idx,opened):
    t={'id':'tk-1','level':None,'variant':None,'status':'open','points':TS['points'],'kind':'sheet' if idx==TIDX else 'quiz','prompt':'x','opened_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'slide_index':idx,'options':SLIDES[QIDX]['options'] if idx==QIDX else None}
    return {'tasks':[t] if opened else [],'subs':[],'sess':{'id':'s-1','title':'3.2','class_id':'c-8','join_code':'123456','current_slide':idx,'slide_count':len(SLIDES),'status':'live','locked':False,'groups_count':1,'active_task_id':'tk-1' if opened else None}}
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/rpc/' in u.path:
        a=json.loads(q.post_data or '{}'); RPC.append((name,a))
        if name=='cf_slide': return out({'index':S['sess']['current_slide'],'slide':strip(SLIDES[S['sess']['current_slide']])})
        if name=='cf_submit':
            pts,fb=grade(a['p_answer']); total=TS['points']
            S['subs']=[{'id':'sb-1','task_id':a['p_task'],'student_id':ME,'answer':a['p_answer'],'is_correct':pts==total,'points':pts,'feedback':fb}]
            return out(S['subs'][0])
        if name in('cf_leaderboard','cf_group_scores'): return out([])
        return out(None)
    if name=='profiles': return out({'id':ME,'full_name':'Тест','role':'student','school_id':'sc','class_id':'c-8'})
    if name=='classes': return pick([{'id':'c-8','name':'8A'}])
    if name=='cf_sessions': return pick([S['sess']])
    if name=='cf_session_private': return pick([{'slides':SLIDES}])
    if name=='cf_participants': return out([{'student_id':ME,'full_name':'Тест','presence':'online','att':'present'}])
    if name=='cf_tasks':
        if re.search(r'[?&]id=eq\.', q.url): return pick([S['tasks'][0]] if S['tasks'] else [])
        return out(S['tasks'])
    if name=='cf_submissions': return out(S['subs'])
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and 'realtime' not in u: stub(r)
    else: r.abort()
def shot(pg,name):
    if SHOTS: pg.screenshot(path=f'{SHOTS}/{name}.png',full_page=True)
def lum(rgb):
    v=[int(x) for x in re.findall(r'\d+',rgb)[:3]]; return (0.2126*v[0]+0.7152*v[1]+0.0722*v[2])/255
with sync_playwright() as p:
    b=p.chromium.launch()
    def student(idx,opened=False,lang='kk',vp=(1200,900),theme=None,wait='body'):
        S.clear(); S.update(fresh(idx,opened)); RPC.clear()
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s);localStorage.setItem('cf_lang','%s');%s}catch(e){}"%(json.dumps(session(ME)),lang,("localStorage.setItem('cf_theme','%s');"%theme) if theme else ''))
        pg=c.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
        pg.goto(B+'#s/s-1'); pg.wait_for_selector(wait); pg.wait_for_timeout(400); return pg
    cell=lambda pg,a: pg.locator(f'[data-testid=cell-{a}]')
    def put(pg,a,t): cell(pg,a).click(); pg.keyboard.type(t); pg.keyboard.press('Enter')
    # --- the task page before the teacher opens it
    A=student(TIDX,wait='[data-testid=criteria-panel]')
    ok('C1 task page has steps, picture, sheet and criteria', all(A.locator(f'[data-testid={x}]').count()==1 for x in ('task-steps','task-picture','minisheet','criteria-panel')))
    ok('C2 the picture is the Kazakh table image', A.locator('[data-testid=task-picture] img').get_attribute('src').endswith('inf8-t32-kk.svg'))
    ok('C3 criteria are listed, answers are not', A.locator('[data-testid^=crit-c]').count()==len(TS['criteria']) and 'accept' not in json.dumps([a for (k,a) in RPC]) )
    ok('C4 before opening: no send button, a hint instead', A.locator('[data-testid=crit-send]').count()==0 and 'ашқанда' in A.inner_text('[data-testid=criteria-panel]'))
    ok('C5 student page is light (not the old dark)', lum(A.evaluate("getComputedStyle(document.querySelector('[data-theme=light]')).backgroundColor"))>0.85, A.evaluate("getComputedStyle(document.querySelector('[data-theme=light]')).backgroundColor"))
    shot(A,'criteria_closed')
    # --- opened: fill the sheet, send, read the marks
    A=student(TIDX,opened=True,wait='[data-testid=crit-send]')
    rows=[('Бөлке',12,15,10),('Бәліш',8,6,9),('Шай',20,18,22),('Шырын',14,10,12),('Салат',7,9,5)]
    put(A,'A1','Тағам')
    for i,(n,x,y,z) in enumerate(rows):
        for col,v in zip('ABCD',(n,x,y,z)): put(A,f'{col}{i+2}',str(v))
    put(A,'E2','=SUM(B2:D2)'); put(A,'E3','=SUM(B3:D3)'); put(A,'E4','=SUM(B4:D4)'); put(A,'E5','=SUM(B5:D5)'); put(A,'E6','=SUM(B6:D6)')
    put(A,'B7','=SUM(B2:B6)'); put(A,'C7','=SUM(C2:C6)'); put(A,'D7','=SUM(D2:D6)'); put(A,'E7','=SUM(E2:E6)')
    put(A,'B8','=MAX(B2:D6)'); put(A,'B9','=5')   # B9 typed as a number: wrong value, and not AVERAGE
    A.locator('[data-testid=crit-send]').click(); A.wait_for_selector('[data-testid=crit-score]')
    sent=[a for (k,a) in RPC if k=='cf_submit']
    ok('C6 one cf_submit with the cell values and formulas', len(sent)==1 and json.loads(sent[0]['p_answer'])['c2']['f']=='=SUM(B2:D2)' and json.loads(sent[0]['p_answer'])['c2']['v']=='37', sent[0]['p_answer'][:120] if sent else '')
    states={c['id']:A.locator(f"[data-testid=crit-{c['id']}]").get_attribute('data-state') for c in TS['criteria']}
    ok('C7 every criterion is ok except the last (wrong B9)', states=={**{c['id']:'ok' for c in TS['criteria']},'c7':'bad'}, str(states))
    total=TS['points']; ok('C8 the score is shown', f'{total-2} / {total}' in A.inner_text('[data-testid=crit-score]'), A.inner_text('[data-testid=crit-score]'))
    put(A,'B9','=AVERAGE(B2:D6)'); A.locator('[data-testid=crit-send]').click(); A.wait_for_function("document.querySelector('[data-testid=crit-score]').innerText.includes('%d / %d')"%(total,total))
    ok('C9 fixing the sheet and sending again gives full points', A.locator('[data-testid=crit-c7]').get_attribute('data-state')=='ok')
    shot(A,'criteria_done')
    # --- English version
    E=student(TIDX,opened=True,lang='en',wait='[data-testid=crit-send]')
    ok('C10 English: picture, steps and criteria', E.locator('[data-testid=task-picture] img').get_attribute('src').endswith('inf8-t32-en.svg') and 'Marking criteria' in E.inner_text('[data-testid=criteria-panel]') and 'How to do it' in E.inner_text('[data-testid=task-steps]'))
    shot(E,'criteria_en')
    R=student(TIDX,opened=True,lang='ru',wait='[data-testid=crit-send]')
    ok('C11 Russian: picture and criteria', R.locator('[data-testid=task-picture] img').get_attribute('src').endswith('inf8-t32-ru.svg') and 'Критерии проверки' in R.inner_text('[data-testid=criteria-panel]'))
    # --- quiz: options are visible before the teacher opens it; not dressed as a task page
    Q=student(QIDX,wait='[data-testid=quiz-preview]')
    ok('Q1 quiz options show before the task is opened', Q.locator('[data-testid=quiz-preview] > div').count()==4 and Q.locator('[data-testid=task-page]').count()==0)
    ok('Q2 and say when the answer can be given', 'ашқанда' in Q.inner_text('[data-testid=quiz-preview]'))
    shot(Q,'quiz_closed')
    Q=student(QIDX,opened=True,wait='button:has-text("A.")')
    ok('Q3 opened: four answer buttons, options not shown twice', Q.locator('button:has-text("A.")').count()==1 and Q.get_by_text('A. ').count()==1)
    shot(Q,'quiz_open')
    # --- video
    V=student(VIDX,wait='[data-testid=video-block]')
    ok('V1 the video slide embeds a YouTube player and keeps a plain link', 'youtube-nocookie.com/embed/' in V.locator('[data-testid=video-block] iframe').get_attribute('src') and 'youtube.com/watch?v=' in V.locator('[data-testid=video-block] a').get_attribute('href'))
    ok('V2 the video slide is light', lum(V.evaluate("getComputedStyle(document.querySelector('[data-theme=light]')).backgroundColor"))>0.85)
    shot(V,'video')
    # --- dark theme chosen by the user does not darken the student page
    D=student(QIDX,theme='dark',wait='[data-testid=quiz-preview]')
    ok('L1 student page stays light when the app theme is dark', lum(D.evaluate("getComputedStyle(document.querySelector('[data-theme=light]')).backgroundColor"))>0.85)
    b.close()
ok('no page errors', not errors, str(errors[:2]))
fails=[r for r in results if not r[1]]; print(f'{len(results)-len(fails)}/{len(results)} passed'); sys.exit(1 if fails else 0)
