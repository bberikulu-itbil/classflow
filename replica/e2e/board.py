# Classroom board (#board/<id>): joining card (drag/snap/fold/enlarge), tool dock (draw, timer, random, number systems, scores), themes, phone. SHOTS=dir saves screenshots.
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
srv=socketserver.TCPServer(('127.0.0.1',5226),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5226/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})

SID='s-1'; SHOTS=os.environ.get('SHOTS')
def fresh():
    return {'sess':{'id':SID,'title':'Циклдер','class_id':'c-7b','join_code':'482913','current_slide':1,'slide_count':5,'status':'live','active_task_id':'tk-1'},
     'parts':[{'student_id':f's{i}','full_name':n,'presence':pr} for i,(n,pr) in enumerate([('Айдар Нұрланов','online'),('Дана Сәрсенова','online'),('Ерлан Қасымов','away'),('Мерей Ахметова','online'),('Тимур Болатов','offline'),('Аружан Серікқызы','online')])],
     'task':{'id':'tk-1','status':'open','kind':'quiz','prompt':'?','points':2,'options':['2','3'],'time_limit':120,'opened_at':datetime.datetime.now(datetime.timezone.utc).isoformat()},
     'subs':[{'id':'sb1'},{'id':'sb2'}],
     'lb':[{'full_name':'Дана Сәрсенова','group_no':1,'points':7},{'full_name':'Айдар Нұрланов','group_no':2,'points':5}],'gs':[{'group_no':1,'points':7},{'group_no':2,'points':5}]}
