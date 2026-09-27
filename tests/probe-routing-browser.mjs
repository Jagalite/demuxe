// SPDX-License-Identifier: Apache-2.0
// Routing contract with warm in-memory fixture; not a disk/startup benchmark.
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve({mediaPaths:{fixture:'fixtures/m0.mkv'}});
try{for(const kind of [chromium,firefox]){
 const browser=await kind.launch({headless:true,...(kind===chromium?{channel:'chrome'}:{})});
 try{
  const page=await browser.newPage();await page.goto(server.origin+'/experiment/page.html');
  const result=await page.evaluate(async()=>{
   const {Player}=await import('/web/generated/index.js');
   const {inspectFastSource}=await import('/web/fast-source-inspector.js');
   const file=new File([await(await fetch('/media/fixture')).arrayBuffer()],'m0.mkv');
   await inspectFastSource(file,{requirements:['container','tracks']});
   const player=new Player(document.querySelector('#surface'),{nativeRemux:'always'});
   let probes=0;player.inspectWithFFmpeg=async()=>{probes++;throw Error('Unnecessary FFmpeg metadata probe');};
   try{await player.open(file);return {probes,plan:player.diagnostics.plan?.id,attempts:player.diagnostics.selection.attempts};}
   finally{await player.destroy();}
  });
  assert.equal(result.probes,0);assert.equal(result.plan,'native-remux-mpv');
  assert.ok(result.attempts.some(a=>a.reason?.includes('Fast Inspector admitted native-remux')));
  console.log(kind.name(),JSON.stringify(result));
  // Simulate a fast parser that knows the streams but cannot derive duration.
  await page.reload();
  await page.route('**/fast-source-inspector.js',route=>route.fulfill({contentType:'text/javascript',body:`
    import {inspectFastSource as inspect} from '/web/fast-source-inspector.js?actual=1';
    export async function inspectFastSource(...args){
      const result=await inspect(...args);
      if(result.status==='satisfied'){result.evidence.duration=0;result.available=result.available.filter(f=>f!=='duration');}
      return result;
    }`}));
  const fallback=await page.evaluate(async()=>{
   const {Player}=await import('/web/generated/index.js');
   Object.defineProperty(globalThis,'VideoDecoder',{value:undefined,configurable:true});
   const file=new File([await(await fetch('/media/fixture')).arrayBuffer()],'m0.mkv');
   const player=new Player(document.querySelector('#surface'));
   let probes=0;const inspect=player.inspectWithFFmpeg;
   player.inspectWithFFmpeg=function(...args){probes++;return inspect.apply(this,args);};
   try{await player.open(file);return {probes,plan:player.diagnostics.plan?.id,attempts:player.diagnostics.selection.attempts};}
   finally{await player.destroy();}
  });
  assert.equal(fallback.probes,1);assert.equal(fallback.plan,'native-direct-mpv');
  assert.ok(fallback.attempts.some(a=>a.reason?.includes('missing duration')));
  console.log(kind.name(),'incomplete duration',JSON.stringify(fallback));

 }finally{await browser.close();}
}}finally{await server.close();}
