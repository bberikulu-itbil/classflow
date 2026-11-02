# In-lesson spreadsheet (src/sheet/MiniSheet.tsx) on a practice slide: formulas, copy/paste, fill handle, status bar, persistence. Same fake Supabase as levels_pairs.py.
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
SLIDES=json.load(open('/tmp/sl-slide.json')); PIDX=[i for i,s in enumerate(SLIDES) if s.get('kind')=='practice' and s.get('levels')][0]; PS=SLIDES[PIDX]; FIDX=[i for i,s in enumerate(SLIDES) if s.get('free')][0]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5228),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5228/'; errors=[]; results=[]; RPC=[]; SHOTS=os.environ.get('SHOTS')
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
def session(sub): return json.dumps({'access_token':jwt(sub),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':sub,'aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
TEACH='tttttttt-0000-0000-0000-000000000001'; EVEN='aaaaaaaa-0000-0000-0000-00000000000a'; ODD='bbbbbbbb-0000-0000-0000-00000000000b'; PART='cccccccc-0000-0000-0000-00000000000c'
def strip(sl):  # what cf_slide hands to students: no answers
    sl=json.loads(json.dumps(sl))
    for L in sl.get('levels',[]):
        for v in L['variants']: v.pop('accept',None)
    sl.pop('notes',None); sl['ru'].pop('notes',None); return sl
OPEN_AT=datetime.datetime.now(datetime.timezone.utc).isoformat()
def fresh_free(me):  # the free practical task of the lesson: one open task without a key (graded by the teacher)
    d=fresh(me); fs=SLIDES[FIDX]
    d['tasks']=[{'id':'tk-free','level':None,'variant':None,'status':'open','points':fs['points'],'kind':'text','prompt':fs['prompt'],'opened_at':OPEN_AT,'slide_index':FIDX}]
    d['sess'].update({'current_slide':FIDX,'active_task_id':'tk-free'}); return d
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
    if t['kind']=='text': S['subs'].append({'id':'sb-free','task_id':tid,'student_id':uid,'answer':ans,'is_correct':None,'points':None}); return None  # manual grading
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
        if name=='cf_slide': return out({'index':S['sess']['current_slide'],'slide':strip(SLIDES[S['sess']['current_slide']]) if S['role']=='student' else SLIDES[S['sess']['current_slide']]})
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
    def student(me=EVEN,vp=(1100,900),free=False,idx=None,lang='kk',wait='[data-testid=minisheet]'):
        S.clear(); S.update(fresh_free(me) if free else fresh(me)); RPC.clear()
        if idx is not None: S['sess']['current_slide']=idx
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s);localStorage.setItem('cf_lang','%s')}catch(e){}"%(json.dumps(session(me)),lang))
        pg=c.new_page(); pg.on('pageerror',lambda e: errors.append(str(e)))
        pg.goto(B+'#s/s-1'); pg.wait_for_selector(wait); pg.wait_for_timeout(300); return pg
    cell=lambda pg,a: pg.locator(f'[data-testid=cell-{a}]')
    val=lambda pg,a: cell(pg,a).get_attribute('data-value')
    def put(pg,a,t): cell(pg,a).click(); pg.keyboard.type(t); pg.keyboard.press('Enter')
    A=student()
    ok('M1 the practice slide has a sheet next to the levels', A.locator('[data-testid=levels-panel]').count()==1 and A.locator('[data-testid=minisheet]').count()==1)
    put(A,'A1','7'); put(A,'A2','3'); put(A,'A3','=A1+A2')
    ok('M2 typing a formula calculates it', val(A,'A3')=='10', val(A,'A3'))
    put(A,'A1','8'); ok('M2 and it recalculates when a cell changes', val(A,'A3')=='11')
    # lesson 4 L3: A4 = A1*(A2+A3) copied to B4
    for a,v in [('A1','3'),('A2','3'),('A3','7'),('A4','=A1*(A2+A3)'),('B1','5'),('B2','8'),('B3','3')]: put(A,a,v)
    ok('M3 parentheses: A4 = 30', val(A,'A4')=='30')
    cell(A,'A4').click(); A.keyboard.press('Control+c'); cell(A,'B4').click(); A.keyboard.press('Control+v')
    ok('M3 Ctrl+C / Ctrl+V shifts references: B4 = 55', val(A,'B4')=='55', val(A,'B4'))
    ok('M3 the pasted formula text is =B1*(B2+B3)', A.input_value('[data-testid=sheet-fx]')=='=B1*(B2+B3)')
    # status bar for a selection
    cell(A,'B1').click(); A.keyboard.press('Shift+ArrowDown'); A.keyboard.press('Shift+ArrowDown')
    ok('M4 selection shows Sum / Average / Count', 'Қосынды: 16' in A.inner_text('[data-testid=sheet-status]') and 'Саны: 3' in A.inner_text('[data-testid=sheet-status]'), A.inner_text('[data-testid=sheet-status]'))
    # series by the fill handle (lesson 2): C1=1, C2=2 dragged to C10
    put(A,'C1','1'); put(A,'C2','2'); cell(A,'C1').click(); A.keyboard.press('Shift+ArrowDown')
    h=A.locator('[data-testid=fill-handle]').bounding_box(); t=cell(A,'C8').bounding_box()
    A.mouse.move(h['x']+h['width']/2,h['y']+h['height']/2); A.mouse.down(); A.mouse.move(t['x']+10,t['y']+10,steps=8); A.mouse.up()
    ok('M5 dragging the fill handle continues the series: C8 = 8', val(A,'C8')=='8', val(A,'C8'))
    # Ctrl+D fills a formula down
    put(A,'D1','2'); put(A,'D2','=D1*2'); cell(A,'D2').click(); A.keyboard.press('Shift+ArrowDown'); A.keyboard.press('Shift+ArrowDown'); A.keyboard.press('Control+d')
    ok('M6 Ctrl+D copies the formula down with shifted references (D4 = 16)', val(A,'D4')=='16', val(A,'D4'))
    put(A,'A6','=1/0'); ok('M7 errors show like a spreadsheet', val(A,'A6')=='#DIV/0!')
    put(A,'B6','=SUM(A1:A3)'); ok('M7 functions work: B6 = 13', val(A,'B6')=='13', val(A,'B6'))
    if SHOTS: A.screenshot(path=f'{SHOTS}/sheet_desktop.png')
    if SHOTS: A.screenshot(path=f'{SHOTS}/taskpage_full.png',full_page=True)
    # the answer is read from the sheet: L1 A of lesson 4 asks for A3 = A1+A2 with A1=7, A2=3
    for a,v in [('A1','7'),('A2','3'),('A3','=A1+A2')]: put(A,a,v)
    A.wait_for_timeout(200)
    ok('M8 the level names its cell and shows the live value', A.inner_text('[data-testid=cell-now-1A]')=='10', A.inner_text('[data-testid=cell-now-1A]'))
    put(A,'A2','4'); A.wait_for_timeout(200); ok('M8 the shown value follows the sheet', A.inner_text('[data-testid=cell-now-1A]')=='11'); put(A,'A2','3')
    A.click('[data-testid=cell-check-1A] button'); A.wait_for_selector('[data-testid=task-1A] >> text=Дұрыс')
    ok('M8 sending it from the sheet is accepted by the server', calls('cf_submit')[-1]['p_answer']=='10' and A.locator('[data-testid=task-1A] input').count()==0)
    ok('M8b L2 opens and also reads from its cell (A4)', A.locator('[data-testid=cell-check-2A]').count()==1)
    ok('M11 the page is clearly a task page: banner, orange frame, two columns', A.locator('[data-testid=task-banner]').count()==1 and A.locator('[data-testid=task-page]').count()==1 and 'тапсырма' in A.inner_text('[data-testid=task-banner]').lower())
    bx=A.locator('[data-testid=levels-panel]').bounding_box(); sx=A.locator('[data-testid=minisheet]').bounding_box()
    ok('M11 tasks on the left, big sheet on the right', sx['x']>bx['x']+bx['width']-5 and sx['width']>500, f"{bx['width']:.0f} {sx['width']:.0f}")
    # free work: formats, bold, undo, a chart, full screen
    A.click('[aria-label="+ баған"]'); ok('M12 + column adds columns', cell(A,'F1').count()==1)
    put(A,'E1','0,5'); cell(A,'E1').click(); A.select_option('[data-testid=sheet-toolbar] select','pct')
    ok('M12 Percent format: 0,5 shows 50.00%', val(A,'E1')=='50.00%', val(A,'E1'))
    A.select_option('[data-testid=sheet-toolbar] select','sci'); ok('M12 Scientific format', val(A,'E1')=='5.00E-01', val(A,'E1'))
    put(A,'E2','56'); cell(A,'E2').click(); A.select_option('[data-testid=sheet-toolbar] select','sci'); ok('M12 56 in Scientific is 5.60E+01', val(A,'E2')=='5.60E+01', val(A,'E2'))
    put(A,'E3','17.09.2016'); cell(A,'E3').click(); A.select_option('[data-testid=sheet-toolbar] select','num'); ok('M12 a date in Number format is 42630', val(A,'E3')=='42630', val(A,'E3'))
    put(A,'E4','2999'); cell(A,'E4').click(); A.select_option('[data-testid=sheet-toolbar] select','cur'); ok('M12 Currency: $2,999.00', val(A,'E4')=='$2,999.00', val(A,'E4'))
    cell(A,'E4').click(); A.click('[aria-label="Қалың (Ctrl+B)"]'); ok('M12 bold is applied to the cell', 'font-bold' in (cell(A,'E4').get_attribute('class') or '') or 'bold' in (cell(A,'E4').get_attribute('style') or '') or cell(A,'E4').locator('b,strong,.font-bold').count()>0 or A.locator('[aria-label="Қалың (Ctrl+B)"].bg-emerald-600').count()==1)
    put(A,'F1','9'); A.click('[aria-label="Қайтару (Ctrl+Z)"]'); ok('M12 undo takes the last edit back', val(A,'F1')=='', val(A,'F1'))
    put(A,'F2','10'); put(A,'F3','20'); put(A,'F4','30'); cell(A,'F2').click(); A.keyboard.press('Shift+ArrowDown'); A.keyboard.press('Shift+ArrowDown'); A.click('[aria-label="Диаграмма: bar"]')
    ok('M13 a chart is built from the selected range', A.locator('[data-testid=sheet-chart]').count()==1)
    A.click('[aria-label="Толық экран"]'); fb=A.locator('[data-testid=minisheet]').bounding_box()
    ok('M14 full screen fills the window', fb['width']>=1090 and fb['height']>=890, f"{fb['width']:.0f}x{fb['height']:.0f}"); A.click('[aria-label="Жабу"]')
    A.reload(); A.wait_for_selector('[data-testid=minisheet]'); A.wait_for_timeout(300)
    ok('M9 the work survives a reload (values, formats, chart)', val(A,'B4')=='55' and val(A,'C8')=='8' and val(A,'E1')=='5.00E-01' and A.locator('[data-testid=sheet-chart]').count()==1)
    A.click('[aria-label="Бастапқыға қайтару"]'); ok('M9 reset clears it', val(A,'B4')=='' and A.locator('[data-testid=sheet-chart]').count()==0)
    # the designed look: a plain content slide marked design:'lab' is drawn as a canvas page with its picture, in both languages
    di=[i for i,x in enumerate(SLIDES) if x.get('design')=='lab' and x['type']=='content' and x.get('art')][0]
    D=student(EVEN,(1100,900),False,di,'kk','img[src="lec/inf8-%s.svg"]'%SLIDES[di]['art'])
    ok('M16 a content slide is drawn on the canvas with its picture', D.locator('img[src^="lec/inf8-"]').count()==1 and SLIDES[di]['title'] in D.inner_text('body'), SLIDES[di]['title'])
    ok('M16 and shows its kind badge once', D.locator('[data-testid=kind-badge]').count()==1)
    if SHOTS: D.screenshot(path=f'{SHOTS}/slide_kk.png')
    R=student(EVEN,(1100,900),False,di,'ru','img[src="lec/inf8-%s.svg"]'%SLIDES[di]['art'])
    ok('M16 in Russian the same page carries the Russian text', SLIDES[di]['ru']['title'] in R.inner_text('body') and SLIDES[di]['ru']['bullets'][0][:20] in R.inner_text('body'))
    SI=[i for i,x in enumerate(SLIDES) if x['type']=='solution'][0]
    W=student(EVEN,(1100,900),False,SI,'kk','h2.sr-only')
    ok('M16 a worked example is drawn as cards with the task and the solution', SLIDES[SI]['sections'][2]['text'] in W.inner_text('body') and SLIDES[SI]['sections'][0]['text'] in W.inner_text('body'))
    # free practical work: build in the sheet, hand in a copy
    F=student(EVEN,(1100,900),True)
    ok('M15 a free task shows a sheet and no levels', F.locator('[data-testid=levels-panel]').count()==0 and F.locator('[data-testid=task-banner]').count()==1)
    put(F,'A1','Name'); put(F,'B1','Age'); put(F,'A2','Aidar'); put(F,'B2','14')
    F.click('[data-testid=free-submit] button'); F.wait_for_selector('text=Жауап жіберілді')
    sub=calls('cf_submit')[-1]['p_answer']
    ok('M15 the hand-in carries the sheet copy', 'A1\tName' in sub and 'B2\t14' in sub, sub[:80].replace('\n','|'))
    Ph=student(EVEN,(390,844)); put(Ph,'A1','5')
    ok('M10 phone: page does not scroll sideways', Ph.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
    if SHOTS: Ph.screenshot(path=f'{SHOTS}/sheet_phone.png')
    b.close()
bad=[r for r in results if not r[1]]; print(f'{len(results)-len(bad)}/{len(results)} passed; errors: {errors[:5]}'); sys.exit(1 if bad else 0)
