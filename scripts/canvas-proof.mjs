import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['scripts/canvas-proof.tsx'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/classflow-reference/proof.cjs',logLevel:'error',format:'cjs'});
const {render}=await import('/tmp/classflow-reference/proof.cjs?'+Date.now());
const pages=JSON.parse(await fs.readFile('/tmp/classflow-reference/bilingual-canvas.json','utf8'));
await fs.mkdir('public/.fidelity-proof',{recursive:true});
for(let i=0;i<pages.length;i++) for(const lang of ['kk','ru']) {
  const page=structuredClone(pages[i]);
  for (const b of page.blocks) if(b.kind==='image') {
    const name=b.src.split('/').pop();
    b.src=`data:image/${name.endsWith('.png')?'png':'jpeg'};base64,${(await fs.readFile('public/robotics-v2/'+name)).toString('base64')}`;
  }
  const html=`<!doctype html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet"><style>@font-face{font-family:Inter;src:url(/fonts/Inter.ttf);font-weight:100 900}@font-face{font-family:Inter;src:url(/fonts/Inter-Italic.ttf);font-weight:100 900;font-style:italic}*{box-sizing:border-box}body{margin:0;background:#ddd}.relative{position:relative}.w-full{width:100%}.overflow-hidden{overflow:hidden}.sr-only{display:none}main{width:960px;margin:0 auto}</style></head><body><main>${render(page,lang)}</main></body></html>`;
  await fs.writeFile(`public/.fidelity-proof/${lang}-${i+1}.html`,html);
}
console.log('144 canvas proof pages rendered');
