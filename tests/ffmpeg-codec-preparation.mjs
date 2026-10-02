// SPDX-License-Identifier: Apache-2.0
// Exact full-file decode/mux evidence for decoder-specific streaming engines.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',runtime=process.env.CODEC_RUNTIME??'asyncify';
const buildRoot=process.env.CODEC_PREPARATION_BUILDS??'/Volumes/seed2/Projects/demuxe-codec-preparation-builds';
const host=JSON.parse(await readFile('results/media-components/production-audio/host-recipes.json','utf8'));
if(process.env.PRODUCTION_FIXTURES){const manifest=JSON.parse(await readFile('build/codec-preparation/fixtures/manifest.json','utf8'));host.results=manifest.cases.filter(c=>!c.large).map(c=>({...c,codec:c.profile==='dts-hd'?'dts-hd':'truehd',output:c.file}));}
const builds={};
const profiles=(process.env.CODEC_PROFILES??'truehd-mlp,dts-hd').split(',');
for(const profile of profiles){
 const directory=path.join(buildRoot,profile+'-'+runtime+'-01'),record=JSON.parse(await readFile(directory+'/build-result.json','utf8'));
 assert.equal(record.status,'build_completed_only');assert.equal(record.codecProfile,profile);
 for(const name of ['remux.mjs','remux.wasm'])assert.equal(createHash('sha256').update(await readFile(directory+'/engine/'+name)).digest('hex'),record.artifacts[name]);
 builds[profile]={directory,record};
}
const allowed=['tests/provider-lossless-broad-worker.mjs','web/private-ffmpeg/bridge.js','web/private-ffmpeg/single-owner.js','web/generated/internal/machine/private-range-source.js','web/generated/internal/machine/ffmpeg-owner.js','web/generated/internal/machine/ffmpeg-bridge.js','web/private-ffmpeg/range-source.js'];
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end('Codec-specific preparation');return;}
 let file;
 if(name.startsWith('/engines/')){const [, ,profile,leaf]=name.split('/');if(!builds[profile]||!['remux.mjs','remux.wasm'].includes(leaf)){res.writeHead(403).end();return;}file=builds[profile].directory+'/engine/'+leaf;}
 else if(name.startsWith('/fixtures/')){const leaf=name.slice(10);if(!host.results.some(f=>f.id+'.mkv'===leaf)){res.writeHead(403).end();return;}file=host.results.find(f=>f.id+'.mkv'===leaf).file??'build/provider-lossless-audio/'+leaf;}
 else if(name.startsWith('/repository/')&&allowed.includes(name.slice(12)))file=name.slice(12);
 else{res.writeHead(403).end();return;}
 try{const bytes=await readFile(file);res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const report={passed:false,family,runtime,builds,cases:[],scope:'exact codec-specific FFmpeg complete audio preparation and video packet copy; host PCM/video comparison; no Player or release qualification'};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true});browser=await firefox.connect(browserServer.wsEndpoint());}else browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 for(const f of host.results.filter(f=>profiles.includes(f.codec==='dts-hd'?'dts-hd':'truehd-mlp'))){
  const page=await browser.newPage();page.setDefaultTimeout(90000);await page.goto('http://127.0.0.1:'+server.address().port);
  const profile=f.codec==='dts-hd'?'dts-hd':'truehd-mlp';
  const sample=await page.evaluate(async({f,profile,runtime})=>{
   const file=new Blob([await(await fetch('/fixtures/'+f.id+'.mkv')).arrayBuffer()]);
   const worker=new Worker('/repository/tests/provider-lossless-broad-worker.mjs',{type:'module'});
   try{
    const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Codec preparation deadline')),60000);worker.onmessage=({data})=>{clearTimeout(timer);data.passed?resolve(data):reject(Error(data.error));};worker.onerror=e=>reject(Error(e.message));worker.postMessage({file,runtime,engineURL:'/engines/'+profile+'/remux.mjs'});});
    let encoded='';const bytes=new Uint8Array(result.output);for(let at=0;at<bytes.length;at+=32768)encoded+=String.fromCharCode(...bytes.subarray(at,at+32768));return {...result,output:undefined,encoded:btoa(encoded)};
   }finally{worker.terminate();}
  },{f,profile,runtime});
  const file='build/provider-lossless-audio/codec-preparation-'+runtime+'-'+f.id+'.mp4',bytes=Buffer.from(sample.encoded,'base64');await writeFile(file,bytes);delete sample.encoded;
  const raw=(file,format)=>execFileSync('ffmpeg',['-v','error','-i',file,'-map',format==='rawvideo'?'0:v:0':'0:a:0',...(format==='s32le'?['-c:a','pcm_s32le']:['-c:v','rawvideo']),'-f','hash','-hash','sha256','-'],{encoding:'utf8'});
  assert.deepEqual(raw(file,'s32le'),raw(f.output,'s32le'),f.id+' integer audio');assert.deepEqual(raw(file,'rawvideo'),raw(f.output,'rawvideo'),f.id+' copied video');
  report.cases.push({id:f.id,profile,...sample,outputBytes:bytes.length,outputSHA256:createHash('sha256').update(bytes).digest('hex'),audioDecodedExact:true,videoDecodedExact:true});await page.close();console.log(f.id,'full preparation passed');
 }
 report.passed=true;
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{
 if(browser)report.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});
 server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-preparation',{recursive:true});await writeFile('results/media-components/production-preparation/'+(process.env.PRODUCTION_FIXTURES?'real-full':'full')+'-'+runtime+'-'+family+'.json',JSON.stringify(report,null,2)+'\n');console.log(report.passed,report.error??'');
}
