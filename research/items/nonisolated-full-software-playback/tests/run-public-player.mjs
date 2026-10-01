// SPDX-License-Identifier: MIT
// Maintained private Backend controls and pictures; no CPU measurements.
import http from 'node:http';
import path from 'node:path';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium, firefox} from 'playwright';
const [assetsArg, referencesArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw Error('Usage: node run-public-player.mjs ENGINE_ASSET_ROOT REFERENCES FRESH_OUTPUT');
const root = path.resolve(import.meta.dirname, '../../../..'), assets = path.resolve(assetsArg), references = path.resolve(referencesArg), output = path.resolve(outputArg);
await mkdir(output, {recursive: false});await mkdir(path.join(output, 'sources'));
await writeFile(path.join(output, 'sources/run-public-player.mjs'), await readFile(import.meta.filename));
const rows = JSON.parse(await readFile(path.join(references, 'references.json'))).rows.filter(row => !process.env.PLAYBACK_ROW || row.profile.key === process.env.PLAYBACK_ROW);
if (!rows.length || !process.env.PLAYBACK_INSTALLED_ROOT) throw Error('Installed playback assets and matching fixtures required');
const files = new Map(), hashes = {}, report = {scope: 'Public Player non-isolated Software qualification', startedAt: new Date().toISOString(), command: process.argv, environment: {runtime: process.env.PLAYBACK_RUNTIME ?? 'jspi', installedRoot: process.env.PLAYBACK_INSTALLED_ROOT, browser: process.env.PLAYBACK_BROWSER ?? 'chrome', row: process.env.PLAYBACK_ROW, negativeOnly:process.env.PLAYBACK_NEGATIVE_ONLY==='1'}, cases: [], sourceSHA256: hashes};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const snapshots=[];
const heldReads={started:0,active:0,aborted:0};report.heldReads=heldReads;
report.rangeRequests = [];
const server = http.createServer(async (req, res) => {

  try {
    if (req.url === '/') {res.setHeader('Content-Type', 'text/html');res.end('<!doctype html><canvas width="320" height="180"></canvas>');return;}
    const url = new URL(req.url, 'http://localhost');
    const rangeMode = url.searchParams.get('range');
    if (rangeMode) {
      report.rangeRequests.push({mode: rangeMode, range: req.headers.range, authorized: req.headers.authorization === 'Bearer refreshed'});
      if(rangeMode==='held'){
        heldReads.started++;heldReads.active++;
        await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);heldReads.active--;resolve();};const timer=setTimeout(finish,15000);res.once('close',()=>{heldReads.aborted++;finish();});});
        if(res.destroyed)return;
      }
      if (rangeMode === 'authorized' && req.headers.authorization !== 'Bearer refreshed') {res.writeHead(401).end();return;}
      if (rangeMode === 'blocked') {res.writeHead(403).end();return;}
    }
    let file;
    if (url.pathname.startsWith('/fixture/')) file = rows.find(row => row.profile.key === url.pathname.slice(9))?.profile.fixture;
    else {
      const relative = url.pathname.replace(/^\//, '');
      if (!relative.startsWith('web/') && !relative.startsWith('fixtures/')) throw Error('Unknown asset');
      const base = relative.startsWith('web/engine-mpv-playback-') ? path.resolve(process.env.PLAYBACK_INSTALLED_ROOT) : relative.startsWith('web/engine-') || relative.startsWith('fixtures/') ? assets : root;
      file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) throw Error('Invalid asset path');
    }
    if (!file) {res.writeHead(404).end();return;}
    if (!files.has(file)) {
      const bytes = await readFile(file);files.set(file, bytes);hashes[file] = {sha256: hash(bytes), bytes: bytes.length};
      if (file.startsWith(root + '/web/') && /\.m?js$/.test(file)) {
        const target = path.join(output, 'sources', file.slice(root.length + 1));
        snapshots.push((async()=>{await mkdir(path.dirname(target), {recursive: true});await writeFile(target, bytes);})());
      }
    }
    res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : /\.m?js$/.test(file) ? 'text/javascript' : 'application/octet-stream');
    if (rangeMode) {
      const bytes=files.get(file), match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '');
      if (!match) {res.writeHead(400).end();return;}
      const start=Number(match[1]),end=Math.min(Number(match[2]),bytes.length-1);
      if(start>=bytes.length){res.writeHead(416,{'Content-Range':'bytes */'+bytes.length}).end();return;}
      res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1,'ETag':'"private-backend-fixture"'});res.end(bytes.subarray(start,end+1));return;
    }
    res.end(files.get(file));
  } catch (error) {res.writeHead(404).end(String(error));}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const save = () => writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
