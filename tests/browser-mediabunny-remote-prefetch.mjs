// SPDX-License-Identifier: Apache-2.0
// Directly exercise remote-source startup speculation with a real packaged runtime, not playback.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,sep,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,firefox,webkit} from 'playwright';

const root=resolve(process.env.DEMUXE_COMPOSED_DEPLOYMENT??'');
const evidence=process.env.DEMUXE_BROWSER_EVIDENCE;
if(!process.env.DEMUXE_COMPOSED_DEPLOYMENT||!evidence)throw Error('Set DEMUXE_COMPOSED_DEPLOYMENT and DEMUXE_BROWSER_EVIDENCE');
const browserName=process.env.DEMUXE_PUBLIC_BROWSER??'chrome';
assert.ok(['chrome','firefox','webkit'].includes(browserName));
const hash=data=>createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(await readFile(join(root,'demuxe-providers.json')));
const receipt={status:'running-not-qualified',browserEngine:browserName,harnessSHA256:hash(await readFile(fileURLToPath(import.meta.url))),manifestSHA256:hash(await readFile(join(root,'demuxe-providers.json'))),cases:[],limitations:['Direct invocation with injected remote source facts, not an actual remote request, observed timer deadline or playback test','Test-owned provider identities and composition; no production qualification','No claim about prefetch under other provider or source profiles']};
const requests=[];let server,browser;
const save=()=>writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');
try{
 server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  try{
   const headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'};
   if(path==='/'){res.writeHead(200,{...headers,'Content-Type':'text/html'});res.end('<!doctype html><body></body>');return;}
   if(path==='/favicon.ico'){res.writeHead(204,headers);res.end();return;}
   const file=resolve(root,path.slice(1));assert.ok(file.startsWith(root+sep));const bytes=await readFile(file);
   requests.push({path,bytes:bytes.length,sha256:hash(bytes)});
   res.writeHead(200,{...headers,'Content-Type':path.endsWith('.wasm')?'application/wasm':path.endsWith('.json')?'application/json':'text/javascript','Content-Length':bytes.length});res.end(bytes);
  }catch(error){res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const base='http://127.0.0.1:'+server.address().port+'/';
 browser=await ({chrome:chromium,firefox,webkit}[browserName]).launch({...browserName==='chrome'?{channel:'chrome'}:{},headless:true});receipt.browser=browser.version();
 for(const sdk of ['mediabunny-mp4-file-preparation','mediabunny-mp4-stream-preparation'])for(const ordering of ['mediabunny-first','unqualified','weak-identity','ffmpeg-first','default']){
  assert.ok(manifest.providers.some(provider=>provider.id===sdk));
  const page=await browser.newPage();const start=requests.length;
  try{
   await page.goto(base);
   const result=await page.evaluate(async({manifest,sdk,ordering,base})=>{
    const {Player,DemuxeRuntime}=await import('/dist/index.js');
    const identities=Object.fromEntries(manifest.providers.map(p=>[p.id,p.implementationIdentity])),binding=sdk==='mediabunny-mp4-file-preparation'?'mediabunny-mp4':'mediabunny-mp4-stream';
    const runtime=new DemuxeRuntime({assetBase:base,qualifiedProviders:identities,qualifiedCompositions:ordering==='unqualified'?[]:[{recipeId:'native-remux',bindingId:binding,sourceProfiles:['remote:pthread:mp4-mov-avc-aac-2ch'],implementationIdentities:{[sdk]:identities[sdk],'browser-prepared':identities['browser-prepared']}}]});
    const preferences=ordering==='default'?undefined:[{capability:'media.prepare.file',providers:ordering==='ffmpeg-first'?['ffmpeg-file-preparation',sdk]:[sdk,'ffmpeg-file-preparation']}];
    const host=document.createElement('div');document.body.append(host);let workers=0;const WorkerClass=globalThis.Worker;
    globalThis.Worker=class extends WorkerClass{constructor(...args){super(...args);workers++;}};
    let player;
    try{
     await runtime.providers.load('demuxe-providers.json');player=new Player(host,{runtime,remuxRuntime:'off',providerPreferences:preferences,preview:false});
     const source={kind:'remote',options:{url:base+'input.mp4',format:'file',identity:{size:'1024',etag:ordering==='weak-identity'?'W/\"v1\"':'\"v1\"'}}},probe={format:'mp4',duration:3,tracks:[{id:'1',index:0,type:'video',codec:'h264'},{id:'2',index:1,type:'audio',codec:'aac',sampleRate:48000,channels:2}]};
     await player.providerRuntime.load();player.providerRuntime.rejection('native-remux',source,'prefetch-test','pthread',probe,'auto');
     await player.prefetchStartup('native-remux',source,{aid:'auto'});
     return {workers,ordering,sdk};
    }finally{await player?.destroy();await runtime.destroy();host.remove();globalThis.Worker=WorkerClass;}
   },{manifest,sdk,ordering,base});
   const delivered=requests.slice(start),assets=delivered.filter(item=>item.path.startsWith('/web/engine-remux/')||item.path.startsWith('/web/providers/mediabunny/'));
   receipt.cases.push({...result,assets});await save();
   assert.equal(result.workers,0);assert.ok(!assets.some(item=>item.path.startsWith('/web/providers/mediabunny/')));
   if(ordering==='mediabunny-first')assert.deepEqual(assets,[]);
   else{const wasm=assets.filter(item=>item.path==='/web/engine-remux/remux.wasm');assert.equal(wasm.length,1);const declared=manifest.assets.find(item=>'/'+item.path===wasm[0].path);assert.equal(wasm[0].sha256,declared.sha256);assert.equal(wasm[0].bytes,declared.bytes);}
  }finally{await page.close();}
 }
 receipt.status='browser-packaged-remote-prefetch-cases-passed-not-release';
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};throw error;}
finally{await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));receipt.requests=requests;await save();}
