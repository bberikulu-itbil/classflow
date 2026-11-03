# Student look-back (043_student_nav.sql): with the teacher's permission a student pages through the slides already shown, never past the board. Fake Supabase; needs `npx vite build`. Based on board.py. SHOTS=dir saves screenshots.
# (base: Classroom board (#board/<id>): edge rail + side panels (contents, participants+QR, activity, design), tool dock (draw, timer, number systems), top-right fullscreen/exit, themes, phone. SHOTS=dir saves screenshots.
import json, os, sys, datetime, base64, threading, http.server, socketserver
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.environ.get('DIST',os.path.join(HERE,'..','..','dist'))
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5233),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5233/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Оқушы Тест','role':'student','school_id':'sc','class_id':'c-8a'}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})

RL='[role=toolbar][aria-label="Тақта мәзірі"]'; DKB='[role=toolbar][aria-label="Тақта құралдары"]'
SID='s-1'; SHOTS=os.environ.get('SHOTS')
def fresh():
    return {'sess':{'id':SID,'title':'Циклдер','class_id':'c-7b','join_code':'482913','current_slide':2,'slide_count':4,'student_nav':False,'status':'live','active_task_id':None},
     'parts':[{'student_id':f's{i}','full_name':n,'presence':pr} for i,(n,pr) in enumerate([('Айдар Нұрланов','online'),('Дана Сәрсенова','online'),('Ерлан Қасымов','away'),('Мерей Ахметова','online'),('Тимур Болатов','offline'),('Аружан Серікқызы','online')])],
     'task':{'id':'tk-1','status':'open','kind':'quiz','prompt':'?','points':2,'options':['2','3'],'time_limit':120,'opened_at':datetime.datetime.now(datetime.timezone.utc).isoformat()},
     'subs':[{'id':'sb1'},{'id':'sb2'}],
     'lb':[{'full_name':'Дана Сәрсенова','group_no':1,'points':7},{'full_name':'Айдар Нұрланов','group_no':2,'points':5}],'gs':[{'group_no':1,'points':7},{'group_no':2,'points':5}]}
S=fresh()
SL=[{'type':'content','title':t,'bullets':['мәтін '+t]} for t in ('Слайд А','Слайд Б','Слайд В','Слайд Г')]
CALLS=[]
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/rpc/' in u.path:
        if name=='cf_slide': return out({'index':S['sess']['current_slide'],'slide':SL[S['sess']['current_slide']]})
        if name=='cf_slide_at':
            d=json.loads(q.post_data or '{}'); CALLS.append(d['p_index'])
            if not S['sess']['student_nav'] or d['p_index']>S['sess']['current_slide'] or d['p_index']<0: return out({'message':'Мұғалім қайта қарауға рұқсат бермеген'},400)
            return out({'index':d['p_index'],'slide':SL[d['p_index']]})
        if name=='cf_goto': S['sess']['current_slide']=json.loads(q.post_data or '{}')['p_index']; RPC.append(json.loads(q.post_data or '{}')); return out(None)
        if name=='cf_random_groups':
            d=json.loads(q.post_data or '{}'); RPC.append({'fn':name,**d})
            for i,pp in enumerate(S['parts']): pp['group_no']=(i%d['p_count'])+1 if d['p_count'] else None
            return out(None)
        if name=='cf_leaderboard': return out(S['lb'])
        if name=='cf_group_scores': return out(S['gs'])
        return out(None)
    if name=='profiles': return out(ME)
    if name=='cf_session_private': return pick([{'slides':SL}])
    if name=='cf_sessions': return pick([S['sess']])
    if name=='cf_participants': return out(S['parts'])
    if name=='cf_tasks': return pick([S['task']])
    if name=='cf_submissions': return out(S['subs'])
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and 'realtime' not in u: stub(r)
    else: r.abort()
RPC=[]
SHOTS=os.environ.get('SHOTS')
def shot(pg,name):
    if SHOTS: pg.screenshot(path=f'{SHOTS}/{name}.png',full_page=False)
URL=B+'#s/'+SID

with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':420,'height':800}); c.route('**/*',route)
    c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
    A=c.new_page(); A.on('pageerror',lambda e: errors.append(str(e)))
    A.goto(URL); A.wait_for_selector('text=мәтін Слайд В'); A.wait_for_timeout(300)
    txt=lambda: A.locator('body').inner_text()
    ok('N1 off by default: no look-back bar', A.locator('[data-testid=student-nav]').count()==0)
    S['sess']['student_nav']=True; A.reload(); A.wait_for_selector('[data-testid=student-nav]')
    ok('N2 permission on: the bar shows 3 / 4 and Next is disabled on the live slide', '3 / 4' in A.locator('[data-testid=student-nav]').inner_text() and A.locator('[data-testid=student-nav] button:has-text("Алға")').is_disabled())
    A.click('[data-testid=student-nav] button:has-text("Артқа")'); A.wait_for_selector('[data-testid=past-slide]'); A.wait_for_selector('text=мәтін Слайд Б')
    ok('N3 Back opens the previous slide, view only', 'мәтін Слайд Б' in txt() and 'тек қарауға' in txt() and '2 / 4' in A.locator('[data-testid=student-nav]').inner_text() and CALLS==[1], str(CALLS))
    A.click('[data-testid=student-nav] button:has-text("Артқа")'); A.wait_for_selector('text=мәтін Слайд А')
    ok('N4 down to the first slide, Back disabled there', '1 / 4' in A.locator('[data-testid=student-nav]').inner_text() and A.locator('[data-testid=student-nav] button:has-text("Артқа")').is_disabled())
    A.click('[data-testid=student-nav] button:has-text("Алға")'); A.wait_for_selector('text=мәтін Слайд Б'); A.click('[data-testid=student-nav] button:has-text("Алға")'); A.wait_for_selector('text=мәтін Слайд В')
    ok('N5 Next walks up to the board slide and stops: the live slide is back, no view-only note', A.locator('[data-testid=past-slide]').count()==0 and 'тек қарауға' not in txt() and A.locator('[data-testid=student-nav] button:has-text("Алға")').is_disabled())
    A.click('[data-testid=student-nav] button:has-text("Артқа")'); A.wait_for_selector('[data-testid=past-slide]'); A.click('[data-testid=to-live]')
    ok('N6 "To the board slide" returns at once', A.locator('[data-testid=past-slide]').count()==0 and 'мәтін Слайд В' in txt())
    A.click('[data-testid=student-nav] button:has-text("Артқа")'); A.wait_for_selector('[data-testid=past-slide]')
    S['sess']['current_slide']=3; A.click('button:has-text("✋")'); A.wait_for_selector('text=мәтін Слайд Г',timeout=15000)
    ok('N7 the teacher moves on: the student is taken to the new board slide', A.locator('[data-testid=past-slide]').count()==0 and '4 / 4' in A.locator('[data-testid=student-nav]').inner_text())
    A.click('[data-testid=student-nav] button:has-text("Артқа")'); A.wait_for_selector('[data-testid=past-slide]')
    S['sess']['student_nav']=False; A.click('button:has-text("✋")'); A.wait_for_selector('[data-testid=student-nav]',state='detached',timeout=15000)
    ok('N8 permission withdrawn: the bar is gone and the live slide shows', A.locator('[data-testid=past-slide]').count()==0 and 'мәтін Слайд Г' in txt())
    ok('N10 no page errors', not errors, str(errors[:3]))
    b.close()
print('ALL PASS' if all(r[1] for r in results) else 'SOME FAILED'); sys.exit(0 if all(r[1] for r in results) else 1)
