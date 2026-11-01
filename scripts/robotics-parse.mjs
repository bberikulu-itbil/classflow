import { build } from 'esbuild';
import fs from 'node:fs/promises';
import { DOMParser } from '/tmp/classflow-fidelity-tools/node_modules/linkedom/esm/index.js';
globalThis.DOMParser=DOMParser;
await build({entryPoints:['src/lessons/pptx.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/classflow-reference/parser.mjs',logLevel:'error'});
const {parsePptx,pptxSlideToCanvas}=await import('/tmp/classflow-reference/parser.mjs?'+Date.now());
const path='/Users/bberikulu/Downloads/[KAZ] Scrimmage STEM-білімге AI енгізу.pptx';
const deck=await parsePptx(new File([await fs.readFile(path)],'robotics.pptx'));
const images={};
for(const s of deck.slides) for(const b of s.blocks) if(b.kind==='image' && !images[b.name]) {
  // Preserve original PNG alpha instead of converting every asset to JPEG.
  await fs.writeFile('public/robotics-v2/'+b.name,b.bytes);
  images[b.name]='https://bberikulu-itbil.github.io/classflow/robotics-v2/'+b.name;
}
const pages=deck.slides.map(s=>pptxSlideToCanvas(s,{language:'kk',importBatchId:'robotics-fidelity-v3',imageSources:images}));
await fs.writeFile('/tmp/classflow-reference/kk-canvas.json',JSON.stringify(pages));
console.log(JSON.stringify({pages:pages.length,blocks:pages.reduce((n,s)=>n+s.blocks.length,0),first:pages[0].blocks.map(({kind,x,y,w,h,text,size})=>({kind,x,y,w,h,text,size}))},null,2));
