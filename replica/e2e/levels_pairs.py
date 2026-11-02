# Practice levels L1-L3 (A/B variants), pairs and slide-kind badges, student (#s/<id>) and teacher remote (#remote/<id>) against a fake Supabase
# that applies the same rules as supabase/038_levels_pairs.sql. SHOTS=dir saves screenshots. Needs: node (esbuild) to dump the lesson slide.
import re, json, os, sys, datetime, base64, threading, http.server, socketserver, subprocess
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
T=os.environ.get('TOOLS','/var/tmp/tools'); CSS=open(T+'/tw.css').read()
AXE=open(T+'/node_modules/axe-core/axe.min.js').read()
DIST=os.environ.get('DIST',os.path.join(ROOT,'dist'))
subprocess.run(['node','-e',"""
const {build}=require('esbuild');build({entryPoints:['src/lessons/sheetsLab/index.ts'],bundle:true,format:'cjs',outfile:'/tmp/sl-e2e.cjs',logLevel:'error'}).then(()=>{
const {SHEETSLAB_LESSONS_DATA:D}=require('/tmp/sl-e2e.cjs');require('fs').writeFileSync('/tmp/sl-slide.json',JSON.stringify(D['inf8lab-4'].slides));});"""],cwd=ROOT,check=True)
SLIDES=json.load(open('/tmp/sl-slide.json')); PIDX=[i for i,s in enumerate(SLIDES) if s.get('kind')=='practice'][0]; PS=SLIDES[PIDX]
for L in PS['levels']+PS['ru']['levels']:  # this test is about the level rules with typed answers; cell checks are tested in sheet.py
    for v in L['variants']: v.pop('cell',None)
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5227),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5227/'; errors=[]; results=[]; RPC=[]; SHOTS=os.environ.get('SHOTS')
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
def session(sub): return json.dumps({'access_token':jwt(sub),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':sub,'aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
TEACH='tttttttt-0000-0000-0000-000000000001'; EVEN='aaaaaaaa-0000-0000-0000-00000000000a'; ODD='bbbbbbbb-0000-0000-0000-00000000000b'; PART='cccccccc-0000-0000-0000-00000000000c'
def strip(sl):  # what cf_slide hands to students: no answers
    sl=json.loads(json.dumps(sl))
    for L in sl['levels']:
        for v in L['variants']: v.pop('accept',None)
    sl.pop('notes',None); sl['ru'].pop('notes',None); return sl
OPEN_AT=datetime.datetime.now(datetime.timezone.utc).isoformat()
def fresh(me,role='student',pair=None):
    tasks=[{'id':f"tk-{L['lv']}{v['v']}",'level':L['lv'],'variant':v['v'],'status':'open','points':L['points'],'kind':'short','prompt':v['prompt'],'opened_at':OPEN_AT,'slide_index':PIDX,'accept':v['accept']} for L in PS['levels'] for v in L['variants']]
    return {'me':me,'role':role,'pair':pair,'tasks':tasks,'subs':[],'opened':True,
      'sess':{'id':'s-1','title':'Формулалар','class_id':'c-8','join_code':'123456','current_slide':PIDX,'slide_count':len(SLIDES),'status':'live','locked':False,'groups_count':1,'active_task_id':'tk-1A'},
      'parts':[{'student_id':EVEN,'full_name':'Айдар Нұрланов','presence':'online','att':'present'},{'student_id':ODD,'full_name':'Дана Сәрсенова','presence':'online','att':'present'}],
      'roster':[{'student_id':EVEN,'full_name':'Айдар Нұрланов','status':'present'},{'student_id':ODD,'full_name':'Дана Сәрсенова','status':'present'},{'student_id':PART,'full_name':'Ерлан Қасымов','status':'absent'}]}
S={}
def my_variant(uid,level): return 'B' if int(uid.replace('-','')[:2],16)%2==1 and any(t['variant']=='B' and t['level']==level for t in S['tasks']) else 'A'
def submit(uid,tid,ans):
    t=next(x for x in S['tasks'] if x['id']==tid); pr=S['pair']
    if pr and pr['partner_id']==uid: return 'Жұбыңның экранында орында'
    host=bool(pr and pr['host_id']==uid)
    if not host and t['variant']!=my_variant(uid,t['level']): return 'Бұл нұсқа саған берілмеген'
    if any(s['task_id']==tid and s['student_id']==uid and s['is_correct'] for s in S['subs']): return 'Бұл тапсырма орындалған'
    for p in [x for x in S['tasks'] if x['level']==t['level']-1 and (host or x['variant']==my_variant(uid,x['level']))]:
        if not any(s['task_id']==p['id'] and s['student_id']==uid and s['is_correct'] for s in S['subs']): return 'Алдымен L%d деңгейін дұрыс орында'%(t['level']-1)
    good=ans.strip().lower() in [a.lower() for a in t['accept']]
    for u in [uid]+([pr['partner_id']] if host else []):
        S['subs']=[s for s in S['subs'] if not(s['task_id']==tid and s['student_id']==u)]
        S['subs'].append({'id':f'sb-{len(S["subs"])+1}','task_id':tid,'student_id':u,'answer':ans,'is_correct':good,'points':t['points'] if good else 0})
    return None
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    pub=lambda t:{k:v for k,v in t.items() if k!='accept'}
    if '/rpc/' in u.path:
        a=json.loads(q.post_data or '{}'); RPC.append((name,a))
        if name=='cf_slide': return out({'index':PIDX,'slide':strip(PS) if S['role']=='student' else PS})
        if name=='cf_submit':
            err=submit(S['me'],a['p_task'],a['p_answer'])
            return out({'message':err,'code':'P0001'},400) if err else out(None)
        if name=='cf_pair_set':
            S['pair']={'host_id':a['p_host'],'partner_id':a['p_partner'],'host_name':'Айдар Нұрланов','partner_name':'Ерлан Қасымов'} if a['p_partner'] else None
        if name=='cf_attendance': return out(S['roster'])
        if name=='cf_grade': 
            for s in S['subs']:
                if s['id']==a['p_sub']: s['points']=a['p_points']; s['is_correct']=a['p_points']>0
        if name in('cf_leaderboard','cf_group_scores'): return out([])
        return out(None)
    if name=='profiles': return out({'id':S['me'],'full_name':'Тест','role':S['role'],'school_id':'sc','class_id':'c-8'})
    if name=='classes': return pick([{'id':'c-8','name':'8A'}])
    if name=='cf_sessions': return pick([S['sess']])
    if name=='cf_session_private': return pick([{'slides':SLIDES}])
    if name=='cf_participants': return out(S['parts'])
    if name=='cf_pairs': return out([S['pair']] if S['pair'] else [])
    if name=='cf_tasks':
        if re.search(r'[?&]id=eq\.', q.url): return pick([pub(S['tasks'][0])])
        return out([pub(t) for t in S['tasks']] if S['opened'] else [])
    if name=='cf_submissions': return out([s for s in S['subs'] if S['role']!='student' or s['student_id']==S['me']])
    return out([])
def route(r):
    u=r.request.url
    if 'cdn.tailwindcss.com' in u: r.fulfill(content_type='application/javascript',body="window.tailwind={};var s=document.createElement('style');s.textContent="+json.dumps(CSS)+";document.head.appendChild(s);")
    elif u.startswith(B): r.continue_()
    elif 'supabase.co' in u and 'realtime' not in u: stub(r)
    else: r.abort()
def calls(n): return [a for (k,a) in RPC if k==n]
def shot(pg,name):
    if SHOTS: pg.screenshot(path=f'{SHOTS}/{name}.png',full_page=False)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(me,role='student',pair=None,vp=(1100,900)):
        S.clear(); S.update(fresh(me,role,pair)); RPC.clear()
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s);localStorage.setItem('cf_lang','kk')}catch(e){}"%json.dumps(session(me)))
        pg=c.new_page(); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text and 'Failed to load resource' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    def student(me,pair=None,vp=(1100,900)):
        pg=page(me,'student',pair,vp); pg.goto(B+'#s/s-1'); pg.wait_for_selector('[data-testid=levels-panel]'); pg.wait_for_timeout(300); return pg
    # ---- solo student, variant A
    A=student(EVEN); lvl=lambda pg,n: pg.locator(f'[data-testid=level-{n}]')
    ok('S1 kind badge shows the slide type', 'Практикалық тапсырма' in A.locator('[data-testid=kind-badge]').first.inner_text())
    ok('S1 L1 open, L2 and L3 locked', lvl(A,1).get_attribute('data-locked')=='false' and lvl(A,2).get_attribute('data-locked')=='true' and lvl(A,3).get_attribute('data-locked')=='true')
    ok('S1 a lone student gets exactly one variant per level', A.locator('[data-testid=task-1A]').count()==1 and A.locator('[data-testid=task-1B]').count()==0)
    ok('S1 the page never contains the answers', '"accept"' not in A.content() and PS['levels'][0]['variants'][0]['accept'][0] not in json.dumps(strip(PS)['levels']))
    ok('S1 pair banner absent', A.locator('[data-testid=pair-banner]').count()==0)
    shot(A,'student_L1_desktop')
    A.fill('input[aria-label="L1 A"]','999'); A.click('[data-testid=task-1A] button:has-text("Жіберу")'); A.wait_for_selector('text=Қате, қайта көр')
    ok('S2 wrong answer: told so, L2 stays locked', lvl(A,2).get_attribute('data-locked')=='true')
    right=PS['levels'][0]['variants'][0]['accept'][0]
    A.fill('input[aria-label="L1 A"]',right); A.click('[data-testid=task-1A] button:has-text("Жіберу")'); A.wait_for_selector('[data-testid=task-1A] >> text=Дұрыс')
    A.wait_for_function("document.querySelector('[data-testid=level-2]').dataset.locked==='false'")
    ok('S2 right answer unlocks L2 (L3 still locked)', lvl(A,3).get_attribute('data-locked')=='true' and len(calls('cf_submit'))==2)
    A.fill('input[aria-label="L2 A"]',PS['levels'][1]['variants'][0]['accept'][0]); A.click('[data-testid=task-2A] button:has-text("Жіберу")')
    A.wait_for_function("document.querySelector('[data-testid=level-3]').dataset.locked==='false'"); ok('S2 L2 done unlocks L3', True)
    shot(A,'student_L3_open')
    A.click('button[aria-label^="Тіл"]'); A.wait_for_selector('text=Практическое задание')
    ok('S3 Russian toggle translates badge and tasks', 'запишите' in A.locator('[data-testid=task-3A]').inner_text().lower())
    # ---- solo student, variant B
    Bp=student(ODD); ok('S4 the other id gets variant B', Bp.locator('[data-testid=task-1B]').count()==1 and Bp.locator('[data-testid=task-1A]').count()==0)
    # ---- pair: host sees both variants, level opens only when both are right
    pair={'host_id':EVEN,'partner_id':PART,'host_name':'Айдар Нұрланов','partner_name':'Ерлан Қасымов'}
    H_=student(EVEN,pair)
    ok('P1 pair banner names both students', 'Айдар Нұрланов + Ерлан Қасымов' in H_.locator('[data-testid=pair-banner]').inner_text())
    ok('P1 host sees both variants on one screen', H_.locator('[data-testid=task-1A]').count()==1 and H_.locator('[data-testid=task-1B]').count()==1)
    shot(H_,'pair_host_L1')
    H_.fill('input[aria-label="L1 A"]',PS['levels'][0]['variants'][0]['accept'][0]); H_.click('[data-testid=task-1A] button:has-text("Жіберу")'); H_.wait_for_selector('[data-testid=task-1A] >> text=Дұрыс')
    ok('P2 variant A alone does not unlock L2', lvl(H_,2).get_attribute('data-locked')=='true')
    H_.fill('input[aria-label="L1 B"]',PS['levels'][0]['variants'][1]['accept'][0]); H_.click('[data-testid=task-1B] button:has-text("Жіберу")'); H_.wait_for_function("document.querySelector('[data-testid=level-2]').dataset.locked==='false'")
    ok('P2 both variants done unlock L2', True); ok('P2 the partner got a copy of both answers', len([s for s in S['subs'] if s['student_id']==PART])==2)
    # ---- partner screen: read-only
    Pp=student(PART,pair); S['subs']=[]
    ok('P3 partner is told to work on the host screen and has no inputs', 'экранында' in Pp.locator('[data-testid=pair-banner]').inner_text() and Pp.locator('[data-testid=levels-panel] input').count()==0)
    shot(Pp,'pair_partner')
    # ---- phone
    Ph=student(EVEN,pair,(390,844)); shot(Ph,'pair_host_phone')
    ok('P4 phone: no horizontal scroll', Ph.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
    # ---- teacher remote
    R=page(TEACH,'teacher',None,(1440,1000)); S['me']=TEACH; S['role']='teacher'; R.goto(B+'#remote/s-1'); R.wait_for_selector('[data-testid=pairs]'); R.wait_for_timeout(500)
    ok('T1 remote header shows the slide kind', R.locator('[data-testid=kind-badge]').first.inner_text().startswith('🛠') or 'Практикалық' in R.locator('[data-testid=kind-badge]').first.inner_text())
    R.select_option('select[aria-label="Аккаунтымен кірген оқушы"]',EVEN); R.select_option('select[aria-label="Қасына қосылатын оқушы"]',PART)
    R.click('button:has-text("Жұп қосу")'); R.wait_for_selector('[data-testid=pairs] >> text=Айдар Нұрланов + Ерлан Қасымов')
    ok('T2 teacher pairs two students (rpc args)', calls('cf_pair_set')[-1]=={'p_session':'s-1','p_host':EVEN,'p_partner':PART})
    ok('T2 the partner list offers class students who did not log in', 'Ерлан Қасымов' in R.inner_text('body'))
    S['subs']=[{'id':'sx1','task_id':'tk-1A','student_id':EVEN,'answer':'1','is_correct':True,'points':1},{'id':'sx2','task_id':'tk-1B','student_id':ODD,'answer':'?','is_correct':None,'points':None}]
    R.click('[role=tab]:has-text("Жауаптар")'); R.wait_for_selector('[data-testid=levels-matrix]'); R.wait_for_timeout(400)
    heads=R.locator('[data-testid=levels-matrix] thead th').all_inner_texts()
    ok('T3 matrix has a column per level and variant', heads[1:]==['L1A','L1B','L2A','L2B','L3A','L3B'], str(heads))
    R.click('button[aria-label$="L1B қабылдау"]'); R.wait_for_timeout(300)
    ok('T3 teacher accepts a manual answer with full points', calls('cf_grade')[-1]=={'p_sub':'sx2','p_points':1,'p_feedback':None})
    shot(R,'remote_pairs_matrix')
    R2=page(TEACH,'teacher',None,(390,844)); S['me']=TEACH; S['role']='teacher'; R2.goto(B+'#remote/s-1'); R2.wait_for_selector('[data-testid=pairs]'); shot(R2,'remote_phone_pairs')
    ok('T4 remote phone: no horizontal scroll', R2.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
    ok('no console errors', not errors, str(errors[:3]))
    b.close()
bad=[r for r in results if not r[1]]
print(f'{len(results)-len(bad)}/{len(results)} passed'); sys.exit(1 if bad else 0)
