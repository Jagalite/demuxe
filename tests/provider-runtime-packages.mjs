// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',root=process.cwd(),work=path.join(root,'build/runtime-provider-consumer',family+'-'+Date.now());
const folders=[process.env.CORE_PACKAGE??'player-core-review-fixes','provider-ffmpeg-jspi-complete','provider-ffmpeg-asyncify-complete','provider-ffmpeg-complete','provider-mpv-complete'];
const archives=await Promise.all(folders.map(async f=>{const a=JSON.parse(await readFile('build/media-components/'+f+'/assembly.json','utf8'));a.archive=path.resolve(a.archive);return a;}));
await mkdir(work,{recursive:true});await writeFile(path.join(work,'package.json'),JSON.stringify({name:'runtime-provider-consumer',private:true,type:'module',version:'1.0.0'}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false',...archives.map(a=>a.archive)],{cwd:work,stdio:'pipe'});
for(const [name,providers]of Object.entries({jspi:['ffmpeg-jspi'],asyncify:['ffmpeg-asyncify'],both:['ffmpeg-jspi','ffmpeg-asyncify'],all:['ffmpeg','ffmpeg-jspi','ffmpeg-asyncify','mpv'],mpv:['mpv'],core:[]}))execFileSync('python3',['scripts/deploy-providers.py','--core',path.join(work,'node_modules/demuxe'),...providers.flatMap(p=>['--provider',path.join(work,'node_modules/@demuxe/provider-'+p)]),'--output',path.join(work,name)],{stdio:'pipe'});
execFileSync('ffmpeg',['-v','error','-i','fixtures/example.mp4','-t','4','-map','0:v:0','-map','0:a:0','-c','copy',path.join(work,'copy.ts')]);
execFileSync('ffmpeg',['-v','error','-i','fixtures/example.mp4','-t','4','-map','0:v:0','-map','0:a:0','-c:v','copy','-c:a','ac3',path.join(work,'ac3.mkv')]);
const requests=[];let active='';
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname.slice(1);requests.push({case:active,path:url.pathname});
 if(name||url.searchParams.get('isolation')==='on'){res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');}
 res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
 if(!name){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><div id="host" style="width:320px;height:180px"></div>');return;}
 const file=name==='example.mp4'?path.join(root,'fixtures/example.mp4'):path.resolve(work,name);
 if(name!=='example.mp4'&&!file.startsWith(work+path.sep)){res.writeHead(403).end();return;}
 try{const data=await readFile(file);res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const result={family,work,archives,cases:[],passed:false};
try{
 browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0}}:{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']})});result.browser=browser.version();
 const cases=[];for(const runtime of ['jspi','asyncify'])for(const profile of ['copy','repair'])cases.push({id:runtime+'-'+profile,deployment:runtime,runtime,fixture:profile==='copy'?'copy.ts':'ac3.mkv',options:profile==='copy'?{mode:'native',nativeRemux:'always'}:{},plan:profile==='copy'?'native-remux':'native-transcode'});
 cases.push({id:'asyncify-only-auto',deployment:'asyncify',fixture:'copy.ts',options:{mode:'native',nativeRemux:'always'},plan:'native-remux'},
 {id:'both-auto',deployment:'both',fixture:'copy.ts',options:{mode:'native',nativeRemux:'always'},plan:'native-remux'},
 {id:'native-without-runtimes',deployment:'core',fixture:'example.mp4',options:{mode:'native',nativeRemux:'never'},plan:'native-direct'},
 {id:'missing-private-fallback',deployment:'mpv',runtime:'asyncify',fixture:'copy.ts',options:{nativeRemux:'always'},plan:'hybrid',isolated:true},
 {id:'all-pthread',deployment:'all',runtime:'off',fixture:'copy.ts',options:{mode:'native',nativeRemux:'always'},plan:'native-remux',isolated:true});
 for(const c of cases.filter(c=>!process.env.CASE||c.id===process.env.CASE)){
  active=c.id;const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/?isolation=${c.isolated?'on':'off'}`);await page.locator('#start').click();
  page.on('console',m=>console.log(c.id,m.type(),m.text()));
  const sample=await page.evaluate(async c=>{
   const {Player}=await import('/'+c.deployment+'/dist/index.js');let p,source,audio,analyser;
   const jspi=typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function';
   try{
    p=new Player(document.querySelector('#host'),{...c.options,...(c.runtime?{remuxRuntime:c.runtime}:{}),assetBase:'/'+c.deployment+'/'});
    await p.open(new File([await(await fetch('/'+c.fixture)).arrayBuffer()],c.fixture));
    audio=new AudioContext();analyser=audio.createAnalyser();analyser.connect(audio.destination);await audio.resume();const sources=new Map();
    const observeSurface=()=>{if(p.surface instanceof HTMLVideoElement&&source?.mediaElement!==p.surface){source?.disconnect();source=sources.get(p.surface);if(!source){source=audio.createMediaElementSource(p.surface);sources.set(p.surface,source);}source.connect(analyser);}};observeSurface();
    await p.play();let audioPeak=0;const data=analyser?new Float32Array(analyser.fftSize):undefined,started=performance.now(),end=started+15000;
    while((p.state.currentTime<0.5||performance.now()-started<600)&&performance.now()<end){observeSurface();if(analyser){analyser.getFloatTimeDomainData(data);for(const n of data)audioPeak=Math.max(audioPeak,Math.abs(n));}await new Promise(r=>setTimeout(r,20));}
    const cv=document.createElement('canvas');cv.width=160;cv.height=90;const cx=cv.getContext('2d');cx.drawImage(p.surface,0,0,160,90);const nonblack=cx.getImageData(0,0,160,90).data.some((n,i)=>i%4!==3&&n>60);
    const outputState={muted:p.surface.muted,volume:p.surface.volume,paused:p.surface.paused,audioContext:audio?.state,sourceMatches:source?.mediaElement===p.surface,src:p.surface.currentSrc};const time=p.state.currentTime;await p.seek(2);const seek=p.state.currentTime;
    return {outputState,jspi,plan:p.diagnostics.plan?.id,diagnostics:p.diagnostics,time,seek,nonblack,audioPeak,isolated:crossOriginIsolated};
   }catch(error){return {jspi,code:error.code,message:String(error),diagnostics:p?.diagnostics};}
   finally{source?.disconnect();analyser?.disconnect();await audio?.close();await p?.destroy();}
  },c);
  result.cases.push({id:c.id,...sample});console.log(c.id,JSON.stringify({plan:sample.plan,code:sample.code,message:sample.message,nonblack:sample.nonblack}));
  if(c.runtime==='jspi'&&!sample.jspi){assert.equal(sample.code,'UNSUPPORTED_FEATURE');assert.ok(!requests.some(r=>r.case===c.id&&r.path.endsWith('.wasm')));}
  else{assert.equal(sample.plan,c.plan,JSON.stringify(sample));assert.ok(sample.time>=0.5);assert.equal(sample.nonblack,true);assert.ok(Math.abs(sample.seek-2)<0.3);if(c.plan!=='hybrid')assert.ok(sample.audioPeak>0.001);}
  if(c.id==='native-without-runtimes')assert.ok(!requests.some(r=>r.case===c.id&&r.path.endsWith('.wasm')));
  await page.close();
 }
 result.passed=true;
}finally{if(browser)result.cleanup=await closeTestBrowser(browser,family);server.closeAllConnections();await new Promise(r=>server.close(r));result.requests=requests;await mkdir('results/media-components/runtime-packages',{recursive:true});await writeFile(`results/media-components/runtime-packages/${family}.json`,JSON.stringify(result,null,2)+'\n');}
