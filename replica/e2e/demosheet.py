# Demo-sheet slide (3.1) on the board: ready texts, the teacher types formulas, results as promised. Based on board.py. SHOTS=dir saves screenshots.
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
srv=socketserver.TCPServer(('127.0.0.1',5232),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5232/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})

RL='[role=toolbar][aria-label="Тақта мәзірі"]'; DKB='[role=toolbar][aria-label="Тақта құралдары"]'
SID='s-1'; SHOTS=os.environ.get('SHOTS')
def fresh():
    return {'sess':{'id':SID,'title':'Циклдер','class_id':'c-7b','join_code':'482913','current_slide':0,'slide_count':1,'status':'live','active_task_id':'tk-1'},
     'parts':[{'student_id':f's{i}','full_name':n,'presence':pr} for i,(n,pr) in enumerate([('Айдар Нұрланов','online'),('Дана Сәрсенова','online'),('Ерлан Қасымов','away'),('Мерей Ахметова','online'),('Тимур Болатов','offline'),('Аружан Серікқызы','online')])],
     'task':{'id':'tk-1','status':'open','kind':'quiz','prompt':'?','points':2,'options':['2','3'],'time_limit':120,'opened_at':datetime.datetime.now(datetime.timezone.utc).isoformat()},
     'subs':[{'id':'sb1'},{'id':'sb2'}],
     'lb':[{'full_name':'Дана Сәрсенова','group_no':1,'points':7},{'full_name':'Айдар Нұрланов','group_no':2,'points':5}],'gs':[{'group_no':1,'points':7},{'group_no':2,'points':5}]}
S=fresh()
SL=[json.load(open(os.environ['SLIDE']))]
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/rpc/' in u.path:
        if name=='cf_slide': return out({'slide':SL[min(S['sess']['current_slide'],len(SL)-1)]})
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
URL=B+'#board/'+SID
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900)):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
        pg=c.new_page(); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    A=page(); A.goto(URL); A.wait_for_selector('[data-testid=minisheet]'); A.wait_for_timeout(300)
    cell=lambda a: A.evaluate("""a=>{const r=[...document.querySelectorAll('[data-testid=minisheet] tbody tr')];const m=/^([A-Z])(\\d+)$/.exec(a);const row=r[+m[2]-1];return row?row.children[m[1].charCodeAt(0)-64].innerText.trim():null}""",a)
    ok('D1 the texts are ready: tax rate, items and the multiplication table', cell('A1')=='Салық мөлшері' and cell('B1')=='10.00%' and cell('A4')=='Дәптер' and cell('B8')=='250' and cell('A17')=='5' and cell('F12')=='5', str([cell(x) for x in ('A1','B1','A4','B8','A17','F12')]))
    ok('D2 formula columns are empty for the teacher', cell('D4')=='' and cell('E4')=='' and cell('B13')=='')
    ok('D3 steps are on the slide', 'D4 ұяшығына =B4*C4' in A.locator('body').inner_text() and 'Слайд 1 / 1' in A.locator('body').inner_text())
    shot(A,'demo_board')
    def type_in(addr,val):
        m=__import__('re').match(r'([A-Z])(\d+)',addr)
        A.locator('[data-testid=minisheet] tbody tr').nth(int(m.group(2))-1).locator('td').nth(ord(m.group(1))-65).click(); A.keyboard.type(val); A.keyboard.press('Enter')
    type_in('D4','=B4*C4'); ok('D4 the teacher types a formula on the board', cell('D4')=='1500', cell('D4'))
    type_in('E4','=D4*$B$1'); ok('D5 absolute reference gives the tax', cell('E4')=='150', cell('E4'))
    A.reload(); A.wait_for_selector('[data-testid=minisheet]'); A.wait_for_timeout(300)
    ok('D6 the work survives a reload on the board', cell('D4')=='1500')
    A.click('button[aria-label="Бастапқыға қайтару"]'); A.wait_for_timeout(200)
    ok('D7 Reset brings back the ready table', cell('D4')=='' and cell('A4')=='Дәптер', str((cell('D4'),cell('A4'))))
    ok('D8 no page errors', not errors, str(errors[:3]))
    b.close()
print('ALL PASS' if all(r[1] for r in results) else 'SOME FAILED'); sys.exit(0 if all(r[1] for r in results) else 1)
