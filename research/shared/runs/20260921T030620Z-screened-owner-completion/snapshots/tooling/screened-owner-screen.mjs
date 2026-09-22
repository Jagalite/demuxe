// SPDX-License-Identifier: Apache-2.0
// Executes maintained Player/NativeRemux owners against archived authored inputs.
import {chromium} from 'playwright';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
const root=process.cwd(),context=JSON.parse(await readFile(process.argv[2],'utf8'));
const out=path.join(context.run,process.env.VARIANT||'owner-screen');await mkdir(out,{recursive:true});
const definitions=[
 ['D01',1,'av_pce.mp4'],['D01-reference',1,'av_pce_canonical.mp4'],
 ['D02',1,'project_7.mp4'],['D03',1,'width_2.mp4'],
 ['D08',2,'explicit_rate.mp4'],['D08-reference',2,'canonical_rate.mp4'],
 ['D09',2,'absolute.mp4'],['D10',2,'missing_tfdt.mp4'],['D11',2,'compound_0.mp4'],
 ['D14',3,'av_vorbis.mkv'],['D15-ogg',3,'opus_plus.ogg'],['D15-webm',3,'opus_plus.webm'],['D15-mp4',3,'opus_plus.mp4'],
 ['D32-mulaw',6,'pcm_mulaw.au'],['D32-alaw',6,'pcm_alaw.au'],['D32-reference',6,'pcm_mulaw_wrapped.wav'],
 ['D41-xiph',8,'stripped_xiph.mka'],['D41-ebml',8,'stripped_ebml.mka'],['D41-tail',8,'laced_tail.mka'],
 ['D42',8,'chained.opus'],['D57',12,'sparse.wav'],['D57-reference',12,'dense.wav'],['D65',15,'multiplexed.oga'],['D65-track2',15,'multiplexed.oga'],['D65-reference',15,'ogg0.flac'],
 ['D60',13,'damaged.mp4'],['D60-reference',13,'original.mp4'],
 ['D68-float',16,'float_be.caf'],['D68-integer',16,'s24_be.caf'],['D68-reference',16,'float_be_view.wav'],
 ['D69',16,'opus_declared.caf'],['D69-reference',16,'opus_declared_view.ogg'],
 ['D72',17,'vfr_explicit.webm'],['D72-short-default',17,'vfr_default_short.webm'],
 ['D73',17,'sar_rotated_s2.mp4'],['D73-reference',17,'sar_s2_p2_w320.mp4'],
];
const cases=definitions.filter(([id])=>!process.env.CASES||process.env.CASES.split(',').includes(id));
const served=new Map();
const server=http.createServer(async(req,res)=>{
 try{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><div id="surface"></div></body></html>');return;}
  let file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))throw Error('outside root');
  // Optional research-only engine substitution; default always runs maintained assets.
  if(process.env.ENGINE&&file===path.join(root,'web/engine-remux/remux.wasm'))file=path.resolve(process.env.ENGINE,'remux.wasm');
  if(process.env.ENGINE&&file===path.join(root,'web/engine-remux/remux.mjs'))file=path.resolve(process.env.ENGINE,'remux.mjs');
  const info=await stat(file);let a=0,b=info.size-1,status=200;
  if(!served.has(file)&&!file.startsWith(path.resolve(context.build)+path.sep)){const data=await readFile(file);served.set(file,{path:path.relative(root,file),sha256:createHash('sha256').update(data).digest('hex'),bytes:info.size});}
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(range){a=Number(range[1]);b=range[2]?Math.min(b,Number(range[2])):b;status=206;res.setHeader('Content-Range',`bytes ${a}-${b}/${info.size}`);}
  if(a>b||a<0){res.writeHead(416).end();return;}
  const types={'.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.ogg':'audio/ogg','.caf':'audio/x-caf','.au':'audio/basic','.mka':'audio/x-matroska','.mkv':'video/x-matroska'};
  res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':b-a+1,'Accept-Ranges':'bytes','ETag':`"${info.size}-${info.mtimeMs}"`});const stream=createReadStream(file,{start:a,end:b});res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch(e){res.writeHead(500).end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results={started:new Date().toISOString(),browser:browser.version(),base_git:context.base_git,engine:process.env.ENGINE||'maintained',evidence_level:'actual_route_screen',cases:[]};
try{
 for(const [id,batch,name] of cases){
  const page=await browser.newPage();page.setDefaultTimeout(15000);const row={id,batch,name};results.cases.push(row);
  try{
   await page.goto(origin+'/');await page.evaluate(policy=>window.remuxPolicy=policy,process.env.REMUX||'always');await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');window.p=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:window.remuxPolicy});window.errs=[];p.addEventListener('error',e=>errs.push(String(e.detail)));
    window.appended=[];const append=SourceBuffer.prototype.appendBuffer;SourceBuffer.prototype.appendBuffer=function(data){appended.push(new Uint8Array(data).slice());return append.call(this,data);};
   });
   const url=origin+'/'+context.build+`/batch${String(batch).padStart(2,'0')}/`+name,start=Date.now();
   await Promise.race([page.evaluate(url=>p.openRemote({url}),url),new Promise((_,reject)=>setTimeout(()=>reject(Error('screen open deadline 18s')),18000))]);row.openMs=Date.now()-start;
   if(id==='D65-track2'){row.selection=await page.evaluate(async()=>{const tracks=p.properties.get('track-list').filter(t=>t.type==='audio');if(tracks.length!==2)throw Error('two tracks not exposed');window.appended=[];await p.selectTrack('audio',String(tracks[1].id));return {requested:tracks[1],selected:p.properties.get('track-list')};});}
   row.open=await page.evaluate(()=>({mode:p.mode,diagnostics:p.diagnostics,duration:p.properties.get('duration'),tracks:p.properties.get('track-list'),width:p.surface.videoWidth,height:p.surface.videoHeight}));
   await page.evaluate(async()=>{window.ac=new AudioContext({sampleRate:48000});window.an=ac.createAnalyser();ac.createMediaElementSource(p.surface).connect(an);an.connect(ac.destination);await ac.resume();await p.play();});
   await page.waitForFunction(()=>p.properties.get('time-pos')>.3,null,{timeout:6000});await page.waitForTimeout(150);
   row.playback=await page.evaluate(()=>{const a=new Float32Array(an.fftSize);an.getFloatTimeDomainData(a);return {time:p.properties.get('time-pos'),rms:Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length),frames:p.surface.getVideoPlaybackQuality?.().totalVideoFrames,width:p.surface.videoWidth,height:p.surface.videoHeight,errors:errs};});
   await page.evaluate(()=>p.pause());row.seeks=[];
   for(const target of [Math.min(1,row.open.duration/2),.125]){
    if(!(target>0))continue;const start=Date.now();await page.evaluate(t=>p.seek(t),target);row.seeks.push({target,position:await page.evaluate(()=>p.properties.get('time-pos')),ms:Date.now()-start});
   }
   row.completed=true;
  }catch(e){row.completed=false;row.error=String(e.stack);row.diagnostics=await page.evaluate(()=>({current:p?.diagnostics,candidate:p?.candidate?.backend?.diagnostics,errors:window.errs})).catch(()=>null);}
  finally{
   const chunks=await page.evaluate(()=>window.appended?.map(v=>Array.from(v))||[]).catch(()=>[]);if(chunks.length){const bytes=Buffer.concat(chunks.map(v=>Buffer.from(v)));await writeFile(path.join(out,id+'.appended.bin'),bytes);row.appendedBytes=bytes.length;row.appendedSha256=createHash('sha256').update(bytes).digest('hex');}
   await Promise.race([page.evaluate(async()=>{await window.p?.destroy();await window.ac?.close();}).catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);await page.waitForTimeout(100);row.workersAfterDestroy=page.workers().length;await page.close();
   await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(id,row.completed?'COMPLETED':'REJECTED',row.error?.split('\n')[0]||'',row.playback?.rms??'');
  }
 }
}finally{await browser.close();await new Promise(r=>server.close(r));results.finished=new Date().toISOString();results.servedAssets=[...served.values()];await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');}
