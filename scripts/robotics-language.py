"""Align supplied Russian PDF text with editable OOXML text boxes by geometry."""
import json, math
from pathlib import Path
root=Path('/tmp/classflow-reference')
pages=json.loads((root/'kk-canvas.json').read_text())
pdf=json.loads((root/'ru-text.json').read_text())
unmatched=[]
for i,page in enumerate(pages):
    if i==69: continue  # Social Media Challenge is absent from the supplied Russian PDF.
    source=pdf[i if i<69 else i-1]
    sx,sy=960/source['width'],540/source['height']
    boxes=[b for b in page['blocks'] if b['kind']=='text']
    assigned={b['id']:[] for b in boxes}
    for block in source['blocks']:
        for line in block['lines']:
            spans=line['spans']; text=''.join(s['text'] for s in spans)
            if not text.strip(): continue
            x0,y0,x1,y1=line['bbox']; x0*=sx; x1*=sx; y0*=sy; y1*=sy
            cx,cy=(x0+x1)/2,(y0+y1)/2
            def score(b):
                # PDF glyph bounds differ from the OOXML textbox by font ascent.
                dx=max(b['x']-cx,0,cx-(b['x']+b['w']))
                dy=max(b['y']-cy,0,cy-(b['y']+b['h']))
                return dx*3+dy*6+abs(x0-b['x'])*.08+abs(y0-b['y'])*.02
            best=min(boxes,key=score)
            if score(best)>65:
                unmatched.append({'page':i+1,'text':text,'score':score(best)})
                # Additional source text gets its own editable multilingual block.
                best={'id':f'ru-{i}-{len(boxes)}','kind':'text','exact':True,'text':'','variants':{'kk':''},'size':spans[0]['size']*sx,'align':'left','x':x0,'y':y0,'w':x1-x0,'h':y1-y0,'appearance':{}}
                boxes.append(best);page['blocks'].append(best);assigned[best['id']]=[]
            assigned[best['id']].append((line,(x0,y0,x1,y1)))
    for b in boxes:
        lines=assigned[b['id']]
        if not lines:
            # A footer absent from the RU edition is intentionally blank there.
            b['variants']['ru']=''
            continue
        lines.sort(key=lambda v:(round(v[1][1],1),v[1][0]))
        text='\n'.join(''.join(s['text'] for s in l['spans']) for l,box in lines)
        b['variants']['ru']=text
        paragraphs=[]
        for j,(line,box) in enumerate(lines):
            runs=[]
            for s in line['spans']:
                runs.append({'text':s['text'],'size':s['size']*sx,'bold':'Bold' in s['font'],'italic':'Italic' in s['font'],'fontFamily':'Inter','color':'#%06x'%s['color'],'letterSpacing':b.get('appearance',{}).get('letterSpacing',0)})
            height=(lines[j+1][1][1]-box[1]) if j+1<len(lines) else (box[3]-box[1])
            paragraphs.append({'align':'left','lineHeight':box[3]-box[1],'runs':runs,'offsetX':box[0],'offsetY':box[1]})
        x=min(v[1][0] for v in lines);y=min(v[1][1] for v in lines)
        for p in paragraphs: p['offsetX']-=x; p['offsetY']-=y
        b.setdefault('localized',{})['ru']={'x':x,'y':y,'w':max(v[1][2] for v in lines)-x+1,'h':max(v[1][3] for v in lines)-y,'appearance':{'fontFamily':'Inter','padding':[0,0,0,0],'valign':'top','wrap':False,'paragraphs':paragraphs}}
    page['ru']={'title':next((b['variants']['ru'].split('\n')[0] for b in boxes if b['variants'].get('ru') and b['size']>=22),page['title'])}

# This page exists only in Kazakh; translate its editable text explicitly.
smc=pages[69]
for b in smc['blocks']:
    if b['kind']!='text': continue
    t=b['text']
    if 'Қатысушылар' in t:
        ru='Участникам необходимо создать открытый аккаунт в Instagram с названием команды и обозначением категории соревнований, например: @[НазваниеВашейКоманды]_ftc; @[НазваниеВашейКоманды]_fll_explore; @[НазваниеВашейКоманды]_fll_challenge.\n\nПобедители SMC получают квоту на участие в Central Asia FIRST Championship 2027.'
    elif 'жеңімпаздары' in t: ru='Победители SMC получают квоту на участие в Central Asia FIRST Championship 2027.'
    elif 'STEM-біліміндегі' in t: ru=t.replace('STEM-біліміндегі AI','ИИ в STEM-образовании')
    else: ru=t
    b['variants']['ru']=ru
smc['ru']={'title':'Social Media Challenge'}

