// SPDX-License-Identifier: Apache-2.0
// Preserve the frozen runtime. Add only a test presenter selection and telemetry.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const source=path.resolve('build/hybrid-presentation-matrix/assets');
const out=path.resolve('build/hybrid-external-texture/assets');
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(out,{recursive:true});
await fs.cp(source,out,{recursive:true});
const web=path.join(out,'demuxe/web');
const files=['filter-retained-engine-worker.js','generated/internal/wasm-player.js'];
const hashes={};
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error(`Anchor mismatch: ${a}`);return s.replace(a,b);};
for(const f of files){
 let s=await fs.readFile(path.join(web,f),'utf8');const original=hash(s);
 if(f===files[0]){
  s=replace(s,"import {WebCodecsPresenter} from './video-presenter.js';","import {WebCodecsPresenter} from './video-presenter.js';\nimport {externalTexturePresenter} from './external-texture-presenter.mjs';");
  s=replace(s,"        context = canvas.getContext('2d', {alpha:false});\n        videoPresenter=new WebCodecsPresenter(canvas,context);",
   "        if(new URL(self.location.href).searchParams.get('externalTexture')==='1'){\n          videoPresenter=await externalTexturePresenter(canvas,message=>post({type:'error',message}));\n        }else{\n          context=canvas.getContext('2d',{alpha:false});\n          videoPresenter=new WebCodecsPresenter(canvas,context);\n        }");
  s=replace(s,'pumpTicks:ticks,subtitles:',"pumpTicks:ticks,presenter:videoPresenter?.stats??{kind:'canvas2d'},subtitles:");
 }else s=replace(s,'attributionNoDraw=${globalThis.__hybridGapNoDraw ? 1 : 0}',
   'attributionNoDraw=${globalThis.__hybridGapNoDraw ? 1 : 0}&externalTexture=${globalThis.__hybridExternalTexture ? 1 : 0}');
 await fs.writeFile(path.join(web,f),s);hashes[f]={original,patched:hash(s)};
}
await fs.copyFile('experiments/hybrid-external-texture/presenter.mjs',path.join(web,'external-texture-presenter.mjs'));
const inherited=JSON.parse(await fs.readFile(path.join(out,'attribution-preparation.json')));
const meta={...inherited,externalTexture:{source,patches:hashes,presenterSha256:hash(await fs.readFile(path.join(web,'external-texture-presenter.mjs'))),
  decoderWorkerSha256:hash(await fs.readFile(path.join(web,'retained-decoder-worker.js')))}};
await fs.writeFile(path.join(out,'attribution-preparation.json'),JSON.stringify(meta,null,2)+'\n');
await fs.mkdir('results/hybrid-external-texture',{recursive:true});
await fs.writeFile('results/hybrid-external-texture/preparation.json',JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta.externalTexture,null,2));
