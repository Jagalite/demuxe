// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/selected-mp4-view/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),cases:[],measurements:[]};
try{
 for(const layout of ['front','tail']){
  const source=`results/full-completion/r59/two-${layout}.mp4`;
  const server=await serve({isolated:true,mediaPaths:{movie:source}});
  try{
   const page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
   const identity=await page.evaluate(async url=>{
    const file=new File([await(await fetch(url)).arrayBuffer()],'source.mp4');const {selectedMP4View}=await import('/web/selected-mp4-view.js');const view=await selectedMP4View(file,2,new AbortController().signal);if(!view)throw Error('View admission failed');
    const bad=await selectedMP4View(file,99,new AbortController().signal);if(bad)throw Error('Invalid track admitted');
    const original=new Uint8Array(await file.arrayBuffer());const tracks=[];for(let i=4;i<original.length-32;i++)if(String.fromCharCode(...original.subarray(i,i+4))==='tkhd')tracks.push(i-4);
    if(tracks.length!==3)throw Error('Fixture track headers');
    const unequal=original.slice(),dv=new DataView(unequal.buffer);dv.setUint32(tracks[1]+28,dv.getUint32(tracks[1]+28)+1);
    if(await selectedMP4View(new File([unequal],'unequal.mp4'),2,new AbortController().signal))throw Error('Unequal removed-track tail admitted');
    const ambiguous=original.slice();ambiguous[tracks[2]+11]|=1;
    if(await selectedMP4View(new File([ambiguous],'ambiguous.mp4'),undefined,new AbortController().signal))throw Error('Ambiguous default audio admitted');
    if(!await selectedMP4View(new File([ambiguous],'explicit.mp4'),2,new AbortController().signal))throw Error('Explicit selection rejected');

    const cancelled=new AbortController();cancelled.abort();let rejected=false;try{await selectedMP4View(file,2,cancelled.signal);}catch{rejected=true;}if(!rejected)throw Error('Cancelled metadata accepted');
    return {bytes:[...new Uint8Array(await view.file.arrayBuffer())],diagnostics:view.diagnostics};
   },server.origin+'/media/movie');
   const viewPath=out+`/${layout}-selected.mp4`,bytes=Buffer.from(identity.bytes);await writeFile(viewPath,bytes);
   const decoded=(file,map,format)=>execFileSync('ffmpeg',['-v','error','-i',file,'-map',map,...(format==='rawvideo'?['-pix_fmt','yuv420p','-fps_mode','passthrough']:[]),'-f',format,'-'],{maxBuffer:64*1024*1024});
   assert.ok(decoded(source,'0:0','rawvideo').equals(decoded(viewPath,'0:0','rawvideo')));assert.ok(decoded(source,'0:2','f32le').equals(decoded(viewPath,'0:1','f32le')));assert.equal(bytes.length,(await readFile(source)).length);
   result.cases.push({layout,name:'selected video and PCM exact; same file length; invalid selection and cancellation rejected',passed:true,sourceSHA256:createHash('sha256').update(await readFile(source)).digest('hex'),viewSHA256:createHash('sha256').update(bytes).digest('hex'),diagnostics:identity.diagnostics});await page.close();
   for(let pair=0;pair<Number(process.env.PAIRS??3);pair++)for(const route of pair%2?['view','remux']:['remux','view']){
    const p=await browser.newPage();if(route==='remux')await p.route('**/selected-mp4-view.js',r=>r.fulfill({contentType:'text/javascript',body:'export const selectedMP4View=async()=>null;'}));
    await p.goto(server.origin+'/experiment/page.html');
    const row=await p.evaluate(async url=>{
     const began=performance.now();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});
     const file=new File([await(await fetch(url)).arrayBuffer()],'source.mp4');await player.open(file);const startupMs=performance.now()-began;
     await player.selectTrack('audio','3');await player.play();
     const context=new AudioContext();await context.resume();const analyser=context.createAnalyser();analyser.fftSize=8192;const source=context.createMediaElementSource(player.surface);source.connect(analyser);analyser.connect(context.destination);
     await new Promise(r=>setTimeout(r,500));const spectrum=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(spectrum);const peak=spectrum.indexOf(Math.max(...spectrum))*context.sampleRate/analyser.fftSize;
     const start=performance.now();await player.seek(1);const seekMs=performance.now()-start;
     await new Promise((resolve,reject)=>{const end=performance.now()+10000;const check=()=>{if(player.surface.ended)resolve();else if(performance.now()>end)reject(Error('EOF timeout'));else setTimeout(check,25);};check();});
     const diagnostics=player.diagnostics,cleanupStart=performance.now();await player.destroy();await context.close();return {startupMs,seekMs,peakHz:peak,cleanupMs:performance.now()-cleanupStart,diagnostics};
    },server.origin+'/media/movie');
    assert.equal(!!row.diagnostics.backend.projection,route==='view');assert.ok(Math.abs(row.peakHz-880)<15,`wrong selected audio: ${row.peakHz}`);await p.waitForTimeout(100);assert.equal(p.workers().length,0);await p.close();result.measurements.push({layout,route,pair,...row});console.log('PASS',layout,route,pair);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
   }
  }finally{await server.close();}
 }
 const lifecycle=await serve({isolated:true,mediaPaths:{front:'results/full-completion/r59/two-front.mp4',tail:'results/full-completion/r59/two-tail.mp4'}});
 try{
  const page=await browser.newPage();await page.route('**/selected-mp4-view.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(' const began=performance.now();',' if(globalThis.__delayView){globalThis.__viewPending=true;await new Promise(r=>setTimeout(r,200));} const began=performance.now();')});});
  await page.goto(lifecycle.origin+'/experiment/page.html');
  await page.evaluate(async origin=>{
   const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});
   window.files=await Promise.all(['front','tail'].map(async name=>new File([await(await fetch(origin+'/media/'+name)).arrayBuffer()],name+'.mp4')));
   await player.open(files[0]);const old=player.surface;await player.open(files[1]);if(old.isConnected)throw Error('Retired view still attached');
   if(!player.diagnostics.backend.projection)throw Error('Projection route missing');window.__delayView=true;window.cancelled=player.open(files[0]).then(()=>false,()=>true);
  },lifecycle.origin);
  await page.waitForFunction(()=>window.__viewPending);assert.equal(await page.evaluate(async()=>{await player.close();return cancelled;}),true);
  await page.waitForTimeout(250);await page.evaluate(async()=>{if(player.current)throw Error('Stale view accepted after close');window.__delayView=false;await player.open(files[0]);await player.play();await player.destroy();});
  assert.equal(page.workers().length,0);await page.close();result.cases.push({name:'public source replacement, cancellation inside metadata adapter, stale completion, reopen and destroy',injectedMetadataBarrier:true,passed:true});
 }finally{await lifecycle.close();}
}finally{await browser.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out);}