# Complete the Kazakh fragments left untranslated in the supplied Russian PDF.
translations={
 'R&D және инженерия':'R&D и инженерия','11 өңір:':'11 регионов:','Бағыттар':'Направления','БАҚ біз туралы':'СМИ о нас','АҚШ':'США',
 'FLL халықаралық турнирі':'Международный турнир FLL','FLL Challenge: 4 тең бөлік':'FLL Challenge: 4 равные части',
 'Жоба кезеңдері: идеядан таныстыруға дейін':'Этапы проекта: от идеи до презентации',
 'Идея табу':'Поиск идеи','Ми шабуылы, ұқсас идеялар,\nсарапшылар':'Мозговой штурм, похожие идеи,\nэксперты',
 'Жоспар және\nдизайн':'План и\nдизайн','Басымдықтар, материалдар,\nсызбалар':'Приоритеты, материалы,\nчертежи',
 'Құрастыру, тестілеу, алғашқы\nқателерді түзету':'Сборка, тестирование,\nисправление первых ошибок',
 'Кері байланыс':'Обратная связь','Пікір жинау, сын, бағытты өзгерту':'Сбор отзывов, критика, смена курса',
 'Жетілдіру':'Улучшение','Әлсіз жерлерді жақсарту, болашақ\nөзгерістер':'Устранение слабых мест,\nбудущие изменения',
 'Таныстыру':'Презентация','Артықшылықтар, ерекшеліктер,\nмаркетинг':'Преимущества, особенности,\nмаркетинг',
}
replacements={'STEM-біліміндегі AI':'ИИ в STEM-образовании','Түркістан':'Туркестан','Қызылорда':'Кызылорда','Маңғыстау':'Мангистау','Ақтау':'Актау','Ақтөбе':'Актобе','Қостанай':'Костанай','Қонаев':'Конаев','Ақмола':'Акмола','Көкшетау':'Кокшетау','Қарағанды':'Караганда','Ұлытау':'Улытау','Жезқазған':'Жезказган','Өскемен':'Усть-Каменогорск','Жетісу':'Жетысу','Талдықорған':'Талдыкорган','Петропавл':'Петропавловск','Орал':'Уральск','Бурабай':'Боровое','СҚО':'СКО','ШҚО':'ВКО','БҚО':'ЗКО','жұма':'пятница','сенбі':'суббота','сәрсенбі':'среда','Ақпан':'Февраль','Наурыз':'Март',' облысы':' — область',' қаласы':'',' қ.':'','Ташкент қаласы':'Ташкент'}
for page in pages:
 for b in page['blocks']:
  if b['kind']!='text':continue
  old=b['variants'].get('ru','');new=translations.get(old,old)
  for a,v in replacements.items():new=new.replace(a,v)
  if new!=old:
   b['variants']['ru']=new
   # Keep the original box and typography, but allow the translated text to wrap.
   original=b.get('localized',{}).get('ru',{})
   a={**b.get('appearance',{}), 'paragraphs':None, 'wrap':True, 'padding':[0,0,0,0]}
   b.setdefault('localized',{})['ru']={**original,'w':max(original.get('w',0),b['w']),'h':max(original.get('h',0),b['h']),'appearance':a}
  if page.get('ru',{}).get('title')==old:page['ru']['title']=new.split('\n')[0]

# The RU tables have different row heights/counts; preserve their own background
# geometry instead of putting Russian text over the Kazakh edition's cells.
tables=json.loads((root/'ru-tables.json').read_text())
for number,shapes in tables.items():
 page=pages[int(number)-1]
 for b in page['blocks']:
  if b.get('appearance',{}).get('tableCell'):
   b.setdefault('localized',{})['ru']={'appearance':{**b['appearance'],'opacity':0}}
 extra=[]
 for j,s in enumerate(shapes):
  a=s.pop('appearance')
  extra.append({'id':f'ru-table-{number}-{j}','kind':'shape','exact':True,'shape':'rect',**s,'appearance':{**a,'opacity':0},'localized':{'ru':{'appearance':a}}})
 page['blocks']=[b for b in page['blocks'] if b['kind']!='text']+extra+[b for b in page['blocks'] if b['kind']=='text']
(root/'bilingual-canvas.json').write_text(json.dumps(pages,ensure_ascii=False))
(root/'language-audit.json').write_text(json.dumps(unmatched,ensure_ascii=False,indent=2))
print('Pages:',len(pages),'text blocks:',sum(b['kind']=='text' for p in pages for b in p['blocks']),'extra RU lines:',len(unmatched))
print(json.dumps(unmatched,ensure_ascii=False)[:4000])
