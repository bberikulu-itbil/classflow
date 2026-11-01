import os, json
import pymupdf as fitz
from pathlib import Path

out=Path('/tmp/classflow-reference'); out.mkdir(exist_ok=True)
ru=fitz.open('/Users/bberikulu/Downloads/[Rus] Scrimmage Внедрение ИИ в STEM-образование.pdf')
kk=fitz.open('/tmp/classflow-reference/[KAZ] Scrimmage STEM-білімге AI енгізу.pdf')
for lang,doc in [('kk',kk),('ru',ru)]:
    result=[]
    for i,p in enumerate(doc):
        result.append({'page':i+1,'width':p.rect.width,'height':p.rect.height,'blocks':p.get_text('dict')['blocks']})
        print(lang,i+1,repr(p.get_text()[:130].replace('\n',' | ')))
    # Images are already handled by PPTX; keep only PDF text geometry here.
    for page in result: page['blocks']=[b for b in page['blocks'] if b['type']==0]
    (out/f'{lang}-text.json').write_text(json.dumps(result,ensure_ascii=False))
    for i in [0,1,31,51,69]:
        doc[i].get_pixmap(matrix=fitz.Matrix(.7,.7)).save(str(out/f'{lang}-{i+1}.png'))
