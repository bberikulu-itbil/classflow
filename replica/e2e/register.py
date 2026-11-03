# Sign-up on the ClassFlow login page (KeyToLife's admin-users function) and the "not approved yet" message. Fake Supabase; needs `npx vite build` first.
import json, os, threading, http.server, socketserver, re, base64
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..')); DIST=os.path.join(ROOT,'dist')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def log_message(s,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',5231),H); threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:5231/'; res=[]; calls=[]; STATE={'status':'pending'}
def ok(n,c,x=''): res.append(bool(c)); print('PASS' if c else 'FAIL',n,x)
def jwt():
    e=lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
    return e({'alg':'HS256','typ':'JWT'})+'.'+e({'sub':'u-1','role':'authenticated','aud':'authenticated','exp':4102444800})+'.x'
H_={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
def route(r):
    q=r.request; u=q.url
    if not u.startswith('http://127.0.0.1'):
        if q.method=='OPTIONS': return r.fulfill(status=204,headers=H_)
        def out(d,s=200): r.fulfill(status=s,content_type='application/json',headers=H_,body=json.dumps(d))
        if '/functions/v1/admin-users' in u:
            b=json.loads(q.post_data or '{}'); calls.append(b)
            if b['action']=='schools': return out({'schools':[{'id':'sc-1','name':'Лицей'}],'classes':[{'id':'c-1','name':'8A','school_id':'sc-1'},{'id':'c-2','name':'8B','school_id':'sc-1'}]})
            if b['action']=='register': return out({'ok':True})
        if '/auth/v1/token' in u: return out({'access_token':jwt(),'token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':{'id':'u-1','aud':'authenticated','email':'x@y.kz'}})
        if '/auth/v1/logout' in u: return r.fulfill(status=204,headers=H_)
        if '/rest/v1/profiles' in u: return out(None) if 'pgrst.object' in (q.headers.get('accept') or '') else out([])
        if '/rest/v1/registrations' in u: return out({'status':STATE['status'],'note':'Сыныпты қате таңдадың'})
        return out([])
    r.continue_()
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':420,'height':800}); c.route('**/*',route); pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_selector('[data-testid=to-register]'); pg.click('[data-testid=to-register]')
    pg.wait_for_selector('[data-testid=school] option:nth-child(2)',state='attached')
    ok('R1 school list is loaded from the function', calls and calls[0]['action']=='schools')
    pg.click('[data-testid=register]'); ok('R2 empty form is refused', 'ЖСН' in pg.inner_text('[data-testid=login-error]'))
    pg.fill('input[placeholder="Аты-жөні"]','Тест Оқушы'); pg.fill('input[placeholder^="ЖСН"]','12345678901a2345'); pg.fill('input[type=password]','abcdef')
    ok('R3 ЖСН takes digits only', pg.input_value('input[placeholder^="ЖСН"]').isdigit())
    pg.fill('input[placeholder^="ЖСН"]','123456789012')
    pg.select_option('[data-testid=school]','sc-1'); pg.select_option('[data-testid=class]','c-2')
    pg.click('[data-testid=register]'); pg.wait_for_selector('[data-testid=login-info]')
    reg=[x for x in calls if x['action']=='register'][0]
    ok('R4 request carries role, ЖСН, class', reg['role']=='student' and reg['iin']=='123456789012' and reg['class_id']=='c-2' and reg['school_id']=='sc-1' and reg['full_name']=='Тест Оқушы', reg)
    ok('R5 back on the login form with the ЖСН filled and the confirm note', pg.input_value('input[placeholder="Логин (ЖСН)"]')=='123456789012' and 'KeyToLife' in pg.inner_text('[data-testid=login-info]'))
    pg.fill('input[type=password]','abcdef'); pg.press('input[type=password]','Enter'); pg.wait_for_selector('[data-testid=login-error]')
    ok('R6 not approved yet: waiting message, still on the login page', 'әлі қаралған жоқ' in pg.inner_text('[data-testid=login-error]'))
    STATE['status']='rejected'; pg.press('input[type=password]','Enter'); pg.wait_for_timeout(500)
    ok('R7 rejected: shows the approver note', 'қабылданбады' in pg.inner_text('[data-testid=login-error]') and 'қате таңдадың' in pg.inner_text('[data-testid=login-error]'))
    pg.click('[data-testid=to-register]'); pg.click('[data-testid=role-teacher]')
    ok('R8 teacher form has no class, asks for a title', pg.locator('[data-testid=class]').count()==0 and pg.locator('input[placeholder^="Қызметі"]').count()==1)
    errs=[e for e in errs if 'tailwind' not in e]  # the CDN script is not served in this harness
    ok('R9 no page errors', not errs, errs)
    b.close()
print(sum(res),'/',len(res),'passed'); raise SystemExit(0 if all(res) else 1)
