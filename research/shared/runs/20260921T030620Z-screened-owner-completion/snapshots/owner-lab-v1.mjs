// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export async function bounded(promise,ms=20000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(`deadline ${ms}ms`)),ms))]);}finally{clearTimeout(timer);}}
export async function serveLab(context){
 const cache=new Map(),assets=new Map(),root=process.cwd();
 const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost');res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
  const match=/^\/(baseline|candidate|current)\/(.*)$/.exec(u.pathname);const variant=match?.[1]||'current',name=match?.[2]??u.pathname.slice(1);
  if(!name){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="surface"></div>');return;}
  let file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error('outside root');
  if(variant!=='current'&&/^web\/engine-remux\/remux\.(mjs|wasm)$/.test(name))file=path.resolve(context.build,'engine-'+(variant==='candidate'?'aac':'baseline'),path.basename(name));
  if(!cache.has(file)){
   const b=await readFile(file);cache.set(file,b);
   if(!file.startsWith(path.resolve(context.build)+path.sep)||file.includes('/engine-')){
    const relative=path.relative(root,file),target=path.join(context.run,'snapshots/runtime',relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,b);assets.set(relative,{path:relative,snapshot:target,sha256:sha(b),bytes:b.length});
   }
  }
  const b=cache.get(file);let start=0,end=b.length-1,status=200;const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range){start=Number(range[1]);end=range[2]?Math.min(end,Number(range[2])):end;status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${b.length}`);}
  if(start>end){res.writeHead(416).end();return;}
  const types={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.ogg':'audio/ogg'};
  res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','ETag':'"'+sha(b)+'"'});res.end(b.subarray(start,end+1));
 }catch(e){res.writeHead(500).end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {origin:`http://127.0.0.1:${server.address().port}`,assets,close:()=>new Promise(r=>server.close(r))};
}
export function profiles(context){const b=context.build;return [
 {id:'D01',source:b+'/batch01/av_pce.mp4',reference:b+'/batch01/av_pce_canonical.mp4',candidateEngine:'candidate',referenceEngine:'baseline',remux:'always',mime:'video/mp4',video:true},
 {id:'D08',source:b+'/batch02/explicit_rate.mp4',reference:b+'/batch02/canonical_rate.mp4',candidateEngine:'candidate',referenceEngine:'baseline',remux:'always',mime:'video/mp4',video:true},
 {id:'D32',source:b+'/batch06/pcm_mulaw.au',reference:b+'/batch06/pcm_mulaw_wrapped.wav',adapter:'auToWave',remux:'auto',mime:'audio/wav'},
 {id:'D68',source:b+'/batch16/float_be.caf',reference:b+'/batch16/float_be_view.wav',adapter:'cafPcmToWave',remux:'auto',mime:'audio/wav'},
 {id:'D69',source:b+'/batch16/opus_declared.caf',reference:b+'/batch16/opus_declared_view.ogg',adapter:'cafOpusToOgg',remux:'auto',mime:'audio/ogg'},
 ];}
export async function playerTrial(browser,server,profile,candidate,{lifecycle=false}={}){
 const page=await browser.newPage();const variant=candidate?(profile.candidateEngine||'current'):(profile.referenceEngine||'current');
 const start=performance.now();let result;
 try{
  await page.goto(server.origin+'/'+variant+'/');
  result=await bounded(page.evaluate(async({profile,candidate,variant,lifecycle})=>{
   const wait=(p,ms=14000)=>{let id;return Promise.race([p,new Promise((_,reject)=>id=setTimeout(()=>reject(Error('browser operation deadline')),ms))]).finally(()=>clearTimeout(id));};
   const {Player}=await import(`/${variant}/web/generated/index.js`);const adapters=await import('/research/shared/tooling/finite-native-audio.mjs');
   const allStart=performance.now(),response=await fetch('/'+(candidate?profile.source:profile.reference));if(!response.ok)throw Error('source fetch');const input=new Uint8Array(await response.arrayBuffer());
   const beforePrepare=performance.now(),prepared=candidate&&profile.adapter?adapters[profile.adapter](input):{bytes:input,mime:profile.mime};const prepareMs=performance.now()-beforePrepare;
   const file=new File([prepared.bytes],profile.id+(prepared.mime==='audio/ogg'?'.ogg':prepared.mime==='audio/wav'?'.wav':'.mp4'),{type:prepared.mime});
   window.p=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:profile.remux});window.ac=null;window.errors=[];p.addEventListener('error',e=>errors.push(String(e.detail)));
   const openStart=performance.now();await wait(p.open(file));const openMs=performance.now()-openStart;
   const route=p.diagnostics.backend?.plan,mode=p.mode;if(mode!=='native')throw Error('candidate fell back from Native');
   ac=new AudioContext({sampleRate:48000});const analyser=ac.createAnalyser();ac.createMediaElementSource(p.surface).connect(analyser);analyser.connect(ac.destination);await ac.resume();
   const samples=[];const timer=setInterval(()=>{const v=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(v);samples.push(Math.sqrt(v.reduce((a,x)=>a+x*x,0)/v.length));},30);
   const startupMs=performance.now()-allStart,frames=[],seeks=[];
   const fingerprint=async()=>{const v=p.surface;if(!profile.video)return null;const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;const ctx=canvas.getContext('2d');ctx.drawImage(v,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),v=>v.toString(16).padStart(2,'0')).join('');return {hash,width:canvas.width,height:canvas.height,time:p.properties.get('time-pos')};};
   const duration=Number(p.properties.get('duration'));
   try{
    if(lifecycle){
     for(const t of [Math.min(1,duration*.6),.25,Math.max(.3,duration-.4)]){const s=performance.now();await wait(p.seek(t));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));frames.push(await fingerprint());seeks.push({target:t,actual:p.properties.get('time-pos'),ms:performance.now()-s});}
     await wait(p.seek(.05));
    }
    const playbackStart=performance.now();await p.play();await wait(new Promise((resolve,reject)=>{const id=setInterval(()=>{if(p.surface.ended){clearInterval(id);resolve();}else if(errors.length){clearInterval(id);reject(Error(errors.join('; ')));}},30);}),Math.max(10000,duration*2000));
    const playbackMs=performance.now()-playbackStart;
    if(!samples.some(x=>x>.005))throw Error('requested audio output missing');
    const totalVideoFrames=p.surface.getVideoPlaybackQuality?.().totalVideoFrames||0;if(profile.video&&totalVideoFrames<3)throw Error('requested video output missing');
    const beforeDestroy=performance.now();await wait(p.destroy());await ac.close();ac=null;
    return {candidate,prepareMs,openMs,startupMs,playbackMs,cleanupMs:performance.now()-beforeDestroy,totalMs:performance.now()-allStart,mode,route,duration,seeks,frames,maxRms:Math.max(...samples),totalVideoFrames,errors,sourceBytes:input.length,preparedBytes:prepared.bytes.length};
   }finally{clearInterval(timer);}
  },{profile,candidate,variant,lifecycle}),30000);
  await page.waitForTimeout(80);result.workersAfterDestroy=page.workers().length;if(result.workersAfterDestroy)throw Error('workers survived destroy');result.hostTotalMs=performance.now()-start;
  return result;
 }finally{await bounded(page.evaluate(async()=>{await window.p?.destroy();await window.ac?.close();}).catch(()=>{}),2000).catch(()=>{});await page.close();}
}
