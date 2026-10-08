// SPDX-License-Identifier: Apache-2.0
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
const directory=process.argv[2];if(!directory)throw Error('Usage: node experiments/preview-route-alignment/verify.mjs results-directory');
const files=(await readdir(directory)).filter(x=>x.endsWith('.json')&&!['served-assets.json','source-identity.json','summary.json'].includes(x));
const rows=[];
for(const file of files){
 const r=JSON.parse(await readFile(path.join(directory,file),'utf8'));
 if(!r.config||['control','lifecycle','capability'].includes(r.kind))continue;
 const failures=[];
 if(r.pageErrors?.length)failures.push('unhandled page errors');
 for(const [key,value]of Object.entries(r.checks))if(!value)failures.push(key);
 if(r.status!=='pass')failures.push(r.failure?.split('\n')[0]??'status');
 if(r.frames.length!==3)failures.push('three frames');
 for(const f of r.frames){
  if(Math.abs(f.time-f.target)>=.25)failures.push('timestamp');
  if(f.width!==undefined&&(f.width!==(r.config.expectedWidth??160)||f.height!==(r.config.expectedHeight??90)))failures.push('dimensions');
  // Decode the saved artifact independently of the browser's pixel report.
  if(r.checks.dimensions!==undefined){
   const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',path.join(directory,f.image)]));
   if(info.streams[0].width!==f.width||info.streams[0].height!==f.height)failures.push('artifact dimensions');
  }
  const pixels=execFileSync('ffmpeg',['-nostdin','-v','error','-i',path.join(directory,f.image),'-vf','crop=16:16:8:8','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
  const rgb=[0,0,0];for(let i=0;i<pixels.length;i++)rgb[i%3]+=pixels[i];for(let i=0;i<3;i++)rgb[i]/=pixels.length/3;
  const expected=f.target<16?1:2;if(rgb[expected]<170||rgb.some((v,i)=>i!==expected&&v>=70))failures.push('artifact color');
 }
 const pace=r.during?r.during.mediaSeconds/(r.during.wallMs/1000):null;
 if(pace!==null&&pace<=.8)failures.push('playback pace');
 rows.push({id:r.config.id,status:failures.length?'fail':'pass',failures,accepted:r.accepted,preview:r.previewIdentity,coldMs:r.frames[0]?.latencyMs,warmMs:r.frames.slice(1).map(f=>f.latencyMs),cacheMs:r.cache?.ms,baselinePace:r.baseline?.mediaSeconds/(r.baseline?.wallMs/1000),previewPace:pace,baselineDropped:r.baseline?.dropped,previewDropped:r.during?.dropped,production:r.productionPreview,cancellation:r.cancellation,mediaBytes:r.traffic?.reduce((sum,v)=>sum+v.bytes,0)});
}
const assets=JSON.parse(await readFile(path.join(directory,'served-assets.json'),'utf8'));
const latest=new Map(),versions=new Map();for(const asset of assets){latest.set(asset.path,asset);if(!versions.has(asset.path))versions.set(asset.path,new Set());versions.get(asset.path).add(asset.sha256);}
const changed=[];for(const asset of latest.values()){const hash=createHash('sha256').update(await readFile(asset.path)).digest('hex');if(hash!==asset.sha256)changed.push(asset.path);}
const multipleServedVersions=[...versions].filter(([,hashes])=>hashes.size>1).map(([file,hashes])=>({path:file,hashes:[...hashes]}));
const summary={rows,passed:rows.filter(r=>r.status==='pass').length,total:rows.length,changedServedAssets:changed,multipleServedVersions,scope:'One local browser host (see host.json when present); finite fixtures identified per case, functional and end-to-end latency evidence; no CPU attribution or broad codec/browser qualification'};
await writeFile(path.join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.table(rows.map(r=>({case:r.id,status:r.status,cold:Math.round(r.coldMs),warm:r.warmMs.map(Math.round).join('/'),pace:r.previewPace?.toFixed(2),failures:r.failures.join(', ')})));
console.log(JSON.stringify({passed:summary.passed,total:summary.total,changedServedAssets:changed}));
assert.equal(changed.length,0,'Served assets changed after the experiment');
assert.equal(multipleServedVersions.length,0,'A served path changed version during the experiment');
assert.equal(rows.length,Number(process.argv[3]??26),'Full matrix must contain the expected case count');
const expectedFailures=new Set((process.argv[4]??'').split(',').filter(Boolean));
assert.deepEqual(rows.filter(r=>r.status==='fail').map(r=>r.id).sort(),[...expectedFailures].sort(),'Observed failures must exactly match explicitly named expected failures');
