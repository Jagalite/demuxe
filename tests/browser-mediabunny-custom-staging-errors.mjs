// SPDX-License-Identifier: Apache-2.0
// Exercise public custom-source staging failures before provider acquisition.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
const [deployment,output,engine]=process.argv.slice(2);
assert.ok(deployment&&output&&['chrome','firefox','webkit'].includes(engine));
const root=resolve(deployment),hash=data=>createHash('sha256').update(data).digest('hex');
const manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),requests=[];
const browser=await ({chrome:chromium,firefox,webkit}[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage();await page.route('https://custom-staging.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({contentType:'text/html',body:'<body></body>'});
  const target=resolve(root,path.slice(1));if(!target.startsWith(root+sep))return route.abort();
  try{const data=await readFile(target);requests.push({path,bytes:data.length,sha256:hash(data)});return route.fulfill({contentType:path.endsWith('.json')?'application/json':'text/javascript',body:data});}catch{return route.abort();}
 });
 await page.goto('https://custom-staging.test/');
 const checks=await page.evaluate(async manifest=>{
  const {Player,DemuxeRuntime}=await import('/dist/index.js');
  const runtime=new DemuxeRuntime({assetBase:'https://custom-staging.test/',qualifiedProviders:Object.fromEntries(manifest.providers.map(p=>[p.id,p.implementationIdentity]))});await runtime.providers.load('demuxe-providers.json');
  const host=document.createElement('div');document.body.append(host);const player=new Player(host,{runtime,preview:false,remuxRuntime:'off'});
  const OriginalWorker=globalThis.Worker;let workers=0;globalThis.Worker=class extends OriginalWorker{constructor(...args){super(...args);workers++;}};
  try{
   async function run(mode){
    let closes=0,entered;const started=new Promise(resolve=>{entered=resolve;}),controller=new AbortController();
    const source={kind:'bytes',transport:'application-managed',id:'custom-'+mode,size:8,ownership:'owned',read:async(_at,n)=>{entered();if(mode==='failure')throw new Error('source permission denied');if(mode==='abort')return new Promise(()=>{});return new Uint8Array(n);},close(){closes++;throw new Error('close failed');}};
    const pending=player.open(source,{signal:controller.signal});const result=pending.then(()=>({resolved:true}),error=>({resolved:false,code:error.code,message:error.message}));
    if(mode==='abort'){await started;controller.abort();}
    const outcome=await result;return {...outcome,closes,sourceId:player.state.sourceId};
   }
   return {failure:await run('failure'),abort:await run('abort'),cleanup:await run('cleanup'),workers};
  }finally{await player.destroy();await runtime.destroy();host.remove();globalThis.Worker=OriginalWorker;}
 },manifest);
 assert.equal(checks.failure.resolved,false);assert.equal(checks.failure.code,'SOURCE_PERMISSION');assert.match(checks.failure.message,/source permission denied/);
 assert.equal(checks.abort.resolved,false);assert.equal(checks.abort.code,'ABORTED');assert.equal(checks.cleanup.resolved,false);assert.match(checks.cleanup.message,/close failed/);
 for(const mode of ['failure','abort','cleanup']){assert.equal(checks[mode].closes,1);assert.equal(checks[mode].sourceId,null);}
 assert.equal(checks.workers,0);assert.ok(!requests.some(x=>x.path.startsWith('/web/providers/mediabunny/')||x.path.startsWith('/web/engine-remux/')));
 const receipt={status:'public-custom-staging-error-cases-passed-not-release',browserEngine:engine,browser:browser.version(),manifestSHA256:hash(manifestBytes),harnessSHA256:hash(await readFile(new URL(import.meta.url))),requests,checks,limitations:['Error and cancellation cases only; no playback success or broad browser qualification.']};
 await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,browser:receipt.browser,requests:requests.length}));
}finally{await browser.close();}
