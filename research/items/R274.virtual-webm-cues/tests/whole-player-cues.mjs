// SPDX-License-Identifier: Apache-2.0
// Source-prepared bounded public-Player correctness pilot, not a CPU benchmark.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [assetArg,outArg,pairsArg]=process.argv.slice(2);const pairs=Number(pairsArg??0);assert.ok(pairs===0||pairs===5,'pilot or predeclared five pairs only');assert.ok(assetArg&&outArg,'assets output');
const assets=path.resolve(assetArg),out=path.resolve(outArg),input=path.resolve('research/shared/runs/20260919T221240Z-virtual-cues-sized/cueless.webm'),reference=path.resolve('research/shared/runs/20260919T221240Z-virtual-cues-sized/indexed-reference.webm');
await fs.mkdir(out,{recursive:false});
await fs.mkdir(path.join(out,'snapshots'));
await fs.copyFile(import.meta.filename,path.join(out,'snapshots/executed-harness.mjs'));
for(const file of ['rebuild-cues.py','validate-rebuilt-cues.py'])await fs.copyFile(path.join(import.meta.dirname,file),path.join(out,'snapshots',file));
const digest=b=>createHash('sha256').update(b).digest('hex');
const trustedSource='8cd03e36d2d3094499afbbc5db405a2a70f783ee16e5f702dd64957efe5d32ed';
const manifest=JSON.parse(await fs.readFile(path.join(assets,'manifest.json')));
for(const [name,v]of Object.entries(manifest.files))assert.equal(digest(await fs.readFile(path.join(assets,name))),v.sha256,name);
// Untimed fixture provenance check; trial baseline reads only requested ranges.
assert.equal(digest(await fs.readFile(input)),trustedSource);
const owners=new Map(),requests=[],records=[],retired=new Set();
const command=(args)=>new Promise((resolve,reject)=>{const p=spawn('python3',args,{stdio:['ignore','pipe','pipe']}),text=[];p.stdout.on('data',b=>text.push(String(b)));p.stderr.on('data',b=>text.push(String(b)));p.on('error',reject);p.on('exit',code=>code===0?resolve(text.join('')):reject(Error('builder exit '+code+' '+text.join(''))));});
async function createOwner(id,mode){
 const start=performance.now(),cpu=process.cpuUsage(),sourceStat=await fs.stat(input);
 if(id==='cancel-control')await new Promise(r=>setTimeout(r,150));
 let bytes=null,construction=null;
 if(mode==='candidate'){
  const target=path.join(out,id+'.webm');
  await command(['research/items/R274.virtual-webm-cues/tests/rebuild-cues.py',input,target]);
  construction=JSON.parse(await fs.readFile(target.replace(/\.webm$/,'.index.json')));assert.equal(construction.source_sha256,trustedSource);
  bytes=await fs.readFile(target);assert.equal(digest(bytes),construction.output_sha256);
 }else if(mode==='reference')bytes=await fs.readFile(reference);
 if(retired.has(mode+'/'+id))throw Error('retired source generation');
 const usage=process.cpuUsage(cpu);
 return {bytes,sourceBytes:sourceStat.size,setupMs:performance.now()-start,nodeSetupCpuSeconds:(usage.user+usage.system)/1e6,builderCpuSeconds:construction?.process_cpu_seconds??0,construction};
}
const mime={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.ttf':'font/ttf'};
const server=createServer(async(q,r)=>{try{
 for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))r.setHeader(k,v);
 const u=new URL(q.url,'http://local');
 if(u.pathname==='/'){r.setHeader('Content-Type','text/html');r.end('<!doctype html><div id="stage" style="width:640px;height:360px"></div>');return;}
 if(u.pathname==='/control/stale'){const wrong=await fs.readFile(input);wrong[1000]^=1;assert.notEqual(digest(wrong),trustedSource);r.writeHead(409).end('source identity rejected');return;}
 if(u.pathname.startsWith('/retire/')){retired.add(u.pathname.slice('/retire/'.length));r.end('retired');return;}
 const match=/^\/media\/(reference|baseline|candidate)\/([a-z0-9-]+)\.webm$/.exec(u.pathname);
 if(match){const[,mode,id]=match,key=mode+'/'+id;if(!owners.has(key))owners.set(key,createOwner(id,mode));const owner=await owners.get(key),b=owner.bytes,size=b?.length??owner.sourceBytes;
  const m=q.headers.range?.match(/^bytes=(\d+)-(\d*)$/);const start=m?+m[1]:0,end=m?.[2]?Math.min(+m[2],size-1):size-1;
  assert.ok(start<=end&&end<size,'range bounds');r.writeHead(m?206:200,{'Content-Type':'video/webm','Content-Length':end-start+1,'Accept-Ranges':'bytes','ETag':'"'+(b?digest(b):trustedSource)+'"',...(m?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  const row={key,start,end,bytes:0};requests.push(row);let pos=start,timer,closed=false;const handle=b?null:await fs.open(input,'r');
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);handle?.close().catch(()=>{});};r.on('close',close);
  const pump=async()=>{try{if(closed)return;if(pos>end){r.end();close();return;}const n=Math.min(8192,end-pos+1);let chunk;
   if(b)chunk=b.subarray(pos,pos+n);else{chunk=Buffer.allocUnsafe(n);const got=await handle.read(chunk,0,n,pos);assert.equal(got.bytesRead,n,'baseline range read');}
   if(closed)return;r.write(chunk);row.bytes+=n;pos+=n;timer=setTimeout(pump,5);
  }catch(e){r.destroy(e);close();}};timer=setTimeout(pump,5);return;
 }
 if(!u.pathname.startsWith('/demuxe/')){r.writeHead(404).end();return;}
 const f=path.resolve(assets,u.pathname.slice(1));assert.ok(f.startsWith(assets+path.sep));r.setHeader('Content-Type',mime[path.extname(f)]??'application/octet-stream');r.end(await fs.readFile(f));
}catch(e){if(!r.headersSent)r.writeHead(409);r.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const result={predeclared:{metric:'complete Player construction/open/play/three fixed seeks/EOF/destroy wall cost including on-demand server index construction, less directly timed canvas/hash oracle work; presentation waits charged',pairs,medianSavingRequired:0.10,everyPairFaster:true,browserLaunchAndCommonModuleImportExcluded:true,serverConstructionCpuReportedSeparately:true,oracleReadbackHashSubtracted:true,byteMetric:'server-written media bytes, not exact wire/client received bytes'},scope:'Public Player Native video-only cold index construction and complete lifecycle latency. Node/builder CPU separately charged; aggregate Chrome CPU not measured. Pilot has no performance decision; five-pair variant uses the predeclared wall-cost gate.',sourceSHA256:trustedSource,assetsManifestSHA256:digest(Buffer.from(JSON.stringify(manifest))),cases:records};
try{
 assert.equal((await fetch(origin+'/control/stale')).status,409);
 const pending=fetch(origin+'/media/candidate/cancel-control.webm');
 await new Promise(r=>setTimeout(r,30));await fetch(origin+'/retire/candidate/cancel-control');
 assert.equal((await pending).status,409,'late generation rejected');
 result.sourceControls={staleSourceRejected:true,actualPendingConstructionRetired:true};
 const jobs=pairs?[{mode:'reference',pair:-1},...Array.from({length:pairs},(_,pair)=>(pair%2?['candidate','baseline']:['baseline','candidate']).map(mode=>({mode,pair}))).flat()]:['reference','baseline','candidate'].map(mode=>({mode,pair:0}));
 for(const{mode,pair}of jobs){
  const id=mode+'-'+pair,browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
  try{result.browser=browser.version();const page=await browser.newPage({viewport:{width:800,height:600}});await page.goto(origin);await page.bringToFront();
   const row=await page.evaluate(async({url})=>{
    if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('foreground document required');
    const{Player}=await import('/demuxe/web/generated/index.js');const start=performance.now();const p=new Player(document.querySelector('#stage'),{assetBase:'/demuxe/',mode:'native',width:640,height:360});await p.ready;
    const images=[];let activeMode,oracleObserverMs=0;
    const wait=async predicate=>{const until=performance.now()+20000;while(!predicate()){if(performance.now()>until)throw Error('progress timeout');await new Promise(r=>setTimeout(r,20));}};
    let summary;try{await p.open(url);activeMode=p.state.activeMode;if(activeMode!=='native')throw Error('Native required');await p.play();await wait(()=>p.state.currentTime>.5);await p.pause();
     for(const time of[25.0166666667,5.0166666667,20.0166666667]){await p.seek(time);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const observerStart=performance.now();const v=document.querySelector('#stage video');const c=new OffscreenCanvas(640,360),x=c.getContext('2d');x.drawImage(v,0,0,640,360);images.push({time,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',x.getImageData(0,0,640,360).data))].map(n=>n.toString(16).padStart(2,'0')).join('')});oracleObserverMs+=performance.now()-observerStart;}
     await p.seek(28);await p.play();await wait(()=>p.state.ended||p.state.eofReached||document.querySelector('#stage video')?.ended);await p.pause();summary={activeMode,images,playSeekEof:true};
    }finally{await p.destroy();if(document.querySelector('#stage video'))throw Error('video retained after destroy');}
    if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('foreground document lost');
    const playerObservedMs=performance.now()-start;return {...summary,playerMs:playerObservedMs-oracleObserverMs,playerObservedMs,oracleObserverMs,foregroundAtEndpoints:true};
   },{url:origin+'/media/'+mode+'/'+id+'.webm'});
   await page.waitForTimeout(100);row.workerCount=page.workers().length;assert.equal(row.workerCount,0);row.mode=mode;row.pair=pair;row.sourceRequests=requests.filter(x=>x.key===mode+'/'+id);row.serverWrittenMediaBytes=row.sourceRequests.reduce((n,x)=>n+x.bytes,0);const owner=await owners.get(mode+'/'+id);row.serverSetupMs=owner.setupMs;row.serverNodeCpuSeconds=owner.nodeSetupCpuSeconds;row.serverBuilderCpuSeconds=owner.builderCpuSeconds;row.constructedFromSource=mode==='candidate';records.push(row);
   if(mode!=='reference')assert.deepEqual(row.images,records[0].images,'full target pictures');await page.close();owners.delete(mode+'/'+id);
  }finally{await browser.close();}
 }
 if(pairs){const ratios=Array.from({length:pairs},(_,i)=>records.find(r=>r.pair===i&&r.mode==='candidate').playerMs/records.find(r=>r.pair===i&&r.mode==='baseline').playerMs);const sorted=[...ratios].sort((a,b)=>a-b);result.benefitGate={pairedRatios:ratios,medianRatio:sorted[2],everyPairFaster:ratios.every(x=>x<1),passed:sorted[2]<=.90&&ratios.every(x=>x<1)};}
 result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,error:result.error}));}
