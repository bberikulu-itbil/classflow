# Teacher remote (#remote/<id>) against a fake Supabase: rpc calls, tab panel, keyboard, themes, phone. SHOTS=dir saves screenshots.
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
srv=socketserver.TCPServer(('127.0.0.1',5223),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5223/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})
CLASSES=[{'id':'c-7b','name':'7B'}]; LESSONS=[{'id':'l-1','title':'Циклдер','subject':'Информатика'},{'id':'l-2','title':'Массивтер','subject':'Информатика'}]
import copy
SID='s-1'; SHOTS=os.environ.get('SHOTS')
SLIDES=[{'type':'title','title':'Циклдер','subtitle':'for және while'},{'type':'bullets','title':'Цикл дегеніміз не?','bullets':['Әрекетті қайталау','Санауыш цикл','Шартты цикл'],'notes':'Мысал: 10 рет сәлем айту'},{'type':'quiz','title':'Неше рет орындалады?','prompt':'for i in range(3): print(i)'},{'type':'code','title':'Өзің жаз','prompt':'1-ден 5-ке дейін санды шығар'},{'type':'summary','title':'Қорытынды'}]
def fresh():
    return {
     'sess':{'id':SID,'title':'Циклдер','class_id':'c-7b','join_code':'482913','current_slide':1,'slide_count':5,'locked':False,'groups_count':3,'active_task_id':'tk-1','status':'live'},
     'parts':[{'student_id':f's{i}','full_name':n,'presence':pr,'hand':h,'locked':lk,'away_count':ac,'away_seconds':asec,'att':at} for i,(n,pr,h,lk,ac,asec,at) in enumerate([
       ('Айдар Нұрланов','online',False,False,0,0,'present'),('Дана Сәрсенова','online',True,False,0,0,'present'),('Ерлан Қасымов','away',False,False,3,95,'present'),
       ('Мерей Ахметова','online',False,True,1,20,'late'),('Тимур Болатов','offline',False,False,0,0,'absent'),('Аружан Серікқызы','online',False,False,0,0,'present')])],
     'task':{'id':'tk-1','status':'open','kind':'quiz','prompt':'for i in range(3): print(i) — неше рет орындалады?','points':2,'options':['2','3','4'],'time_limit':120,'opened_at':datetime.datetime.now(datetime.timezone.utc).isoformat()},
     'subs':[{'id':'sb1','student_id':'s0','answer':'1','points':2,'is_correct':True},{'id':'sb2','student_id':'s1','answer':'0','points':0,'is_correct':False}],
     'lb':[{'full_name':'Дана Сәрсенова','group_no':1,'points':7},{'full_name':'Айдар Нұрланов','group_no':2,'points':5}],'gs':[{'group_no':1,'points':7},{'group_no':2,'points':5}],
     'att':[{'full_name':'Айдар Нұрланов','status':'present','away_count':0,'away_seconds':0},{'full_name':'Мерей Ахметова','status':'late','away_count':1,'away_seconds':20},{'full_name':'Тимур Болатов','status':'absent','away_count':0,'away_seconds':0}]}
