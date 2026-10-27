# Canvas slide editor (16:9 stage, palette, drag/resize, properties, layers, undo, filmstrip), canvas renderer, teal scope, lecture metadata, drag-and-drop page reorder.
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
srv=socketserver.TCPServer(('127.0.0.1',5230),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5230/'; errors=[]; results=[]
def ok(n,c,x=''): results.append((n,bool(c),x)); print(('PASS' if c else 'FAIL'),n,x)
ME={'id':'t-1','full_name':'Бағдәулет Е.','role':'teacher','school_id':'sc','class_id':None}
def jwt(sub):
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':sub,'role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
SESSION=json.dumps({'access_token':jwt('t-1'),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'t-1','aud':'authenticated','email':'u@x.kz','app_metadata':{},'user_metadata':{},'created_at':'2020-01-01T00:00:00Z'}})


LESSON={'id':'l-c','title':'Кенеп сынағы','subject':'Информатика','terms':[],'plan':{'kind':'keep-me'},'slides':[{'type':'content','title':'Кіріспе','bullets':['бір','екі']},{'type':'canvas','title':'Кенеп беті','bg':'#FFFFFF','blocks':[{'id':'a1','kind':'text','x':60,'y':40,'w':500,'h':80,'text':'Сәлем кенеп','size':40,'bold':True},{'id':'a2','kind':'text','x':60,'y':200,'w':400,'h':60,'text':'Жауап: ||42||','size':30},{'id':'a3','kind':'text','x':60,'y':320,'w':400,'h':60,'text':'ЖАСЫРЫН СӨЗ','size':30,'hide':True},{'id':'a4','kind':'shape','x':600,'y':200,'w':200,'h':200,'shape':'ellipse','fill':'#2F6F65'}]},{'type':'quiz','title':'Тест','prompt':'Сұрақ?','options':['1','2'],'answer':0,'points':1}]}
import base64 as b64
SCHOOL='sc'; UP=[]; SAVED=[]; DLG=[]; YES=[True]
PNG=b64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAQklEQVR4nO3PMQ0AIADAMEAI/qUgCxEcDcmqYJtn7/GzpQNeNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgXZzXAUT9rEu1AAAAAElFTkSuQmCC')
DATA='data:image/svg+xml;utf8,'+"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><rect width='40' height='20' fill='red'/></svg>"
def stub(r):
    q=r.request; u=urlparse(q.url); name=u.path.split('/')[-1]
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'}
    def out(d,status=200): r.fulfill(status=status,content_type='application/json',headers=h,body=json.dumps(d))
    if q.method=='OPTIONS': return r.fulfill(status=204,headers=h)
    one='pgrst.object' in (q.headers.get('accept') or '')
    pick=lambda rows: (out(rows[0] if rows else None) if one else out(rows))
    if '/storage/v1/object/' in u.path and q.method=='POST': UP.append((u.path,q.headers.get('content-type'),len(q.post_data_buffer or b''))); return out({'Key':'cf-media/x'})
    if name=='profiles': return out(ME)
    if name=='cf_lessons' and q.method=='GET' and 'eq.bad' in q.url: return out({'code':'22P02','message':'invalid input syntax for type uuid: "bad"'},400)
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

    E=page(); E.goto(B+'#edit/l-c'); PL='ol[aria-label="Дәріс беттері"]'; E.wait_for_selector(PL+' li')
    def rail(n):
        b_=E.locator(DG+f' nav[aria-label="Құралдар"] button:has-text("{n}")')
        if b_.get_attribute('aria-pressed')!='true': b_.click()
    jraw=lambda: json.loads(E.evaluate("document.querySelector('textarea[aria-label=\"Слайдтар JSON\"]').value"))
    DG='[role=dialog][aria-labelledby="ce-h"]'; BLK=DG+' [role=group][tabindex="0"]'
    ok('C1 teal is the editor root only', E.evaluate("document.querySelector('[data-theme=teal]')!==null && getComputedStyle(document.querySelector('[data-theme=teal]')).getPropertyValue('--color-accent').trim()==='#2F6F65'"))
    ok('C2 the page card for a canvas page reads as Слайд and the blocks card lists its text boxes', 'Слайд' in E.locator(PL+' li >> nth=1').inner_text() and E.locator('section[aria-label="Таңдалған бет ішіндегі блоктар"]').count()==1)
    E.locator(PL+' li >> nth=1 >> button >> nth=0').click(); E.click('button:has-text("Слайд редакторын ашу")'); E.wait_for_selector(DG)
    ok('C3 the stage sits in the middle of the work area, not glued to the top', E.locator(DG+' [style*="container-type"]').first.evaluate('e=>e.getBoundingClientRect().y-e.parentElement.parentElement.getBoundingClientRect().y')>60)
    ok('C3 the editor opens full screen with palette, stage, properties tabs, layers and the page strip', E.locator(DG+' aside[aria-label="Элементтер"]').count()==1 and E.locator(DG+' [role=tab]').count()==3 and E.locator(DG+' nav[aria-label="Беттер лентасы"] button').count()==4 and E.locator(BLK).count()==4)
    rail('Қабаттар'); ok('C3 the Қабаттар rail item lists the four layers', E.locator(DG+' section[aria-label="Қабаттар"] li').count()==4); rail('Элементтер')
    ok('C3 not-yet-built elements are shown but disabled', all(E.locator(DG+f' button[aria-label="{n} (жақында)"]').is_disabled() for n in ['Видео','Кесте','Формула','Интерактив']))
    st=E.locator(DG+' [style*="container-type"]').first; sb_=st.bounding_box(); zoom=sb_['width']/960
    ok('C4 the stage is 16:9', abs(sb_['width']/sb_['height']-16/9)<0.02, str(sb_))
    ok('C4 zoom shows a percentage', '%' in E.locator(DG+' [aria-live=polite]:has-text("%")').first.inner_text())
    E.locator(DG+' input[type=range]').fill('100'); ok('C4 the zoom slider sets the scale', E.locator(DG+' [aria-live=polite]:has-text("%")').first.inner_text()=='100%'); E.click(DG+' button:has-text("Сыйғызу")'); sb_=st.bounding_box(); zoom=sb_['width']/960
    ok('C4 nothing selected: the tool bar says what to do', 'Элементті таңдаңыз' in E.locator(DG+' [role=toolbar][aria-label="Элемент құралдары"]').inner_text())
    b1=E.locator(BLK).nth(0); bb=b1.bounding_box(); b1.click(); E.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2); E.mouse.down(); E.mouse.move(bb['x']+bb['width']/2+zoom*100,bb['y']+bb['height']/2+zoom*50,steps=6); E.mouse.up()
    d=jraw()[1]['blocks'][0]; ok('C5 dragging moves a block (snapped to 10): x 60→160, y 40→90', d['x']==160 and d['y']==90, str(d))
    E.locator(DG+' button:has-text("Болдырмау")').click(); d=jraw()[1]['blocks'][0]; ok('C5 Болдырмау undoes the whole drag in one step', d['x']==60 and d['y']==40, str(d))
    b1=E.locator(BLK).nth(0); b1.click(); bb=b1.bounding_box(); hx=bb['x']+bb['width']; hy=bb['y']+bb['height']; E.mouse.move(hx,hy); E.mouse.down(); E.mouse.move(hx+zoom*100,hy+zoom*40,steps=6); E.mouse.up()
    d=jraw()[1]['blocks'][0]; ok('C6 the corner handle resizes (w 500→600, h 80→120), position stays', d['w']==600 and d['h']==120 and d['x']==60, str(d))
    E.locator(BLK).nth(0).focus(); E.keyboard.press('ArrowRight'); E.keyboard.press('Shift+ArrowDown'); d=jraw()[1]['blocks'][0]
    ok('C7 keyboard: arrows move by 1, Shift by 10', d['x']==61 and d['y']==50, str(d))
    E.fill(DG+' label:has-text("X") input','100'); d=jraw()[1]['blocks'][0]; ok('C8 the number fields in Дизайн write x', d['x']==100)
    E.click(DG+' button[aria-label="Мәтін түсі: Қызыл"]'); E.click(DG+' button[aria-label="Қалың"]'); E.click(DG+' button[aria-label="Қаріпті үлкейту"]'); E.click(DG+' button[aria-label="Ортаға"]'); d=jraw()[1]['blocks'][0]
    ok('C9 colour swatch + floating toolbar (bold off, size +2, centre) write into the block', d['color']=='#B42318' and not d.get('bold') and d['size']==42 and d['align']=='center', str(d))
    E.click(DG+' button[aria-label="Мәтін түсі: Ақ"]'); ok('C9b white text on a white slide shows a contrast warning', E.locator(DG+' [role=note]').count()==1 and 'нашар' in E.locator(DG+' [role=note]').inner_text())
    E.click(DG+' button[aria-label="Мәтін түсі: Қара"]'); ok('C9b …and it goes with a readable colour', E.locator(DG+' [role=note]').count()==0)
    E.click(DG+' [role=tab]:has-text("Мазмұн")'); E.fill(DG+' textarea >> nth=0','Жаңа ат'); d=jraw()[1]['blocks'][0]; ok('C10 Мазмұн edits the text', d['text']=='Жаңа ат')
    E.click(DG+' button:has-text("Мәтін") >> nth=0'); ok('C11 palette Мәтін adds a text block and selects it', len(jraw()[1]['blocks'])==5 and jraw()[1]['blocks'][-1]['kind']=='text')
    E.click(DG+' button:text-is("Код")'); E.click(DG+' button:text-is("Фигура")'); E.click(DG+' button:text-is("Сурет")'); bl=jraw()[1]['blocks']
    ok('C11 Код / Фигура / Сурет add their blocks', [x['kind'] for x in bl[-3:]]==['code','shape','image'] and (rail('Қабаттар'), E.locator(DG+' section[aria-label="Қабаттар"] li').count()==8)[1])
    rail('Элементтер')
    E.fill(DG+' label:has-text("сілтеме") input','http://bad.example/x.png'); ok('C12 a picture link must be https', E.locator(DG+' [role=alert]').count()==1)
    E.fill(DG+' label:has-text("сілтеме") input','https://example.com/p.png'); E.fill(DG+' label:has-text("Сурет сипаттамасы") input','Үлгі сурет'); bl=jraw()[1]['blocks']; ok('C12 …a good link and alt text are saved', bl[-1]['src']=='https://example.com/p.png' and bl[-1]['alt']=='Үлгі сурет' and E.locator(DG+' [role=alert]').count()==0)
    E.click(DG+' button[aria-label="Артқа жіберу"]'); bl=jraw()[1]['blocks']; ok('C13 Артқа жіберу moves the block down one layer', bl[-2]['kind']=='image' and bl[-1]['kind']=='shape')
    E.click(DG+' button[aria-label="Көшіру"]'); ok('C13 Көшіру duplicates', len(jraw()[1]['blocks'])==9)
    E.click(DG+' button[aria-label="Өшіру"]'); ok('C13 Өшіру removes the selected block', len(jraw()[1]['blocks'])==8, str(len(jraw()[1]['blocks'])))
    DLG.clear(); rail('Үлгілер'); E.click(DG+' button:text-is("Екі баған")'); bl=jraw()[1]['blocks']; ok('C14 quick template asks first, then replaces the blocks', DLG and 'ауыстырылады' in DLG[0] and len(bl)==3 and all(x['kind']=='text' for x in bl))
    E.click(DG+' button:has-text("Болдырмау")'); ok('C14 …and Болдырмау brings the old blocks back', len(jraw()[1]['blocks'])==8, str(len(jraw()[1]['blocks'])))
    E.click(DG+' [role=tab]:has-text("Әрекет")'); E.locator(BLK).nth(1).focus(); ok('C15 Әрекет has the hidden-until-opened switch', E.locator(DG+' input[type=checkbox]').count()==1)
    E.locator(BLK).nth(0).focus(); E.keyboard.press('Delete'); ok('C16 Delete removes the focused block', len(jraw()[1]['blocks'])==7)
    E.mouse.click(sb_['x']+5,sb_['y']+sb_['height']-5)
    rail('Фон'); E.click(DG+' button[aria-label="Фон: Қою"]'); ok('C17 slide background swatches (nothing selected)', jraw()[1]['bg']=='#0F172A')
    if os.environ.get('SHOTS'): E.screenshot(path=os.environ['SHOTS']+'/canvas.png')
    axe(E,'canvas editor','document.querySelector(\'[role=dialog][aria-labelledby="ce-h"]\')')
    SP=DG+' nav[aria-label="Беттер лентасы"] button'
    E.locator(SP).nth(2).click(); E.wait_for_timeout(200)
    ok('C18 a quiz page opens in the same editor: its preview in the middle, its fields on the right', E.locator(DG).count()==1 and E.locator(DG+' [role=region][aria-label="Беттің көрінісі"]').count()==1 and E.locator(DG+' section[aria-label="Бет мазмұны"] textarea').count()>=1)
    E.fill(DG+' section[aria-label="Бет мазмұны"] textarea >> nth=0','Жаңа сұрақ?'); ok('C18 editing a field there writes into the slide', jraw()[2]['prompt']=='Жаңа сұрақ?')
    ok('C18 a quiz page cannot be turned into a canvas', E.locator(DG+' button:has-text("Кенепке айналдыру")').count()==0)
    if os.environ.get('SHOTS'): E.screenshot(path=os.environ['SHOTS']+'/canvas_quiz.png')
    axe(E,'editor on a quiz page','document.querySelector(\'[role=dialog][aria-labelledby="ce-h"]\')')
    E.locator(SP).nth(0).click(); DLG.clear(); E.click(DG+' button:has-text("Кенепке айналдыру")'); d=jraw()[0]
    ok('C18b a content page turns into a canvas page and its text carries over', DLG and 'кенепке айналады' in DLG[0] and d['type']=='canvas' and d['title']=='Кіріспе' and any('• бір' in (b.get('text') or '') for b in d['blocks']), str(d)[:200])
    E.click(DG+' button:has-text("Болдырмау")'); ok('C18b Болдырмау turns it back into the content page', jraw()[0]['type']=='content')
    E.keyboard.press('Escape'); ok('C18 Escape closes it and tells to save', E.locator(DG).count()==0 and 'Сақтау' in E.locator('aside[aria-label="Құрастыру көмегі"] [role=status]').inner_text())
    E.click('button:has-text("Жаңа бет")'); E.click('[role=dialog] button:text-is("Бос кенеп")'); E.click('[role=dialog] button:text-is("Бет жасау")'); E.wait_for_selector(DG)
    d=jraw()[-1]; ok('C19 new Бос кенеп page: canvas, pageType slide, template saved, editor opens at once', d['type']=='canvas' and d['pageType']=='slide' and d['templateId']=='canvas-blank' and d['blocks']==[])
    rail('Үлгілер'); E.click(DG+' button:text-is("Титул беті")'); ok('C19 empty page takes a quick template without asking', len(jraw()[-1]['blocks'])==2)
    PK='[role=dialog][aria-labelledby="pp-h"]'; n0=len(jraw())
    E.fill(DG+' input[aria-label="Дәріс атауы"]','Редактордағы ат'); ok('C19b the lecture title is editable inside the editor', E.evaluate("document.querySelector('input[placeholder=\"Сабақ тақырыбы\"]').value")=='Редактордағы ат')
    SV=len(SAVED); E.click(DG+' button:text-is("Сақтау")'); E.wait_for_timeout(400)
    ok('C19b Сақтау inside the editor saves and stays in it', len(SAVED)==SV+1 and SAVED[-1]['title']=='Редактордағы ат' and E.locator(DG).count()==1 and 'Сақталды' in E.locator(DG+' header [role=status]').inner_text())
    E.click(DG+' nav[aria-label="Беттер лентасы"] button:has-text("Бет қосу")'); E.click(PK+' button:text-is("Бос кенеп")'); E.click(PK+' button:text-is("Бет жасау")'); E.wait_for_timeout(300)
    ok('C19c Бет қосу in the strip opens the picker; the new canvas page opens in the same editor', len(jraw())==n0+1 and E.locator(DG).count()==1 and E.locator(DG+f' nav[aria-label="Беттер лентасы"] button[aria-current]').get_attribute('aria-label').startswith(f'{n0+1}-бет'))
    t0=[x.get('title') for x in jraw()]; E.locator(DG+' nav[aria-label="Беттер лентасы"] button >> nth=0').drag_to(E.locator(DG+' nav[aria-label="Беттер лентасы"] button >> nth=1')); t1=[x.get('title') for x in jraw()]
    ok('C19d dragging a thumbnail in the strip reorders the pages and the editor stays on its page', t1[:2]==[t0[1],t0[0]] and E.locator(DG).count()==1, str(t1))
    E.click(DG+' button:has-text("Конструкторға")')
    # metadata, status, drag and drop
    E.fill('input[placeholder="Сабақ тақырыбы"]','Кенеп сынағы'); E.select_option('section[aria-label="Негізгі ақпарат"] select >> nth=0','7'); E.fill('section[aria-label="Негізгі ақпарат"] input[type=number]','40'); E.fill('section[aria-label="Негізгі ақпарат"] textarea','Қысқа мақсат'); E.select_option('section[aria-label="Негізгі ақпарат"] select >> nth=1','Тексеруде')
    ok('C20 the status chip in the header follows the status select', 'Тексеруде' in E.locator('h1 + span').inner_text())
    before=[x.get('title') for x in jraw()]; E.locator(PL+' li >> nth=0').drag_to(E.locator(PL+' li >> nth=2')); after=[x.get('title') for x in jraw()]
    ok('C21 dragging a page card onto another reorders (page 1 → place 3)', after==[before[1],before[2],before[0]]+before[3:], str(after))
    E.click('button:has-text("Сақтау") >> nth=0'); E.wait_for_timeout(500); sv=SAVED[-1]
    ok('C22 save keeps canvas blocks and puts grade/duration/summary/status into plan.meta, leaving other plan keys alone', sv['plan']['kind']=='keep-me' and sv['plan']['meta']=={'grade':'7','duration':40,'summary':'Қысқа мақсат','status':'Тексеруде'} and any(x['type']=='canvas' and x.get('blocks') for x in sv['slides']), str(sv['plan']))
    # runtime
    P=page(); P.goto(B+'#preview/l-c'); P.wait_for_selector('select[aria-label="Слайдқа өту"]'); P.select_option('select[aria-label="Слайдқа өту"]',index=1); P.wait_for_selector('text=Сәлем кенеп')
    ok('C23 preview draws the canvas slide (the title is a screen-reader heading)', P.locator('text=Сәлем кенеп').count()>=1 and P.locator('h2.sr-only:text-is("Кенеп беті")').count()==1)
    ok('C24 a hidden block shows a cover and a ||hidden|| word shows dots until opened', P.locator('text=ЖАСЫРЫН СӨЗ').count()==0 and P.locator('button[aria-label="Жасырын элемент, көрсету үшін бас"]').count()==1 and P.locator('button[aria-label="Жасырын мәтін, көрсету үшін бас"]').count()==1)
    P.click('button[aria-label="Жасырын элемент, көрсету үшін бас"]'); ok('C24 …and the cover opens on click', P.locator('text=ЖАСЫРЫН СӨЗ').count()==1)
    M=page((390,800)); M.goto(B+'#edit/l-c'); M.wait_for_selector(PL+' li'); M.locator(PL+' li >> nth=1 >> button >> nth=0').click(); M.click('button:has-text("Слайд редакторын ашу")'); M.wait_for_selector(DG)
    ok('C25 390px: the editor stage fits the screen', M.evaluate("document.querySelector('[role=dialog] [style*=container-type]').getBoundingClientRect().right<=window.innerWidth+1"))
    if os.environ.get('SHOTS'):
        M.screenshot(path=os.environ['SHOTS']+'/canvas_phone.png')
        T_=page((820,1000)); T_.goto(B+'#edit/l-c'); T_.wait_for_selector(PL+' li'); T_.locator(PL+' li >> nth=1 >> button >> nth=0').click(); T_.click('button:has-text("Слайд редакторын ашу")'); T_.wait_for_selector(DG); T_.screenshot(path=os.environ['SHOTS']+'/canvas_tablet.png')
    G=page(); G.goto(B+'#lessons/modules'); G.wait_for_timeout(500); ok('C26 other screens are not teal', G.evaluate("document.querySelector('[data-theme=teal]')===null"))
    L=page(); L.goto(B+'#edit/bad'); L.wait_for_selector('main [role=alert]')
    ok('C27 a lecture that fails to load shows the reason and blocks Сақтау (no empty overwrite)', 'uuid' in L.locator('main [role=alert]').first.inner_text() and all(L.locator('button:has-text("Сақтау")').nth(i).is_disabled() for i in range(L.locator('button:has-text("Сақтау")').count())))
    L.evaluate("location.hash='#edit/new'"); L.wait_for_timeout(500)
    ok('C27 …and the error does not follow to #edit/new', L.locator('main [role=alert]').count()==0 and L.locator('button:has-text("Сақтау") >> nth=0').is_enabled())
    D=page(); D.goto(B+'?demo=teacher#edit/l1'); D.wait_for_selector('input[placeholder="Сабақ тақырыбы"]'); D.wait_for_timeout(300)
    ok('C28 demo: an existing demo id opens a sample lecture, not a database error', D.locator('input[placeholder="Сабақ тақырыбы"]').input_value()=='Демо дәріс' and D.locator('main [role=alert]').count()==0)
    D.fill('input[placeholder="Сабақ тақырыбы"]','Менің демо'); D.click('button:has-text("Сақтау") >> nth=0'); D.wait_for_timeout(300)
    D.goto(B+'?demo=teacher#edit/l1'); D.wait_for_selector('input[placeholder="Сабақ тақырыбы"]'); D.wait_for_timeout(300)
    ok('C28 demo: save then reopen gives the saved lecture back (browser storage)', D.locator('input[placeholder="Сабақ тақырыбы"]').input_value()=='Менің демо')
    b.close()
bad=[r for r in results if not r[1]]
ok('no console errors', not errors, str(errors[:3]))
print(f'\n{len(results)-len([r for r in results if not r[1]])}/{len(results)} passed'); sys.exit(1 if [r for r in results if not r[1]] else 0)