S=fresh()
SL=[{'type':'title','title':'Циклдер','subtitle':'for және while'},{'type':'bullets','title':'Цикл дегеніміз не?','bullets':['Әрекетті қайталау','Санауыш цикл']},{'type':'title','title':'Қорытынды','subtitle':'рахмет'}]
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/rpc/' in u.path:
        if name=='cf_slide': return out({'slide':SL[min(S['sess']['current_slide'],len(SL)-1)]})
        if name=='cf_leaderboard': return out(S['lb'])
        if name=='cf_group_scores': return out(S['gs'])
        return out(None)
    if name=='profiles': return out(ME)
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
URL=B+'#board/'+SID
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
    def ready(pg,fresh_state=True):
        if fresh_state: S.clear(); S.update(fresh())
        pg.goto(URL); pg.wait_for_selector('text=Цикл дегеніміз не?'); pg.wait_for_timeout(300)
    box=lambda pg,sel: pg.locator(sel).first.bounding_box()
    A=page(); ready(A); shot(A,'board_desk')
    ok('B1 slide, counter and task chip', 'Слайд 2 / 5' in A.locator('body').inner_text() and 'Тапсырды 2 / 6' in A.locator('[role=status]').first.inner_text(), A.locator('body').inner_text()[:80])
    ok('B1 board is dark whatever the theme', A.locator('div[data-theme=dark]').count()>=1)
    qb=box(A,'aside[aria-label^="Қосылу"]'); mb=box(A,'main')
    ok('B2 join card sits at the right edge with QR, spaced code and count', qb and qb['x']+qb['width']>1400 and A.locator('aside [role=img] svg').count()==1 and '482 913' in A.locator('aside').inner_text().replace('\xa0',' ') and 'Қатысушы: 6' in A.locator('aside').inner_text())
    ok('B2 the slide area leaves room so the card never covers the slide', A.evaluate("parseFloat(getComputedStyle(document.querySelector('main')).paddingRight)")>200)
    # drag the card by its title bar to the left half: it snaps to the left edge and remembers
    hd=A.locator('aside div:text-is("Қосылу")').first.bounding_box()
    A.mouse.move(hd['x']+30,hd['y']+20); A.mouse.down(); A.mouse.move(700,300,steps=6); A.mouse.move(200,320,steps=6); A.mouse.up(); A.wait_for_timeout(200)
    qb=box(A,'aside[aria-label^="Қосылу"]')
    ok('B3 dropped on the left half → snaps to the left edge, padding moves with it', qb['x']<30 and A.evaluate("parseFloat(getComputedStyle(document.querySelector('main')).paddingLeft)")>200 and A.evaluate("parseFloat(getComputedStyle(document.querySelector('main')).paddingRight)")<40, str(qb))
    A.reload(); A.wait_for_selector('aside[aria-label^="Қосылу"]'); ok('B3 position survives a reload', box(A,'aside[aria-label^="Қосылу"]')['x']<30)
    A.click('button[aria-label="Қарсы шетке ауыстыру"]'); A.wait_for_timeout(100); ok('B4 swap button moves it to the other edge', box(A,'aside[aria-label^="Қосылу"]')['x']>1000)
    w0=box(A,'aside[aria-label^="Қосылу"]')['width']; A.click('button[aria-label="QR-ды үлкейту"]'); ok('B4 enlarge widens the card and flags itself pressed', box(A,'aside[aria-label^="Қосылу"]')['width']>w0+80 and A.locator('button[aria-label="QR-ды кішірейту"][aria-pressed=true]').count()==1)
    A.click('button[aria-label="QR-ды кішірейту"]')
    A.click('button[aria-label="Шетке жасыру"]'); A.wait_for_selector('button[aria-label="QR мен қосылу кодын көрсету"]')
    tb=box(A,'button[aria-label="QR мен қосылу кодын көрсету"]')
    ok('B5 hidden: a small tab hugs the edge and the slide gets the width back', tb['x']+tb['width']>=1439 and tb['width']<=60 and A.evaluate("parseFloat(getComputedStyle(document.querySelector('main')).paddingRight)")<40 and A.locator('aside').count()==0)
    A.click('button[aria-label="QR мен қосылу кодын көрсету"]'); A.wait_for_selector('aside[aria-label^="Қосылу"]'); ok('B5 the tab brings the card back', True)
    # drawing
    A.click('button:has-text("Сызу")'); A.wait_for_selector('canvas[aria-label="Сызу беті"]')
    ok('B6 draw mode swaps the dock for drawing tools', A.locator('[role=toolbar][aria-label="Сызу құралдары"] button:has-text("Қалам")[aria-pressed=true]').count()==1 and A.locator('button:has-text("Таймер")').count()==0)
    ink=lambda: A.evaluate("()=>{const c=document.querySelector('canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n}")
    A.mouse.move(300,300); A.mouse.down(); A.mouse.move(400,350,steps=8); A.mouse.move(520,300,steps=8); A.mouse.up(); n1=ink()
    ok('B6 a pen stroke leaves ink', n1>500, str(n1))
    A.click('button:has-text("Көрсеткі")'); A.mouse.move(300,500); A.mouse.down(); A.mouse.move(600,520,steps=5); A.mouse.up(); n2=ink(); ok('B6 an arrow adds ink', n2>n1+300, str((n1,n2)))
    A.click('button:has-text("Қайтару")'); ok('B6 undo takes the arrow back exactly', abs(ink()-n1)<5, str((ink(),n1)))
    A.click('button:has-text("Өшіргіш")'); A.mouse.move(300,300); A.mouse.down(); A.mouse.move(520,300,steps=10); A.mouse.up(); ok('B6 eraser cuts the stroke away', ink()<n1*0.8, str((ink(),n1)))
    A.click('button:has-text("Қалам")'); A.click('button[aria-label="Көк"]'); A.mouse.move(300,300); A.mouse.down(); A.mouse.move(500,330,steps=6); A.mouse.up()
    A.click('[role=group][aria-label="Фон"] button:text-is("Тор")'); ok('B6 grid board: a white sheet with lines behind the ink', A.locator('canvas').evaluate("e=>getComputedStyle(e).backgroundImage.includes('linear-gradient') && getComputedStyle(e).backgroundColor=='rgb(255, 255, 255)'"))
    axe(A,'draw toolbar, grid board'); shot(A,'board_draw')
    A.click('[role=group][aria-label="Фон"] button:text-is("Слайд")'); A.click('button:has-text("Тазарту")'); ok('B6 clear empties the sheet', ink()==0)
    A.keyboard.press('Escape'); ok('B7 Escape leaves draw mode', A.locator('canvas').count()==0 and A.locator('button:has-text("Сызу")').count()==1)
    # tools
    A.click('button:has-text("Таймер")'); A.wait_for_selector('section[role=dialog][aria-label="Таймер"]'); T='section[aria-label="Таймер"]'
    A.click(T+' button:text-is("1 мин")'); ok('B8 preset shows 1:00', A.locator(T+' [role=timer]').inner_text()=='1:00')
    A.click(T+' button:text-is("Бастау")'); A.wait_for_timeout(2300); v=A.locator(T+' [role=timer]').inner_text(); ok('B8 it counts down', v in ('0:58','0:57'), v)
    A.click('button[aria-label="Таймер: жабу"]'); A.wait_for_timeout(300); ok('B8 closing the window does not stop it: the dock shows the time', A.locator('[role=toolbar] button').nth(1).inner_text().strip() in ('0:57','0:56','0:55','0:58'), A.locator('[role=toolbar] button').nth(1).inner_text())
    A.locator('[role=toolbar] button').nth(1).click(); A.click(T+' button:text-is("Тоқтату")'); v=A.locator(T+' [role=timer]').inner_text(); A.wait_for_timeout(1200); ok('B8 pause holds the time', A.locator(T+' [role=timer]').inner_text()==v)
    A.click(T+' button:text-is("Қайта")'); ok('B8 reset returns to 1:00', A.locator(T+' [role=timer]').inner_text()=='1:00')
    A.click('button:has-text("Кездейсоқ")'); R='section[aria-label="Кездейсоқ оқушы"]'; A.wait_for_selector(R)
    names=[]
    for i in range(4):
        A.click(R+' button:text-is("Таңдау")'); A.wait_for_function("document.querySelector('section[aria-label=\"Кездейсоқ оқушы\"] [role=status]').textContent.includes('Таңдалды')",timeout=5000)
        names.append(A.locator(R+' [role=status]').inner_text().replace('Таңдалды: ','')); A.wait_for_timeout(50)
        if i<3: A.evaluate("document.querySelector('section[aria-label=\"Кездейсоқ оқушы\"] [role=status]').textContent=''") if False else None
    ok('B9 four picks = the four online students, none twice, offline ones never', sorted(names)==sorted(['Айдар Нұрланов','Дана Сәрсенова','Мерей Ахметова','Аружан Серікқызы']), str(names))
    ok('B9 then it is empty and says so', A.locator(R+' button:text-is("Таңдау")').is_disabled() and 'Бәрі таңдалды' in A.locator(R).inner_text())
    A.click(R+' label:has-text("Қайталамау") input'); ok('B9 repeats allowed again', A.locator(R+' button:text-is("Таңдау")').is_enabled())
    A.click('button:has-text("Сан жүйесі")'); C='section[aria-label="Санау жүйелері"]'; A.wait_for_selector(C)
    f=lambda k: A.locator(C+f' label:has-text("{k}") input')
    f('Ондық').fill('255'); ok('B10 255 → 11111111 / 377 / FF', (f('Екілік').input_value(),f('Сегіздік').input_value(),f('Он алтылық').input_value())==('11111111','377','FF'))
    f('Он алтылық').fill('41'); ok('B10 hex 41 → 65 and the character A', f('Ондық').input_value()=='65' and 'A' in A.locator(C+' p:has-text("ASCII")').inner_text())
    f('Екілік').fill('102'); ok('B10 a wrong digit is flagged, not converted', A.locator(C+' [role=alert]').count()==1 and f('Екілік').get_attribute('aria-invalid')=='true')
    f('Екілік').fill(''); ok('B10 emptying clears every field', f('Ондық').input_value()=='' and A.locator(C+' [role=alert]').count()==0)
    A.click('button:has-text("Ұпай")'); ok('B11 scores: groups and leaders', 'Топ 1' in A.locator('section[aria-label="Топтар мен ұпай"]').inner_text() and 'Дана Сәрсенова' in A.locator('section[aria-label="Топтар мен ұпай"]').inner_text())
    # windows are draggable, stack, and Escape closes the top one
    hd=A.locator(C+' div:text-is("Санау жүйелері")').bounding_box(); x0=A.locator(C).bounding_box()['x']; A.mouse.move(hd['x']+60,hd['y']+10); A.mouse.down(); A.mouse.move(hd['x']+260,hd['y']+110,steps=6); A.mouse.up()
    ok('B12 a window follows the pointer by its title bar', A.locator(C).bounding_box()['x']>x0+150)
    ok('B12 the one just used is on top', int(A.locator(C).evaluate('e=>getComputedStyle(e).zIndex'))>=int(A.locator('section[aria-label="Топтар мен ұпай"]').evaluate('e=>getComputedStyle(e).zIndex')))
    A.keyboard.press('Escape'); ok('B12 Escape closes the top window only', A.locator('section[role=dialog]').count()==3)
    axe(A,'board with windows open'); shot(A,'board_tools')
    # a new slide wipes the annotations of the old one
    A.click('button:has-text("Сызу")'); A.mouse.move(700,600); A.mouse.down(); A.mouse.move(900,650,steps=5); A.mouse.up(); n=ink(); S['sess']['current_slide']=2
    A.wait_for_function("document.querySelector('canvas').getContext('2d').getImageData(0,0,50,50) && true"); A.wait_for_selector('text=Қорытынды',timeout=14000); A.wait_for_timeout(200)
    ok('B13 next slide: pen marks of the previous slide are gone', n>300 and ink()==0, str((n,ink())))
    # other themes must not change the board
    for th in ['light','ocean','sand']:
        T2=page(theme=th); ready(T2); ok('B14 theme '+th+': board stays dark', T2.evaluate("getComputedStyle(document.querySelector('div[data-theme=dark]')).backgroundColor")==A.evaluate("getComputedStyle(document.querySelector('div[data-theme=dark]')).backgroundColor")); axe(T2,'board '+th)
    # phone
    P=page((390,800)); ready(P)
    ok('B15 390px: no sideways scroll and the card starts folded to a tab', P.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1") and P.locator('button[aria-label="QR мен қосылу кодын көрсету"]').count()==1)
    tb=box(P,'[role=toolbar]'); ok('B15 390px: the dock fits the screen', tb['x']>=0 and tb['x']+tb['width']<=391, str(tb))
    P.click('button:has-text("Сызу")'); tb=box(P,'[role=toolbar]'); ok('B15 390px: drawing tools wrap inside the screen', tb['x']>=0 and tb['x']+tb['width']<=391 and tb['y']>0, str(tb)); shot(P,'board_phone_draw'); P.click('button:has-text("Жабу")')
    P.click('button[aria-label="QR мен қосылу кодын көрсету"]'); axe(P,'board phone, card open'); shot(P,'board_phone')
    # ended
    E=page(); S.clear(); S.update(fresh()); S['sess']['status']='ended'; E.goto(URL); E.wait_for_selector('h1:text-is("Сабақ аяқталды")'); ok('B16 ended session says so and shows no tools', E.locator('[role=toolbar]').count()==0)
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
