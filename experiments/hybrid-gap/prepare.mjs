// SPDX-License-Identifier: Apache-2.0
// Clone the prior frozen runtime and AAC fixture, then apply a test-only no-draw hook.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const repo=path.resolve(import.meta.dirname,'../..');
const sourceManifest=JSON.parse(await fs.readFile(path.join(repo,'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/fixtures.json')));
const fixture=sourceManifest.fixtures.find(item=>item.file==='h264-1080p60-aac.mkv');
if(!fixture)throw Error('Frozen AAC fixture absent');
const out=path.resolve(process.env.OUT??'build/hybrid-gap/assets');
const web=path.join(out,'demuxe/web'),fixtures=path.join(out,'fixtures');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const replaceOnce=(source,before,after)=>{
 if(source.split(before).length!==2)throw Error(`Patch anchor count was not one: ${before.slice(0,60)}`);
 return source.replace(before,after);
};
await fs.mkdir(path.dirname(web),{recursive:true});
await fs.cp(path.join(repo,'web'),web,{recursive:true,force:true});
await fs.mkdir(fixtures,{recursive:true});
const sourceFixture=path.join(repo,'results/unsupported-audio-cpu/20260924-three-arm-qualified/fixtures',fixture.file);
const fixtureBytes=await fs.readFile(sourceFixture);
if(hash(fixtureBytes)!==fixture.sha256)throw Error('Frozen fixture SHA mismatch');
await fs.copyFile(sourceFixture,path.join(fixtures,fixture.file));
const fontDestination=path.join(out,'demuxe/fixtures');await fs.mkdir(fontDestination,{recursive:true});
for(const name of ['DejaVuSans.ttf','FONT-LICENSE.txt'])await fs.copyFile(path.join(repo,'fixtures',name),path.join(fontDestination,name));
for(const [relative,expected] of Object.entries(sourceManifest.runtime.files)){
 if(!expected)continue;
 const bytes=await fs.readFile(path.join(web,relative));
 if(hash(bytes)!==expected.sha256)throw Error(`Frozen runtime differs: ${relative}`);
}
const workerPath=path.join(web,'filter-retained-engine-worker.js');
let worker=await fs.readFile(workerPath,'utf8');
worker=replaceOnce(worker,
 "const skipCanvas=true;const quality=new URL(self.location.href).searchParams.get('quality')==='1';const mode=new URL(self.location.href).searchParams.get('mode');",
 "const skipCanvas=true;const quality=new URL(self.location.href).searchParams.get('quality')==='1';const mode=new URL(self.location.href).searchParams.get('mode');\nconst attributionNoDraw=new URL(self.location.href).searchParams.get('attributionNoDraw')==='1';");
worker=replaceOnce(worker,
 '  videoPresenter.draw(frame,videoTrack,request.overlay);\n  if(context)subtitles.draw(context,request.overlay);',
 '  if(!attributionNoDraw){videoPresenter.draw(frame,videoTrack,request.overlay);if(context)subtitles.draw(context,request.overlay);}');
worker=replaceOnce(worker,
 'if(engine._web_selected_redraw()&&heldFrame&&Math.round(heldFrame.timestamp??heldFrame.pts)===key){videoPresenter.draw(heldFrame,videoTrack,overlay);if(context)subtitles.draw(context,overlay);presentation.redraws++;engine._web_presented();return;}',
 'if(engine._web_selected_redraw()&&heldFrame&&Math.round(heldFrame.timestamp??heldFrame.pts)===key){if(!attributionNoDraw){videoPresenter.draw(heldFrame,videoTrack,overlay);if(context)subtitles.draw(context,overlay);}presentation.redraws++;engine._web_presented();return;}');
await fs.writeFile(workerPath,worker);
const compiledPath=path.join(web,'generated/internal/wasm-player.js');
let compiled=await fs.readFile(compiledPath,'utf8');
compiled=replaceOnce(compiled,
 "this.worker = new owner.Worker(new URL(mode === 'hybrid' ? 'web/filter-retained-engine-worker.js?mode=retained' : 'web/software-full-engine-worker.js', assetBase), { type: 'module' });",
 "this.worker = new owner.Worker(new URL(mode === 'hybrid' ? `web/filter-retained-engine-worker.js?mode=retained&attributionNoDraw=${globalThis.__hybridGapNoDraw ? 1 : 0}` : 'web/software-full-engine-worker.js', assetBase), { type: 'module' });");
await fs.writeFile(compiledPath,compiled);
const summary={fixture:fixture.file,fixtureSha256:fixture.sha256,videoPacketSignatureSha256:fixture.video.packetSignatureSha256,
 sourceRevision:sourceManifest.runtime.revision,patchedFiles:Object.fromEntries(await Promise.all([workerPath,compiledPath].map(async file=>[path.relative(web,file),hash(await fs.readFile(file))])))};
await fs.writeFile(path.join(out,'attribution-preparation.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
