# Lecture constructor: tabs, main info, page cards, full-screen page picker, block fields instead of raw JSON, help panel (type change, undo, checks), save keeps pageType + templateId.
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
srv=socketserver.TCPServer(('127.0.0.1',5229),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5229/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})


import base64 as b64
SCHOOL='sc'; UP=[]; SAVED=[]; DLG=[]; YES=[True]
PNG=b64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAQklEQVR4nO3PMQ0AIADAMEAI/qUgCxEcDcmqYJtn7/GzpQNeNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgXZzXAUT9rEu1AAAAAElFTkSuQmCC')
DATA='data:image/svg+xml;utf8,'+"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><rect width='40' height='20' fill='red'/></svg>"
LESSON={'id':'l-9','title':'Сурет сынағы','subject':'Информатика','terms':[],'slides':[{'type':'title','title':'Кіріспе','subtitle':'сурет'},{'type':'content','title':'Пернетақта','bullets':['qwerty'],'img':DATA,'alt':'Қызыл тіктөртбұрыш'},{'type':'content','title':'Қауіпті','bullets':['x'],'img':'javascript:alert(1)'},{'type':'quiz','title':'Тест','prompt':'2+2?','options':['3','4'],'answer':1,'points':2},{'type':'quiz','title':'Жауапсыз','prompt':'?','options':['a','b']},{'type':'leaderboard','title':'Нәтиже'}]}
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/storage/v1/object/' in u.path and q.method=='POST': UP.append((u.path,q.headers.get('content-type'),len(q.post_data_buffer or b''))); return out({'Key':'cf-media/x'})
    if name=='profiles': return out(ME)
    if name=='cf_lessons':
        if q.method in ('POST','PATCH'): SAVED.append(json.loads(q.post_data or '{}')); return out([])
        return pick([LESSON])
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
        pg=c.new_page(); pg.on('dialog',lambda d: (DLG.append(d.message), d.accept() if YES[0] else d.dismiss())); pg.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text and 'status of 4' not in m.text and 'WebSocket' not in m.text and 'Refused to' not in m.text else None); pg.on('pageerror',lambda e: errors.append(str(e))); return pg
    E=page(); E.goto(B+'#edit/l-9'); PL='ol[aria-label="Дәріс беттері"]'; E.wait_for_selector(PL+' li')
    n=len(LESSON['slides']); li=lambda i: E.locator(PL+f' li >> nth={i-1}')
    def js():
        if not E.locator('details[open]').count(): E.click('details > summary')
        return json.loads(E.locator('textarea[aria-label="Слайдтар JSON"]').input_value())
    ok('P1 constructor: two tabs, main info, page cards, help panel; the raw JSON is folded away', E.locator('[role=tab]').count()==2 and E.locator('[role=tab][aria-selected=true]').inner_text()=='Қолмен жасау' and E.locator('h2:text-is("Дәріс конструкторы")').count()==1 and E.locator('section[aria-label="Негізгі ақпарат"] input').count()==3 and E.locator(PL+' li').count()==n and E.locator('aside[aria-label="Құрастыру көмегі"] section').count()==3 and E.locator('details[open]').count()==0)
    ok('P2 old slides read as a type: cards show chip + template + block count', 'Слайд' in li(1).inner_text() and 'Титул' in li(1).inner_text() and 'Түсіндіру' in li(2).inner_text() and 'Интерактив' in li(4).inner_text() and 'блок' in li(2).inner_text(), li(2).inner_text())
    ok('P2 the first page is the active one: blocks card shows its fields', E.locator('section[aria-label="Таңдалған бет ішіндегі блоктар"] input').count()==2 and E.locator('section[aria-label="Белсенді бет"]').count()==1)
    E.click('button:has-text("Жаңа бет")'); G='[role=dialog][aria-label],[role=dialog]'
    ok('P3 the picker is full screen: slide templates first, a live preview', E.locator('[role=dialog] button:text-is("Титул")').count()==1 and E.locator('[role=dialog] button:has-text("Бір жауап")').count()==0 and E.locator('[role=dialog] [role=img]').count()==1 and E.locator('[role=dialog] [role=img]').inner_text().strip()!='')
    E.click('[role=dialog] button:has-text("Ұзын бет")'); ok('P3 picking Ұзын бет swaps to its own templates and shows the section count', E.locator('[role=dialog] button:text-is("Қадамдық мысал")').count()==1 and E.locator('[role=dialog] button:text-is("Титул")').count()==0)
    E.click('[role=dialog] button:text-is("Қадамдық мысал")'); ok('P3 …the preview follows the template', 'Алгоритм' in E.locator('[role=dialog] [role=img]').inner_text() and 'Ұзындық: 3 секция' in E.locator('[role=dialog]').inner_text())
    E.keyboard.press('Escape'); ok('P3 Escape closes the picker and adds nothing', E.locator('[role=dialog]').count()==0 and E.locator(PL+' li').count()==n)
    E.click('button:has-text("Жаңа бет")'); E.click('[role=dialog] button:has-text("Ұзын бет")'); E.click('[role=dialog] button:text-is("Қадамдық мысал")'); E.fill('[role=dialog] input','Қосындыны табу'); E.click('[role=dialog] button:text-is("Осы үлгіні қолдану")')
    d=js(); ok('P4 the new page is appended (scroll / worked-example, stacked sections) and becomes active', len(d)==n+1 and d[-1]['pageType']=='scroll' and d[-1]['templateId']=='worked-example' and d[-1]['title']=='Қосындыны табу' and len(d[-1]['sections'])==3 and li(n+1).get_attribute('class').find('border-accent')>=0 or E.locator(PL+f' li >> nth={n} >> button[aria-current=true]').count()==1, str(d[-1])[:140])
    ok('P4 …and the blocks card lists its sections with a Код/Мәтін chip', E.locator('section[aria-label="Таңдалған бет ішіндегі блоктар"] label:has-text("1-бөлім: атауы")').count()==1)
    BS='section[aria-label="Таңдалған бет ішіндегі блоктар"]'
    E.click(BS+' button:has-text("Бөлім қосу")'); d=js(); ok('P4b scroll page: Бөлім қосу appends a section, the blocks card groups fields per section', len(d[-1]['sections'])==4 and d[-1]['sections'][3]['h']=='Жаңа бөлім' and E.locator(BS+' [role=group][aria-label="4-бөлім"]').count()==1)
    E.click(BS+' button[aria-label="4-бөлімді жоғары жылжыту"]'); d=js(); ok('P4b a section moves up', d[-1]['sections'][2]['h']=='Жаңа бөлім' and d[-1]['sections'][3]['h']=='Шешімі')
    YES[0]=True; E.click(BS+' button[aria-label="3-бөлімді өшіру"]'); d=js(); ok('P4b a section is deleted after asking', len(d[-1]['sections'])==3 and all(x['h']!='Жаңа бөлім' for x in d[-1]['sections']))
    E.click('button:has-text("Жаңа бет")'); E.click('[role=dialog] button:has-text("Интерактивті бет")'); E.click('[role=dialog] button:text-is("Қысқа жауап")'); E.click('[role=dialog] button:text-is("Бет жасау")')
    d=js(); ok('P5 an interactive template makes a playable slide (task with accept), named after the template', d[-1]['type']=='task' and d[-1]['pageType']=='interactive' and d[-1]['templateId']=='short-answer' and d[-1]['title']=='Қысқа жауап' and d[-1]['accept'], str(d[-1])[:140])
    li(2).locator('button[aria-current], button').first.click(); BL='section[aria-label="Таңдалған бет ішіндегі блоктар"]'
    E.fill(BL+' input >> nth=0','Пернетақта 2'); E.fill(BL+' textarea >> nth=0','бірінші\nекінші'); d=js()
    ok('P6 editing a field writes into the slide: title and one-per-line bullets', d[1]['title']=='Пернетақта 2' and d[1]['bullets']==['бірінші','екінші'] and 'img' in d[1], str(d[1])[:140])
    li(4).locator('button').first.click(); E.select_option(BL+' select',index=2); E.fill(BL+' input[type=number]','7'); d=js()
    ok('P6 a quiz: the correct-answer list and points write back', d[3]['answer']==1 and d[3]['points']==7 and d[3]['options']==['3','4'])
    li(5).locator('button').first.click(); S_=E.locator('section[aria-label="Тексеру"]').inner_text(); ok('P6 checks panel names the quiz without a correct answer', '5-бет: дұрыс жауап таңдалмаған' in S_ and 'интерактивті бет' in S_, S_)
    E.select_option(BL+' select',index=1); ok('P6 …and the warning goes once it is fixed', '5-бет' not in E.locator('section[aria-label="Тексеру"]').inner_text())
    li(2).locator('button').first.click(); E.click('button:has-text("Бет түрін өзгерту")'); AS='aside[aria-label="Құрастыру көмегі"]'
    before=json.dumps(js()[1]); E.select_option(AS+' select[aria-label="2-бет: үлгісі"]','summary'); d=js()
    ok('P7 changing the template does not change the type', d[1]['templateId']=='summary' and d[1]['pageType']=='slide' and d[1]['type']=='content')
    E.select_option(AS+' select[aria-label="2-бет: типі"]','scroll'); d=js(); ok('P7 changing the type asked first, keeps the text, resets the template', 'өзгерту кейбір' in DLG[-1] and d[1]['pageType']=='scroll' and d[1]['templateId']=='' and d[1]['bullets']==['бірінші','екінші'])
    E.click(AS+' button:has-text("Қайтару")'); d=js(); ok('P7 Қайтару brings the previous draft back', d[1]['pageType']=='slide' and d[1]['templateId']=='summary')
    cnt=E.locator(PL+' li').count(); E.click(PL+' button[aria-label="2-бетті көшіру"]'); ok('P8 copy inserts a duplicate right after and selects it', E.locator(PL+' li').count()==cnt+1 and js()[2]['title']==js()[1]['title'])
    E.click(PL+' button[aria-label="3-бетті жоғары жылжыту"]'); ok('P8 up/down reorder; first Up and last Down are off', E.locator(PL+' button[aria-label="1-бетті жоғары жылжыту"]').is_disabled() and E.locator(PL+f' button[aria-label="{cnt+1}-бетті төмен жылжыту"]').is_disabled())
    YES[0]=False; DLG.clear(); E.click(PL+' button[aria-label="2-бетті өшіру"]'); ok('P9 delete asks first; "no" keeps the page', DLG and 'өшіру керек пе' in DLG[0] and E.locator(PL+' li').count()==cnt+1)
    YES[0]=True; E.click(PL+' button[aria-label="2-бетті өшіру"]'); ok('P9 …and "yes" removes it', E.locator(PL+' li').count()==cnt)
    if os.environ.get('SHOTS'): E.evaluate('window.scrollTo(0,0)'); E.screenshot(path=os.environ['SHOTS']+'/constructor.png')
    axe(E,'constructor','document')
    E.click('button:has-text("Сақтау") >> nth=0'); E.wait_for_timeout(500)
    sv=SAVED[-1]['slides'] if SAVED else []
    ok('P10 save sends pageType and templateId; untouched old slides stay as they were', len(sv)==cnt and sv[-1]['pageType']=='interactive' and sv[-2]['templateId']=='worked-example' and 'pageType' not in sv[0], str([x.get('pageType') for x in sv]))
    E.goto(B+'#edit/l-9'); E.wait_for_selector(PL+' li'); E.click('button:has-text("Жаңа бет")'); E.wait_for_selector('[role=dialog]'); axe(E,'page picker','document.querySelector("[role=dialog]")')
    if os.environ.get('SHOTS'): E.screenshot(path=os.environ['SHOTS']+'/picker.png')
    E.keyboard.press('Escape')
    E.click('details > summary'); E.fill('textarea[aria-label="Слайдтар JSON"]','{ oops'); ok('P11 broken JSON: the page list says so and cannot add', E.locator('section[aria-label="Беттер"] [role=alert]').count()==1 and E.locator('button:has-text("Жаңа бет")').is_disabled())
    T=E.locator('[role=tab]:has-text("ЖИ арқылы жасау")'); T.click(); ok('P12 the ЖИ tab shows the assistant instead of the page cards', E.locator('text=ЖИ көмекші').count()>=1 and E.locator('section[aria-label="Беттер"]').count()==0)
    M=page((390,800)); M.goto(B+'#edit/l-9'); M.wait_for_selector(PL+' li'); ok('P13 390px: no sideways scroll', M.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), str(M.evaluate("document.documentElement.scrollWidth")))
    M.click('button:has-text("Жаңа бет")'); ok('P13 390px: the picker fits too', M.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1") and M.locator('[role=dialog] button:text-is("Бет жасау")').is_visible())
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
