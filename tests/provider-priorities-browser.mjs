// SPDX-License-Identifier: Apache-2.0
// Focused priority qualification. Provider identity overrides are TEST ONLY.
import {firefox,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseProviderDeployment} from '../web/generated/internal/provider-catalog.js';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const root=process.cwd(),generated=path.resolve(process.env.PRIORITY_GENERATED??'build/provider-priority-browser-20261004/generated');
const out=path.resolve(process.env.PRIORITY_OUT??`results/provider-priorities/matrix-${Date.now()}`);
const packages=path.resolve(process.env.PRIORITY_PACKAGES??'build/bundle-ci-consumer/node_modules/@demuxe');
const sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
const report={started:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),generated,packages,scope:'Focused real playback. Candidate provider identities locally admitted, not release qualification. Source assets and compiled core are captured on first read and hashed.',cases:[],deployments:{},files:{},passed:false};
report.harnessSHA256=sha(await readFile(new URL(import.meta.url)));
const persist=()=>writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
const cache=new Map(),requests=[];
async function bytes(file){if(!cache.has(file)){const b=await readFile(file);cache.set(file,b);report.files[path.relative(root,file)]={bytes:b.length,sha256:sha(b)};}return cache.get(file);}
const coreInventory=JSON.parse(await readFile(path.resolve(packages,'../demuxe/license-map.json')));
const published=JSON.parse(await readFile('licensing/provider-runtime-qualification.json')).providers;
async function deployment(names){
 const files=new Map(),assets=new Map(),providers=[['browser-original','media.present.original','selected-source'],['browser-prepared','media.present.prepared','selected-streams'],['web-audio-gain','audio.gain','scalar']].map(([id,capability,profile])=>({id,implementationIdentity:'demuxe-browser-v1',technology:'browser-native',delivery:['browser','application-bundle'],applicationBuild:'priority-browser-test',offers:[{capability,version:1,profile}]}));
 for(const name of names){const base=packages+'/provider-'+name,m=JSON.parse(await bytes(base+'/provider-manifest.json'));
  const identity='sha256:'+sha(Buffer.from(JSON.stringify(m.artifacts,null,2)+'\n'));
  for(const p of m.provides)assert.equal(p.implementationIdentity,identity);
  for(const a of m.assets){let file=base+'/runtime/'+a.path,b=await bytes(file);assert.equal(b.length,a.bytes);assert.equal(sha(b),a.sha256);
   if(process.env.PRIORITY_CANDIDATE==='1'&&name==='mpv'&&['web/retained-decoder-worker.js','web/private-mpv/retained-decoder.js','web/external-video-decoder.js','web/filter-retained-engine-worker.js'].includes(a.path)){file=root+'/'+a.path;b=await bytes(file);a.bytes=b.length;a.sha256=sha(b);m.artifacts['runtime/'+a.path]=a.sha256;}
   if(process.env.PRIORITY_TRACE==='1'&&name==='mpv'&&a.path==='web/filter-retained-engine-worker.js'){let source=b.toString();source=source.replace('function receiveFrame(message){', 'function receiveFrame(message){\n if(presentation.received<60)console.log("priority-trace receive",JSON.stringify({pts:message.pts,timestamp:message.retainedFrame.timestamp,generation:message.generation,minFramePts,closingFrames,pendingTarget,frameGeneration}));');source=source.replace('const key=Math.round(engine._web_selected_pts()*1e6);minFramePts=', 'const key=Math.round(engine._web_selected_pts()*1e6);if(presentation.drawn<60)console.log("priority-trace select",JSON.stringify({key,serial,keys:[...frames.keys()],pending:[...pendingFrames.keys()],held:heldFrame?.timestamp}));minFramePts=');source=source.replace('presentation.missing++;throw Error', 'presentation.missing++;console.log("priority-trace missing",JSON.stringify({pts,keys:[...frames.keys()],pending:[...pendingFrames.keys()],decoderStats,presentation}));throw Error');b=Buffer.from(source);file=out+'/instrumented/'+name+'/'+a.path;await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);a.bytes=b.length;a.sha256=sha(b);m.artifacts['runtime/'+a.path]=a.sha256;
   }
   if(process.env.PRIORITY_REORDER==='2'&&name==='mpv'&&a.path==='web/retained-decoder-worker.js'){
    const source=b.toString().replace('if(queue.length){\n     const frame=queue.shift();','if(queue.length&&(draining||queue.length>2)){\n     queue.sort((a,b)=>a.timestamp-b.timestamp);const frame=queue.shift();');assert.notEqual(source,b.toString());b=Buffer.from(source);file=out+'/instrumented/'+name+'/'+a.path;await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);a.bytes=b.length;a.sha256=sha(b);m.artifacts['runtime/'+a.path]=a.sha256;
   }
   if(assets.has(a.id))assert.deepEqual(assets.get(a.id),a);assets.set(a.id,a);files.set(a.path,file);}
  if(process.env.PRIORITY_CANDIDATE==='1'&&name==='mpv'){
   for(const helper of ['video-frame-order','legacy-decoder-worker','private-retained-decoder','legacy-playback-worker','legacy-retained-presentation']){
    const file=generated+'/internal/machine/'+helper+'.js',b=await bytes(file),id='web/generated/internal/machine/'+helper+'.js';
    const a={id,path:id,bytes:b.length,sha256:sha(b),dependencies:['legacy-decoder-worker','private-retained-decoder'].includes(helper)?['web/generated/internal/machine/video-frame-order.js']:[]};assets.set(id,a);files.set(id,file);m.artifacts['runtime/'+id]=a.sha256;
    const worker=helper==='legacy-playback-worker'||helper==='legacy-retained-presentation'?'web/filter-retained-engine-worker.js':helper==='private-retained-decoder'?'web/private-mpv/retained-decoder.js':'web/retained-decoder-worker.js';const owner=assets.get(worker);if(!owner.dependencies.includes(id))owner.dependencies.push(id);
   }
   m.artifacts=Object.fromEntries(Object.entries(m.artifacts).sort(([a],[b])=>a<b?-1:a>b?1:0));
  }
  const candidate='sha256:'+sha(Buffer.from(JSON.stringify(m.artifacts,null,2)+'\n'));for(const p of m.provides)providers.push({...p,implementationIdentity:candidate});
 }
 const identities=Object.fromEntries(providers.map(p=>[p.id,p.implementationIdentity]));
 const manifest=Buffer.from(JSON.stringify({schema:1,providerContractVersion:1,revision:'priority-browser-test',providers,assets:[...assets.values()]}));
 const parsed=parseProviderDeployment(JSON.parse(manifest),new URL('http://localhost/test/'));for(const p of parsed.catalog.providers){const ids=parsed.providerAssets[p.id];if(!ids.length)continue;const artifacts=Object.fromEntries(ids.map(id=>{const a=parsed.assets.find(a=>a.id===id);return ['runtime/'+a.url.slice('http://localhost/test/'.length),a.sha256];}).sort(([a],[b])=>a<b?-1:a>b?1:0));assert.equal('sha256:'+sha(Buffer.from(JSON.stringify(artifacts,null,2)+'\n')),p.implementationIdentity);}
 return {files,manifest,identities,unpublished:providers.filter(p=>published[p.id]!==p.implementationIdentity).map(p=>p.id)};
}
const deployments={
 absent:await deployment(['ffmpeg-asyncify']),
 incompatible:await deployment(['ffmpeg-truehd-mlp-jspi','ffmpeg-ac3-eac3-asyncify']),
 inspector:await deployment(['mpv','ffmpeg-ac3-eac3-asyncify']),
 outputFallback:await deployment(['mpv','ffmpeg-truehd-mlp-jspi','ffmpeg-ac3-eac3-asyncify']),
};
for(const [id,d]of Object.entries(deployments)){report.deployments[id]={identities:d.identities,testOnlyAdmissions:d.unpublished,manifestSHA256:sha(d.manifest)};await writeFile(out+'/'+id+'-providers.json',d.manifest);}
const cases=[
 {name:'software-first',deployment:'source',providers:['mpv-software','mpv-hybrid'],expectedMode:'software'},
 {name:'hybrid-first',deployment:'source',providers:['mpv-hybrid','mpv-software'],expectedMode:'hybrid'},
 {name:'unknown-provider-fallback',deployment:'source',providers:['not-installed','mpv-software','mpv-hybrid'],expectedMode:'software'},
 {name:'software-recovery',deployment:'source',providers:['mpv-software','mpv-hybrid'],expectedMode:'software',recover:true},
 {name:'explicit-mode-pin',deployment:'source',providers:['mpv-software','mpv-hybrid'],options:{mode:'hybrid'},expectedMode:'hybrid'},
 {name:'asyncify-preferred',deployment:'source',providers:['mpv-playback-asyncify','mpv-playback-jspi'],options:{remuxRuntime:'auto'},expectedRuntime:'asyncify'},
 {name:'explicit-runtime-pin',deployment:'source',providers:['mpv-playback-asyncify','mpv-playback-jspi'],options:{mode:'software',remuxRuntime:'jspi'},expectedRuntime:'jspi',requiresJSPI:true},
 {name:'modular-absent-preferred',deployment:'absent',capability:'media.prepare.file',providers:['ffmpeg-file-preparation-jspi','ffmpeg-file-preparation-asyncify'],options:{nativeRemux:'always',remuxRuntime:'auto'},fixture:'example.mp4',expectedMode:'native',expectedRuntime:'asyncify'},
 {name:'modular-incompatible-slice',deployment:'incompatible',capability:'media.prepare.file',providers:['ffmpeg-truehd-mlp-jspi','ffmpeg-ac3-eac3-asyncify'],options:{nativeRemux:'always',remuxRuntime:'auto'},fixture:'ac3-2.mkv',expectedMode:'native',expectedRuntime:'asyncify',expectedProvider:'ffmpeg-ac3-eac3-asyncify',outputMime:'video/mp4; codecs="avc1.4d400a,flac"'},
 {name:'modular-missing-inspector',deployment:'inspector',providers:['mpv-playback-jspi','mpv-playback-asyncify'],options:{mode:'software',remuxRuntime:'auto'},expectedMode:'software',expectedRuntime:'asyncify'},
];
cases.push({name:'modular-output-fallback',deployment:'outputFallback',capability:'media.prepare.file',providers:['ffmpeg-truehd-mlp-jspi','ffmpeg-ac3-eac3-asyncify'],options:{nativeRemux:'always',remuxRuntime:'auto'},fixture:'ac3-2.mkv',expectedRuntime:'asyncify',verifyOutputFallback:true});
cases.push({...cases.find(c=>c.name==='modular-output-fallback'),name:'modular-output-baseline',noPreferences:true,options:{nativeRemux:'always',remuxRuntime:'asyncify'}});
cases.push({name:'source-ac3-hybrid',deployment:'source',providers:['mpv-hybrid'],noPreferences:true,options:{mode:'hybrid',remuxRuntime:'off'},fixture:'ac3-2.mkv',expectedMode:'hybrid'});
if(process.env.PRIORITY_ORDER_MATRIX==='1')for(const fixture of ['h264-no-b.mkv','h264-deep-b.mkv','h264-no-vui.mkv'])cases.push({name:'source-'+fixture,deployment:'source',providers:['mpv-hybrid'],options:{mode:'hybrid',remuxRuntime:'off'},fixture,expectedMode:'hybrid'});
cases.push({name:'source-ac3-private',deployment:'source',providers:['mpv-hybrid'],options:{mode:'hybrid',remuxRuntime:'asyncify'},fixture:'ac3-2.mkv',expectedMode:'hybrid',expectedRuntime:'asyncify'});
if(process.env.PRIORITY_ORDER_MATRIX==='1')cases.push({name:'source-no-vui-private',deployment:'source',providers:['mpv-hybrid'],options:{mode:'hybrid',remuxRuntime:'asyncify'},fixture:'h264-no-vui.mkv',expectedMode:'hybrid',expectedRuntime:'asyncify'});
const html=`<!doctype html><meta charset="utf-8"><title>Provider priority browser checks</title><button id="run">Run selected case</button><div id="host" style="width:640px;height:360px"></div><pre id="result"></pre><script type="module">
window.cases=${JSON.stringify(cases)};window.ready=false;window.playbackErrors=[];
window.sample=()=>{const d=p.diagnostics,b=d.backend;return {mode:p.state.activeMode,status:p.state.status,time:p.state.currentTime,plan:d.plan?.id,runtime:d.remuxRuntime,watchdogs:d.watchdogs,rendered:b?.rendered,position:b?.position??b?.presentedPosition,audio:p.audioDiagnostics?.(),capability:b?.capability,attempts:d.selection?.attempts,errors:window.playbackErrors,backendError:d.backend?.error,codecProvider:p.providerRuntime?.preparation?.(window.testFile,d.remuxRuntime.runtime)?.providerId};};
window.start=async()=>{const c=window.selected;window.testState={phase:'opening'};try{if(window.p)await p.destroy();document.querySelector('#host').replaceChildren();const base=location.origin+'/'+c.deployment+'/';const {Player}=await import(base+'web/generated/index.js');window.p=new Player(document.querySelector('#host'),{assetBase:base,preview:false,watchdogs:${process.env.PRIORITY_WATCHDOGS==='1'},remuxRuntime:'off',nativeRemux:'never',experimentalMpvSubtitles:false,providerPreferences:c.noPreferences?undefined:[{capability:c.capability??'media.play.complete',providers:c.providers}],...c.options});window.playbackErrors=[];p.addEventListener('error',e=>playbackErrors.push({message:e.detail?.message??String(e.detail),code:e.detail?.code}));window.initialRuntime=p.diagnostics.remuxRuntime;window.testFile=new File([await(await fetch('/fixture/'+(c.fixture??'m0.mkv'))).blob()],c.fixture??'m0.mkv');await p.open(testFile);await p.play();testState.phase='ready';}catch(e){testState={phase:'error',error:String(e),code:e.code,stack:e.stack};}document.querySelector('#result').textContent=JSON.stringify({state:testState,sample:window.p?sample():null},null,2);};
document.querySelector('#run').onclick=()=>void start();window.ready=true;
</script>`;
const types={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.ttf':'font/ttf','.mp4':'video/mp4','.mkv':'video/x-matroska'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);requests.push(pathname);
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Cache-Control','no-store');
 try{let b,mime;
 if(pathname==='/'){b=Buffer.from(html);mime='text/html';}
 else if(pathname.startsWith('/fixture/')){const name=path.basename(pathname);b=await bytes(path.resolve(root,name==='ac3-2.mkv'?'build/codec-expansion/ac3-fullfile/ac3-2.mkv':['h264-no-b.mkv','h264-deep-b.mkv','h264-no-vui.mkv'].includes(name)?'build/retained-order-candidate/'+name:'fixtures/'+name));}
 else {const [,id,...parts]=pathname.split('/'),name=parts.join('/');if(parts.includes('..'))throw Error('path');const dep=deployments[id];
  if(dep&&name==='demuxe-providers.json')b=dep.manifest;
  else if(dep&&name==='web/generated/internal/provider-build.js')b=Buffer.from('export const providerDeploymentEnabled=true;export const bundledShakaIncluded=false;export const qualifiedProviderIdentities='+JSON.stringify(dep.identities)+';');
  else if(name.startsWith('web/generated/'))b=await bytes(path.join(generated,name.slice('web/generated/'.length)));
  else if(dep){const file=dep.files.get(name);if(file)b=await bytes(file);else if(name==='fixtures/DejaVuSans.ttf'||coreInventory[name]?.length===1&&coreInventory[name][0]==='Apache-2.0')b=await bytes(root+'/'+name);else throw Error('Absent deployment asset '+name);}
  else if(id==='source'&&(name.startsWith('web/')||name==='fixtures/DejaVuSans.ttf'))b=await bytes(root+'/'+name);
  else throw Error('route');
 }
 mime??=types[path.extname(pathname)]??'application/octet-stream';res.setHeader('Content-Type',mime);res.setHeader('Accept-Ranges','bytes');let status=200;
 if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m)throw Error('range');const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),b.length-1):b.length-1;if(start>end){res.writeHead(416).end();return;}res.setHeader('Content-Range',`bytes ${start}-${end}/${b.length}`);b=b.subarray(start,end+1);status=206;}
 res.setHeader('Content-Length',b.length);res.writeHead(status).end(req.method==='HEAD'?undefined:b);
 }catch(e){res.writeHead(404).end(String(e));}
});
await new Promise(r=>server.listen(Number(process.env.PORT??0),'127.0.0.1',r));report.origin='http://127.0.0.1:'+server.address().port;console.log(JSON.stringify({origin:report.origin,out}));await persist();
if(process.env.PRIORITY_SERVE_ONLY==='1'){process.on('SIGTERM',()=>{server.close();void persist().then(()=>process.exit());});}
else{
 report.expectedCases=(process.env.PRIORITY_BROWSER?1:2)*cases.filter(c=>!process.env.PRIORITY_CASE||c.name.includes(process.env.PRIORITY_CASE)).length;report.teardown={};
 assert.ok(!process.env.PRIORITY_BROWSER||['firefox','webkit'].includes(process.env.PRIORITY_BROWSER));
 try{for(const [family,engine]of [['firefox',firefox],['webkit',webkit]]){
  if(process.env.PRIORITY_BROWSER&&process.env.PRIORITY_BROWSER!==family)continue;
  let browser;try{browser=await engine.launch({headless:true});
   for(const c of cases){if(process.env.PRIORITY_CASE&&!c.name.includes(process.env.PRIORITY_CASE))continue;
    const row={browser:family,version:browser.version(),case:c.name,passed:false};report.cases.push(row);let page;
    try{page=await browser.newPage();page.setDefaultTimeout(45000);row.console=[];page.on('console',m=>{if(m.text().includes('priority-trace'))row.console.push(m.text());});row.errors=[];page.on('pageerror',e=>row.errors.push(String(e)));await page.goto(report.origin);await page.waitForFunction(()=>window.ready);
     row.environment=await page.evaluate(()=>({ua:navigator.userAgent,isolated:crossOriginIsolated,jspi:typeof WebAssembly.Suspending==='function'}));await page.evaluate(c=>window.selected=c,c);if(c.outputMime)row.outputSupported=await page.evaluate(mime=>MediaSource.isTypeSupported(mime),c.outputMime);const requestStart=requests.length;
     await page.locator('#run').click();await page.waitForFunction(()=>['ready','error'].includes(window.testState?.phase));row.state=await page.evaluate(()=>testState);
     if(c.requiresJSPI&&!row.environment.jspi){assert.equal(row.state.phase,'error');assert.equal(row.state.code,'UNSUPPORTED_FEATURE');row.unsupportedPinRejected=true;row.passed=true;}
     else if(c.outputMime&&!row.outputSupported){
      assert.equal(row.state.phase,'error');assert.equal(row.state.code,'DEPLOYMENT_UNAVAILABLE');row.rejection=await page.evaluate(()=>sample());assert.equal(row.rejection.runtime.runtime,c.expectedRuntime);assert.equal(row.rejection.codecProvider,c.expectedProvider);assert.ok(row.rejection.attempts.some(a=>a.reason.startsWith('native-transcode: Browser isTypeSupported rejects')));row.outcome='unsupported-output-correctly-rejected';row.passed=true;
     }
     else{row.outcome='playback';assert.equal(row.state.phase,'ready',JSON.stringify(row.state));await page.waitForFunction(()=>p.state.status==='error'||p.state.currentTime>.7&&p.diagnostics.backend?.rendered>5);assert.notEqual(await page.evaluate(()=>p.state.status),'error',JSON.stringify(await page.evaluate(()=>sample())));row.initial=await page.evaluate(()=>sample());row.constructorRuntime=await page.evaluate(()=>initialRuntime);
      if(c.expectedMode)assert.equal(row.initial.mode,c.expectedMode);if(c.expectedRuntime)assert.equal(row.initial.runtime.runtime,c.expectedRuntime);if(c.expectedProvider)assert.equal(row.initial.codecProvider,c.expectedProvider);
      if(c.verifyOutputFallback&&family==='webkit'){assert.notEqual(row.initial.mode,'native');assert.ok(row.initial.attempts.some(a=>a.reason.startsWith('native-transcode: Browser isTypeSupported rejects')));}
      const before=row.initial;await page.waitForFunction(before=>p.state.currentTime>before.time+.5&&p.diagnostics.backend.rendered>before.rendered+3,before);row.progress=await page.evaluate(()=>sample());
      if(process.env.PRIORITY_TRANSPORT==='1'){
       await page.evaluate(()=>p.pause());await page.waitForFunction(()=>p.state.status==='paused');row.paused=await page.evaluate(()=>sample());
       const capture=async label=>{const value=await page.evaluate(async()=>{const s=await p.snapshot(),b=await createImageBitmap(s.blob),canvas=document.createElement('canvas');canvas.width=b.width;canvas.height=b.height;const ctx=canvas.getContext('2d');ctx.drawImage(b,0,0);b.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add((pixels[i]>>4)*256+(pixels[i+1]>>4)*16+(pixels[i+2]>>4));return {width:s.width,height:s.height,time:s.mediaTime,colors:colors.size,bytes:Array.from(new Uint8Array(await s.blob.arrayBuffer()))};});const data=Buffer.from(value.bytes);delete value.bytes;value.sha256=sha(data);assert.ok(value.width>0&&value.height>0&&value.colors>12);await writeFile(out+'/'+family+'-'+c.name+'-'+label+'.png',data);return value;};
       await page.evaluate(()=>p.seek(5));await page.waitForFunction(()=>Math.abs(p.state.currentTime-5)<.3);row.forward=await page.evaluate(()=>sample());row.forwardImage=await capture('forward');
       await page.evaluate(()=>p.seek(1));await page.waitForFunction(()=>Math.abs(p.state.currentTime-1)<.3);row.backward=await page.evaluate(()=>sample());row.backwardImage=await capture('backward');assert.notEqual(row.forwardImage.sha256,row.backwardImage.sha256);
       await page.evaluate(()=>p.play());await page.waitForFunction(()=>p.state.status==='playing'&&p.state.currentTime>1.7);row.resumed=await page.evaluate(()=>sample());
      }
      if(process.env.PRIORITY_EOF==='1'){await page.waitForFunction(()=>p.state.status==='ended');row.eof=await page.evaluate(()=>sample());assert.ok(row.eof.time>7.5&&row.eof.rendered>(process.env.PRIORITY_TRANSPORT==='1'?80:150));assert.deepEqual(row.eof.errors,[]);
       if(process.env.PRIORITY_TRANSPORT==='1'){await page.evaluate(()=>start());await page.waitForFunction(()=>testState.phase==='ready'&&p.state.currentTime>1&&p.diagnostics.backend?.rendered>10);row.reopened=await page.evaluate(()=>sample());assert.deepEqual(row.reopened.errors,[]);}}
      if(c.recover){await page.evaluate(async()=>{const {PlayerError}=await import('/source/web/generated/internal/errors.js');p.recordSessionFault(p.current,new PlayerError('DECODE_FAILED','injected priority regression fault'));p.recover(p.current);await p.queue;});await page.waitForFunction(()=>p.state.activeMode==='hybrid'&&p.state.status==='playing');row.recovered=await page.evaluate(()=>sample());assert.ok(row.recovered.attempts.some(a=>a.mode==='software'&&a.reason.includes('cached compatibility rejection')));await page.waitForFunction(b=>p.state.currentTime>b.time+.5&&p.diagnostics.backend.rendered>b.rendered+3,row.recovered);row.recoveryProgress=await page.evaluate(()=>sample());}
      row.passed=true;
     }
     assert.deepEqual(row.errors,[]);row.requests=requests.slice(requestStart);await page.screenshot({path:out+'/'+family+'-'+c.name+'.png'});
    }catch(e){row.passed=false;row.error=String(e);if(page)row.diagnostic=await page.evaluate(()=>({state:window.testState,sample:window.p?sample():null})).catch(()=>null);}
    finally{if(page){await page.evaluate(()=>window.p?.destroy()).catch(e=>{row.cleanupError=String(e);row.passed=false;});await page.close();}console.log(family,c.name,row.passed?'PASS':'FAIL',row.error??'');await persist();}
   }
  }finally{if(browser)report.teardown[family]=await closeTestBrowser(browser,family);}
 }}catch(e){report.fatalError=String(e);throw e;}finally{server.close();report.finished=new Date().toISOString();report.passed=!report.fatalError&&report.cases.length===report.expectedCases&&report.cases.length>0&&report.cases.every(c=>c.passed);await persist();if(!report.passed)process.exitCode=1;}
}
