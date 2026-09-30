// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const directory=path.resolve(process.env.BUNDLE_OUTPUT??'build/bundle-flexibility/tiny-01'),family=process.env.BROWSER??'chrome';
const manifestBytes=await readFile(path.join(directory,'bundle-manifest.json'));
const manifest=JSON.parse(manifestBytes),requests=[],served=new Map([['bundle-manifest.json',manifestBytes]]);
for(const [name,expected]of Object.entries(manifest.outputs)){const bytes=await readFile(path.join(directory,name));assert.equal(bytes.length,expected.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);served.set(name,bytes);}
const cases=JSON.parse(process.env.BUNDLE_CASES??'[{"file":"truehd-stereo.mkv","plan":"native-transcode"}]');
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 const name=new URL(req.url,'http://localhost').pathname;requests.push(name);
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button><div id="host"></div>');return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):directory;
 const file=name==='/example.mp4'?path.resolve('fixtures/example.mp4'):path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));
 if(name!=='/example.mp4'&&!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const data=base===directory&&name!=='/example.mp4'?served.get(name.slice(1)):await readFile(file);if(!data)throw Error('Absent asset');res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const report={passed:false,delivery:manifest.delivery,family,manifest,cases:[],errors:[],requests};
try{
 browser=await(family==='firefox'?firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}}):chromium.launch({... (family==='chrome'?{channel:'chrome'}:{}),headless:true,args:['--autoplay-policy=no-user-gesture-required']}));
 report.browser=browser.version();
 for(const item of cases){
  const page=await browser.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||process.env.BUNDLE_DEBUG)console.error(m.text().slice(0,600));});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#start').click();
  const result=await page.evaluate(async({item,delivery})=>{
   const manifestResponse=await fetch('/bundle-manifest.json',{cache:'no-store'});if(!manifestResponse.ok)throw Error('Missing bundle manifest');
   const manifestBytes=await manifestResponse.arrayBuffer(),testedManifest=JSON.parse(new TextDecoder().decode(manifestBytes));
   const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   const binding={manifestSHA256:await sha(manifestBytes),outputs:{}};
   for(const [name,expected]of Object.entries(testedManifest.outputs)){const response=await fetch('/'+name,{cache:'no-store'});if(!response.ok)throw Error('Missing bundle output '+name);const bytes=await response.arrayBuffer();const actual={bytes:bytes.byteLength,sha256:await sha(bytes)};if(JSON.stringify(actual)!==JSON.stringify({bytes:expected.bytes,sha256:expected.sha256}))throw Error('Bundle integrity mismatch '+name);binding.outputs[name]=actual;}
   console.log('bundle: importing');const bundle=await import('/demuxe.mjs');console.log('bundle: creating runtime');const runtime=delivery==='embedded'?await bundle.createDemuxeRuntime():undefined;console.log('bundle: runtime ready');
   let elementLifecycle;
   if(runtime){
    const name='demuxe-bundle-test-'+Date.now(),a=await bundle.createDemuxeRuntime();
    const Constructor=a.definePlayerElement(name);if(runtime.definePlayerElement(name)!==Constructor)throw Error('Element registration is unstable');a.dispose();
    const first=document.createElement(name);first.previewOptions=false;document.body.append(first);await first.ready;await first.destroy();first.remove();
    const b=await bundle.createDemuxeRuntime();if(b.definePlayerElement(name)!==Constructor)throw Error('Recreated element registration is unstable');
    const second=document.createElement(name);second.previewOptions=false;document.body.append(second);await second.ready;await second.destroy();second.remove();b.dispose();
    elementLifecycle={stable:true,disposed:[a.diagnostics(),b.diagnostics()]};
   }
   const Player=runtime?.api.Player??bundle.Player;
   const response=await fetch(item.file==='example.mp4'?'/example.mp4':'/fixtures/'+item.file);
   if(!response.ok)throw Error('Fixture HTTP '+response.status+': '+item.file);
   const bytes=await response.arrayBuffer();if(!bytes.byteLength)throw Error('Empty fixture: '+item.file);
   const player=new Player(document.querySelector('#host'),{assetBase:runtime?.assetBase??bundle.assetBase,preview:false,remuxRuntime:item.runtime,...(item.mode?{mode:item.mode}:{}),...(item.plan==='native-transcode'?{nativeRemux:'always'}:{})});
   try{
    console.log('bundle: opening');await player.open(new File([bytes],item.file));console.log('bundle: opened');await player.play();console.log('bundle: playing');
    const wait=async target=>{const end=performance.now()+15000;while(player.state.currentTime<target&&performance.now()<end)await new Promise(r=>setTimeout(r,25));if(player.state.currentTime<target)throw Error('Playback stalled: '+JSON.stringify(player.diagnostics));};
    await wait(.25);await player.seek(.5);await wait(.75);
    const explanation=player.getPlaybackExplanation();
    if(item.plan&&explanation.planId!==item.plan)throw Error('Unexpected plan: '+JSON.stringify(explanation));
    const time=player.state.currentTime;
    await player.destroy();
    const before=runtime?.diagnostics();runtime?.dispose();const after=runtime?.diagnostics();
    return {time,explanation,before,after,binding,elementLifecycle};
   }catch(error){throw Error(String(error)+'; '+JSON.stringify(player.diagnostics));}finally{await player.destroy();runtime?.dispose();}
  },{item,delivery:manifest.delivery});
  if(result.after){assert.equal(result.after.workers,0);assert.equal(result.after.objectURLs,0);assert.equal(result.after.disposed,true);}
  report.cases.push({item,...result});await page.close();console.log(manifest.delivery,family,item.file,item.mode??'auto','passed');
 }
 assert.deepEqual(report.errors,[]);
 if(manifest.delivery==='embedded')assert.ok(requests.every(n=>['/','/demuxe.mjs','/bundle-manifest.json','/example.mp4','/favicon.ico'].includes(n)||n.startsWith('/fixtures/')),'Embedded runtime made external asset requests');
 report.passed=true;
}finally{
 if(browser)report.retirement=await closeTestBrowser(browser,family);
 await new Promise(resolve=>server.close(resolve));
 const output=process.env.BUNDLE_REPORT??path.join(directory,'playback-'+family+'.json');await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
}
