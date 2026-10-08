// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const file=path.resolve(process.argv[2]),root=path.dirname(file),r=JSON.parse(await readFile(file));
assert.equal(r.status,'pass');assert.ok(r.finalTime>23);assert.deepEqual(r.errors,[]);assert.deepEqual(r.pageErrors??[],[]);
const b=r.buffering.effective.settings;
assert.equal(r.buffering.effective.forwardLimitBytes,b.codedBudgetBytes);
assert.equal(b.codedBudgetBytes,64*1024*1024);assert.equal(b.budgetGrowths,3);
for(const key of ['preview','pausedPreview']){
 const f=r[key];assert.equal(f.path,'native-remux');assert.ok(Math.abs(f.time-10)<.25);assert.equal(f.width,160);assert.equal(f.height,90);
 const png=f.image?path.join(root,f.image):path.join(root,r.config.id+'-'+key+'.png');
 if(!f.image)await writeFile(png,Buffer.from(f.dataURL.split(',')[1],'base64'));
 const raw=execFileSync('ffmpeg',['-v','error','-i',png,'-f','rawvideo','-pix_fmt','rgb24','-']);
 assert.equal(raw.length,160*90*3);
 const rgb=[0,0,0];for(let y=8;y<24;y++)for(let x=8;x<24;x++)for(let c=0;c<3;c++)rgb[c]+=raw[(y*160+x)*3+c]/256;
 assert.ok(rgb[1]>180&&rgb[0]<40&&rgb[2]<40,JSON.stringify(rgb));
}
if(r.trace?.length){
 const active=new Set();let primary;
 for(const event of r.trace){
  if(event.kind==='openRemote-start'){primary??=event.id;active.add(event.id);assert.ok(active.size<=2,'more than playback plus one preview');}
  if(event.kind==='destroy-done')active.delete(event.id);
  if(event.kind==='seek-start')assert.notEqual(event.id,primary,'thumbnail sought primary');
  if(event.kind==='native-sample'){
   const settings=event.diagnostics.buffering?.settings;
   if(settings?.codedBudgetBytes!==undefined){assert.ok(settings.codedBudgetBytes<=64*1024*1024);assert.ok(settings.budgetGrowths<=3);}
  }
 }
 assert.equal(active.size,0,'owners were not destroyed');
}
for(const asset of JSON.parse(await readFile(path.join(root,'served-assets.json')))){
 const bytes=await readFile(asset.path);assert.equal(bytes.length,asset.bytes,asset.path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path);
}
const receipt={passed:true,file,checks:['4K playback through 23 seconds','playing and paused 160x90 green thumbnails at 10 seconds','bounded 8/16/32/64 MiB primary growth','no playback/page errors','independent FFmpeg pixel verification','served asset hashes match']};
await writeFile(path.join(root,r.config.id+'-verified.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
