// SPDX-License-Identifier: Apache-2.0
// Public installed package APIs -> verified lazy acquisition -> complete output.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',runtime=process.env.CODEC_RUNTIME??'asyncify';
const setup=JSON.parse(await readFile('build/codec-preparation/installed-'+runtime+'.json','utf8'));
const host=JSON.parse(await readFile('build/codec-preparation/fixtures/manifest.json','utf8'));
host.results=host.cases.filter(c=>!process.env.CASES||process.env.CASES.split(',').includes(c.id));
const deployment=JSON.parse(await readFile(setup.work+'/deployed/demuxe-providers.json','utf8'));
const identities=Object.fromEntries(deployment.providers.map(p=>[p.id,p.implementationIdentity]));
const requests=[];let active='';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;const request={case:active,path:name};requests.push(request);
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<input id="input" type="file"><button id="start">Start</button><div id="player"></div>');return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):path.resolve(setup.work);
 const file=path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));
 if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const b=await readFile(file);request.bodyBytes=b.length;if(active==='cancel'&&file.includes('truehd-mlp-'+runtime+'/engine-adaptation-'+runtime+'/remux.wasm'))await new Promise(r=>setTimeout(r,300));res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(b);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const result={passed:false,family,runtime,setup,cases:[],scope:'original local sources through automatic public Player, full streaming decoder-specific FFmpeg preparation: real File input, reordered AVC, large source, track changes and HEVC'};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});browser=await firefox.connect(browserServer.wsEndpoint());}
 else browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(const f of host.results){
  active=f.id;const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.text().startsWith('qualification:'))console.log(m.text());});page.setDefaultTimeout(90000);await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});await page.locator('#start').click();await page.locator('#input').setInputFiles(f.file);
  const sample=await page.evaluate(async ({f,runtime})=>{
   const {Player}=await import('/node_modules/demuxe/dist/index.js');
   const input=document.querySelector('#input').files[0];File.prototype.arrayBuffer=()=>{throw Error('Whole File materialization is forbidden');};
   const player=new Player(document.querySelector('#player'),{assetBase:new URL('/deployed/',location.href).href,preview:false,remuxRuntime:runtime});
   try{
    console.log('qualification: '+f.id+' opening');const began=performance.now();try{await player.open(input);console.log('qualification: '+f.id+' opened');}catch(e){throw Error(String(e)+'; '+JSON.stringify(player.diagnostics));}const openMs=performance.now()-began;
    await player.play();console.log('qualification: '+f.id+' playing');
    const seek=f.seek[0];await player.seek(seek);console.log('qualification: '+f.id+' first seek');
    const deadline=performance.now()+10000;while(player.state.currentTime<seek+.2&&performance.now()<deadline)await new Promise(r=>setTimeout(r,20));
    if(player.state.currentTime<seek+.2)throw Error('Original source Player playback stalled: '+JSON.stringify(player.diagnostics));
    const explanation=player.getPlaybackExplanation(),diagnostics=player.diagnostics;
    if(explanation.planId!=='native-transcode'||diagnostics.backend?.projection?.kind==='codec-components')throw Error('Unexpected original-source implementation: '+JSON.stringify({explanation,diagnostics}));
    const video=document.querySelector('#player video'),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const cx=canvas.getContext('2d');cx.drawImage(video,0,0,160,90);
    const nonblack=cx.getImageData(0,0,160,90).data.some((v,i)=>i%4!==3&&v>60);if(!nonblack)throw Error('Original source Player produced black video');
    await player.seek(f.seek[1]);console.log('qualification: '+f.id+' second seek');
    if(f.multipleAudio){const choices=player.state.audioTracks;for(const codec of ['dts','truehd']){const track=choices.find(t=>t.codec===codec);if(!track)throw Error('Missing alternate: '+JSON.stringify(choices));await player.selectAudioTrack(track.id);await player.play();await player.seek(3);const selected=player.state.audioTracks.find(t=>t.selected),engine=player.diagnostics.backend?.remux?.remux;if(selected?.codec!==codec||!engine?.asset?.includes(codec==='dts'?'dts-hd':'truehd-mlp')||!(engine.adaptation?.audioSamplesDecoded>0))throw Error('Track/engine mismatch: '+JSON.stringify({selected,engine}));}}
    const finalDiagnostics=player.diagnostics;if(f.large){const stats=finalDiagnostics.backend?.remux?.source;if(!stats||stats.peakActiveBytes>262144||stats.peakOwnedBytes>524288||stats.fetchedBytes>=f.bytes/2)throw Error('Large source violated bounded input: '+JSON.stringify(stats));}
    return {openMs,played:true,nonblack,seekTime:player.state.currentTime,explanation,diagnostics:finalDiagnostics,tracks:player.state.audioTracks};
   }catch(e){throw Error(String(e)+'; '+JSON.stringify(player.diagnostics));}finally{await player.destroy();}
  },{f,runtime});
  const retirement=Date.now()+5000;while(page.workers().length&&Date.now()<retirement)await new Promise(r=>setTimeout(r,25));assert.equal(page.workers().length,0,'Player.destroy must retire source and decoder workers');
  assert.deepEqual(errors,[]);
  const wasm=requests.filter(r=>r.case===f.id&&r.path.endsWith('.wasm')).map(r=>r.path),profile=f.profile;
  assert.deepEqual(wasm.sort(),(f.multipleAudio?['truehd-mlp','dts-hd']:[profile]).map(p=>'/deployed/web/providers/preparation/'+p+'-'+runtime+'/engine-adaptation-'+runtime+'/remux.wasm').sort());
  result.cases.push({id:f.id,...sample,wasmRequests:wasm});console.log(f.id,'original Player passed');await page.close();
 }
 result.requests=requests;result.passed=true;
} catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{if(browser)try{result.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});}catch(error){result.cleanupError=String(error);result.passed=false;process.exitCode=1;}server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-preparation',{recursive:true});const text=JSON.stringify(result,null,2)+'\n';await mkdir('results/media-components/production-preparation/real-player-attempts',{recursive:true});await writeFile('results/media-components/production-preparation/real-player-attempts/'+Date.now()+'-'+runtime+'-'+family+'.json',text);await writeFile('results/media-components/production-preparation/real-player-'+runtime+'-'+family+'.json',text);console.log(result.passed,result.error??'');}