try {
 for(const {profile} of rows){
 const browser=process.env.PLAYBACK_BROWSER==='firefox'?await firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.block-webaudio':false}}):await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try {
  const row={key:profile.key,passed:false};report.cases.push(row);
  let acquisitionTimer;const page=await Promise.race([browser.newPage(),new Promise((_,reject)=>{acquisitionTimer=setTimeout(()=>reject(Error('Browser page creation deadline')),30000);})]).finally(()=>clearTimeout(acquisitionTimer));page.setDefaultTimeout(30000);
  page.on('console',m=>console.log(m.text()));page.on('pageerror',e=>console.log(String(e)));
  const deadline=setTimeout(()=>void page.close(),150000);
  try {
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.evaluate(async ({profile,runtime})=>{
    const {Player}=await import('/web/generated/index.js');
    const container=document.createElement('div');document.body.replaceChildren(container);
    window.failures=[];window.player=new Player(container,{mode:'software',remuxRuntime:runtime,softwarePresenter:'rgb',width:profile.width,height:profile.height,assetBase:new URL('/',location.href).href});
    player.addEventListener('error',e=>failures.push(e.detail));
    console.log('public:prepare');window.preparation=await player.prepare(['inspector','software']);
    console.log('public:open');window.file=new File([await(await fetch('/fixture/'+profile.key)).blob()],profile.key);
    await player.open(file);console.log('public:opened');
   },{profile,runtime:process.env.PLAYBACK_RUNTIME??'jspi'});
   row.initial=await page.evaluate(()=>({isolated:crossOriginIsolated,state:player.state,diagnostics:player.diagnostics,preparation,failures}));
   if(row.initial.isolated||row.initial.diagnostics.plan.id!=='software-private'||row.initial.state.activeMode!=='software'||row.initial.preparation.assets.some(a=>a.status!=='ready'))throw Error('Public route/preparation mismatch');
   row.pictures=[];const ref=await readFile(path.join(references,profile.key,'reference.rgb'));
   for(const target of [.5,1.5,2.5]){
    await page.evaluate(target=>player.seek(target),target);
    const rgba=await page.evaluate(async()=>{
     const source=player.surface,image=await createImageBitmap(await(await fetch(source.toDataURL())).blob());
     const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
     const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();return Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data);
    });
    const rgb=Buffer.alloc(profile.width*profile.height*3);for(let i=0;i<rgb.length;i++)rgb[i]=rgba[Math.floor(i/3)*4+i%3];
    let best={mae:Infinity};for(let frame=Math.max(0,Math.floor((target-1)*profile.fps));frame<=Math.ceil((target+1)*profile.fps);frame++){
     let sum=0;for(let i=0;i<rgb.length;i++)sum+=Math.abs(rgb[i]-ref[frame*rgb.length+i]);const mae=sum/rgb.length;if(mae<best.mae)best={mae,time:frame/profile.fps};
    }
    row.pictures.push({target,...best});if(!(best.mae<5&&Math.abs(best.time-target)<=1/profile.fps+.001))throw Error('Public seek picture mismatch');
   }
   row.controls=await page.evaluate(async()=>{
    await player.seek(0);await player.play();await new Promise(r=>setTimeout(r,1200));await player.pause();const advanced=player.state.currentTime;
    await player.rate(1.25);await player.volume(35);await player.setAudioGain(.4);await player.setAudioDelay(.025);
    await player.seek(1.5);await player.open(file);await player.seek(2.5);
    const state=player.state,diagnostics=player.diagnostics;
    let filterError;try{await player.setVideoFilters('hflip');}catch(e){filterError=String(e);}
    await player.seek(.5);const recovered=player.state.currentTime;
    const context=player.current.backend.context;await player.play();await context.suspend();await new Promise(r=>setTimeout(r,250));const suspended=player.diagnostics.backend.audio.header[6];
    await context.resume();await new Promise(r=>setTimeout(r,500));const resumed=player.diagnostics.backend.audio.header[6];await player.pause();
    const backend=player.current.backend;await player.destroy();return {advanced,state,diagnostics,filterError,recovered,suspended,resumed,context:backend.audioDiagnostics().state,cleanup:backend.diagnostics.cleanup};
   });
   const c=row.controls;if(c.advanced<.8||c.state.playbackRate!==1.25||Math.abs(c.state.volume-.35)>.001||c.diagnostics.audioGain!==.4||!c.filterError||Math.abs(c.recovered-.5)>.15||c.suspended!==0||c.resumed!==1||c.context!=='closed'||c.cleanup.scheduler.liveTasks||c.cleanup.scheduler.freeSlots!==24)throw Error('Public control/restoration/cleanup mismatch');
   for(let i=0;i<30&&page.workers().length;i++)await page.waitForTimeout(50);if(page.workers().length)throw Error('Public worker leak');
   row.passed=true;
  }catch(e){row.error=String(e.stack??e);row.failureState=await page.evaluate(()=>({state:window.player?.state,diagnostics:window.player?.diagnostics,failures:window.failures})).catch(String);await page.evaluate(()=>window.player?.destroy()).catch(()=>{});}
  finally{clearTimeout(deadline);await page.close();await save();console.log(JSON.stringify({key:row.key,passed:row.passed,error:row.error}));}
 }finally{await browser.close();}
 }
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await Promise.allSettled(snapshots);report.finishedAt=new Date().toISOString();report.passed=report.cases.length===rows.length&&report.cases.every(c=>c.passed);await save();}
process.exit(report.passed?0:1);