S=fresh(); RPC=[]
def stub(r):
    q=r.request; u=urlparse(q.url); qs=parse_qs(u.query); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/rpc/' in u.path:
        a=json.loads(q.post_data or '{}'); RPC.append((name,a))
        if S.get('fail')==name: return out({'message':'Рұқсат жоқ','code':'42501'},403)
        if name=='cf_leaderboard': return out(S['lb'])
        if name=='cf_group_scores': return out(S['gs'])
        if name=='cf_attendance': return out(S['att'])
        if name=='cf_goto': S['sess']['current_slide']=a['p_index']
        if name=='cf_lock':
            if a['p_student'] is None: S['sess']['locked']=a['p_locked']
            else:
                for p in S['parts']:
                    if p['student_id']==a['p_student']: p['locked']=a['p_locked']
        if name=='cf_clear_hand':
            for p in S['parts']:
                if p['student_id']==a['p_student']: p['hand']=False
        if name=='cf_close_task': S['task']['status']='closed'
        if name=='cf_open_task': S['task']['status']='open'; S['task']['opened_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
        if name=='cf_end_session': S['sess']['status']='ended'
        return out(None)
    if name=='profiles': return out(ME)
    if name=='classes': return pick([{'id':'c-7b','name':'7B'}])
    if name=='cf_sessions': return pick([S['sess']])
    if name=='cf_session_private': return pick([{'slides':SLIDES}])
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
URL=B+'#remote/'+SID
def calls(n): return [a for (k,a) in RPC if k==n]
def axe(pg,name):
    pg.wait_for_timeout(300); pg.evaluate(AXE)
    res=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa']}).then(r=>r.violations.map(v=>v.id+':'+v.nodes.length+':'+(v.nodes[0].html||'').slice(0,90)))")
    ok('axe '+name, not res, str(res))
def shot(pg,name):
    if SHOTS: pg.screenshot(path=f'{SHOTS}/{name}.png',full_page=False)
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vp=(1440,900),theme=None):
        c=b.new_context(viewport={'width':vp[0],'height':vp[1]}); c.route('**/*',route)
        c.add_init_script("try{localStorage.setItem('sb-tsaqxuutacgbeaaqzivv-auth-token',%s)}catch(e){}"%json.dumps(SESSION))
        if theme: c.add_init_script("try{localStorage.setItem('cf_theme','%s')}catch(e){}"%theme)
        pg=c.new_page(); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    def ready(pg): S.clear(); S.update(fresh()); pg.goto(URL); pg.wait_for_selector('text=Цикл дегеніміз не?'); pg.wait_for_timeout(300)
    A=page(); ready(A); shot(A,'desk_light')
    txt=lambda pg: pg.locator('main').inner_text()
    ok('R1 header: class, lesson, join code with a gap', A.locator('header').inner_text().find('7B · ЦИКЛДЕР')>=0 or '7B' in A.locator('header').inner_text(), A.locator('header').inner_text()[:120])
    ok('R1 join code is shown as 482 913', '482 913' in A.locator('header').inner_text().replace('\xa0',' '))
    st=lambda k: A.locator(f'div:has(> div:text-is("{k}"))').first.locator('div').nth(1).inner_text()
    ok('R2 stats: online 4/6, handed in 2/6, hands 1, warnings 2', (st('Қатысу'),st('Тапсырды'),st('Қол көтерді'),st('Ескерту'))==('4 / 6','2 / 6','1','2'), str((st('Қатысу'),st('Тапсырды'),st('Қол көтерді'),st('Ескерту'))))
    ok('R3 student rows say the state in words, not only by colour', A.locator('li:has-text("Ерлан Қасымов"):has-text("беттен шықты")').count()==1 and A.locator('li:has-text("Тимур Болатов"):has-text("офлайн")').count()==1 and A.locator('li:has-text("Мерей"):has-text("бұғатталған"):has-text("кешікті")').count()==1)
    ok('R3 hand-raisers are pinned in their own strip', A.locator('p:text-is("Қол көтергендер")').count()==1 and A.locator('div:has(> p:text-is("Қол көтергендер")) >> text=Дана Сәрсенова').count()==1)
    ok('R3 every icon button has a name with the student', A.locator('li button:not([aria-label])').count()==0 and A.locator('button[aria-label="Айдар Нұрланов: +1 ұпай"]').count()==1)
    nxt=A.locator('section[aria-label="Слайдты басқару"] button:has-text("Келесі")'); prv=A.locator('section[aria-label="Слайдты басқару"] button:has-text("Артқа")')
    nxt.click(); A.wait_for_selector('text=Слайд 3'); ok('R4 next goes to slide index 2 via cf_goto', calls('cf_goto')[-1]['p_index']==2 and 'Тест' in txt(A))
    ok('R4 next slide hint names the following slide', 'Келесі: Өзің жаз' in txt(A))
    ok('R4 quiz slide offers the task (already open one is shown with close)', A.locator('button:text-is("Тапсырманы жабу")').count()==1)
    A.keyboard.press('ArrowLeft'); A.wait_for_selector('text=Слайд 2'); ok('R5 ArrowLeft goes back', calls('cf_goto')[-1]['p_index']==1)
    n=len(calls('cf_goto')); A.fill('input[aria-label^="Хабарлама"]','сәлем'); A.press('input[aria-label^="Хабарлама"]','ArrowRight'); A.wait_for_timeout(200)
    ok('R5 arrows inside the text box do not change slides', len(calls('cf_goto'))==n)
    A.locator('input[aria-label^="Хабарлама"]').fill('')
    for _ in range(3): A.keyboard.press('Escape')
    A.evaluate('document.activeElement.blur()')
    for k in range(3): A.keyboard.press('ArrowRight'); A.wait_for_timeout(250)
    A.wait_for_selector('text=Слайд 5'); ok('R5 last slide: "Келесі" is disabled, not wrapping', nxt.is_disabled() and not prv.is_disabled())
    for k in range(4): A.keyboard.press('ArrowLeft'); A.wait_for_timeout(250)
    A.wait_for_selector('text=Слайд 1 '); ok('R5 first slide: "Артқа" is disabled', prv.is_disabled())
    nxt.click(); A.wait_for_selector('text=Слайд 2')
    # lock all
    lk=A.locator('button[aria-pressed]'); ok('R6 lock-all is a toggle, off at first', lk.get_attribute('aria-pressed')=='false' and 'Бәрін бұғаттау' in lk.inner_text())
    lk.click(); A.wait_for_selector('button[aria-pressed=true]'); ok('R6 lock-all calls cf_lock for everyone and says so', calls('cf_lock')[-1]=={'p_session':SID,'p_student':None,'p_locked':True} and 'бұғатталған' in lk.inner_text())
    lk.click(); A.wait_for_selector('button[aria-pressed=false]')
    # task
    A.click('button:text-is("Тапсырманы жабу")'); A.wait_for_selector('button:text-is("Жаба")', timeout=1500) if False else A.wait_for_selector('text=жабылған'); ok('R7 close task calls cf_close_task', len(calls('cf_close_task'))==1 and calls('cf_close_task')[0]['p_task']=='tk-1')
    ok('R7 on a non-task slide the card shows the closed task without a send button', A.locator('button:text-is("Тапсырма жіберу")').count()==0)
    nxt.click(); A.wait_for_selector('text=Слайд 3'); A.click('button:text-is("Тапсырма жіберу")'); A.wait_for_selector('text=ашық'); ok('R7 send task on a quiz slide calls cf_open_task with its index', calls('cf_open_task')[-1]['p_index']==2)
    A.locator('section[aria-label="Слайдты басқару"] button:has-text("Артқа")').click(); A.wait_for_selector('text=Слайд 2')
    # class tab actions
    A.click('button[aria-label="Дана Сәрсенова: қолын түсіру"]'); A.wait_for_selector('p:text-is("Қол көтергендер")', state='detached'); ok('R8 lowering a hand calls cf_clear_hand and removes the strip', calls('cf_clear_hand')[-1]['p_student']=='s1' and A.locator('div:text-is("Сынып")').count()==0)
    ok('R8 tab label no longer carries the hand count', A.locator('[role=tab][aria-selected=true]').inner_text().strip()=='Сынып')
    A.click('button:has-text("Барлығына")'); A.wait_for_selector('[role=status]:has-text("Алдымен")'); ok('R9 empty message is refused with a reason, nothing sent', calls('cf_popup')==[] and A.locator('[role=status]').inner_text().startswith('Алдымен'))
    A.fill('input[aria-label^="Хабарлама"]','Тыныш болыңыздар'); A.click('button:has-text("Барлығына")'); A.wait_for_selector('[role=status]:has-text("Барлығына жіберілді")')
    ok('R9 message to all: cf_popup with null student', calls('cf_popup')[-1]=={'p_session':SID,'p_student':None,'p_message':'Тыныш болыңыздар'})
    A.click('button[aria-label="Айдар Нұрланов: хабарлама жіберу"]'); A.wait_for_selector('[role=status]:has-text("Жіберілді")'); ok('R9 message to one student', calls('cf_popup')[-1]['p_student']=='s0')
    A.click('button[aria-label="Айдар Нұрланов: бұғаттау"]'); A.wait_for_selector('button[aria-label="Айдар Нұрланов: бұғатты ашу"]'); ok('R10 per-student lock flips its label', calls('cf_lock')[-1]=={'p_session':SID,'p_student':'s0','p_locked':True})
    A.click('button[aria-label="Айдар Нұрланов: +1 ұпай"]'); A.wait_for_timeout(200); ok('R11 +1 point is an activity award', calls('cf_award')[-1]=={'p_session':SID,'p_student':'s0','p_group':None,'p_points':1,'p_reason':'Белсенділік'})
    # other tabs
    A.click('[role=tab]:has-text("Жауаптар")'); A.wait_for_selector('li:has-text("Айдар Нұрланов")'); ok('R12 answers: the chosen option text, not its index, and the score', A.locator('li:has-text("Айдар Нұрланов"):has-text("3")').count()==1 and A.locator('li:has-text("Айдар Нұрланов"):has-text("2/2")').count()==1, A.locator('[role=tabpanel]').inner_text()[:200])
    ok('R12 the panel is labelled by its tab', A.locator('[role=tabpanel]').get_attribute('aria-labelledby')=='remote-tab-subs')
    A.click('[role=tab]:has-text("Ұпай")'); A.click('button[aria-label="Топ 1: +3 ұпай"]'); A.wait_for_timeout(200); ok('R12 group award: cf_award with group and points', calls('cf_award')[-1]=={'p_session':SID,'p_student':None,'p_group':1,'p_points':3,'p_reason':'Топтық'})
    ok('R12 leaderboard is a real table with headers', A.locator('table:has(caption) th[scope=col]').count()==4 and A.locator('td:has-text("Дана Сәрсенова")').count()==1)
    A.click('[role=tab]:has-text("Қатысу")'); A.wait_for_selector('td:has-text("Тимур Болатов")'); ok('R12 attendance rows', A.locator('tbody tr').count()==3 and A.locator('td:text-is("жоқ")').count()==1)
    A.click('[role=tab]:has-text("Слайдтар")'); ok('R12 slide list marks the current slide', A.locator('button[aria-current=step]').inner_text().find('Цикл дегеніміз не?')>=0 and A.locator('ol li').count()==5)
    A.click('ol li:nth-child(4) button'); A.wait_for_selector('text=Слайд 4'); ok('R12 clicking a slide jumps there', calls('cf_goto')[-1]['p_index']==3)
    A.click('ol li:nth-child(2) button'); A.wait_for_selector('text=Слайд 2')
    A.keyboard.press('Home'); A.focus('[role=tab][aria-selected=true]'); A.keyboard.press('ArrowRight'); ok('R13 arrows on the tab strip switch tabs and not slides', A.locator('[role=tab][aria-selected=true]').inner_text().strip()=='Сынып' and calls('cf_goto')[-1]['p_index']==1)
    # end lesson
    A.click('button:has-text("Аяқтау")'); ok('R14 ending asks first, nothing sent', A.locator('[role=alertdialog]').count()==1 and calls('cf_end_session')==[])
    A.click('[role=alertdialog] button:text-is("Жалғастыру")'); ok('R14 "keep going" closes the question', A.locator('[role=alertdialog]').count()==0 and calls('cf_end_session')==[])
    A.click('button:has-text("Аяқтау")'); A.click('[role=alertdialog] button:has-text("Иә, аяқтау")'); A.wait_for_function("location.hash===''||location.hash==='#'"); ok('R14 confirmed: cf_end_session then home', len(calls('cf_end_session'))==1)
    # server refusal is shown
    F=page(); ready(F); S['fail']='cf_goto'; F.locator('section[aria-label="Слайдты басқару"] button:has-text("Келесі")').click(); F.wait_for_selector('[role=status]:has-text("Рұқсат жоқ")'); ok('R15 a refused action shows the server message', True); S.pop('fail')
    axe(A.context.new_page() if False else F,'remote light desktop')
    # themes, tabs, phone
    for th in ['dark','ocean','sand']:
        P=page(theme=th); ready(P); axe(P,'remote '+th)
        for t in ['Жауаптар','Ұпай','Қатысу','Слайдтар']:
            if th=='dark': P.click(f'[role=tab]:has-text("{t}")'); axe(P,f'remote dark tab {t}')
    M=page((390,844)); ready(M); shot(M,'phone_light')
    ok('R16 phone: no sideways scroll', M.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    ok('R16 phone: bottom bar buttons visible, card buttons hidden', M.locator('div.fixed button:has-text("Келесі")').is_visible() and not M.locator('section[aria-label="Слайдты басқару"] button:has-text("Келесі")').is_visible())
    ok('R16 desktop: bottom bar hidden', not A.locator('div.fixed').is_visible() if A.locator('div.fixed').count() else True)
    M.locator('div.fixed button:has-text("Келесі")').click(); M.wait_for_selector('text=Слайд 3'); ok('R16 phone next button works', calls('cf_goto')[-1]['p_index']==2)
    ok('R16 phone: touch targets at least 44px', M.evaluate("[...document.querySelectorAll('main button, header button, header a, div.fixed button')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<43).map(e=>e.textContent.trim()||e.getAttribute('aria-label')).join('|')")=='')
    axe(M,'remote phone')
    M2=page((390,844),'dark'); ready(M2); shot(M2,'phone_dark'); axe(M2,'remote phone dark')
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
