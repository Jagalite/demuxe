// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve();
try{for(const kind of [chromium,firefox]){
 const browser=await kind.launch({headless:true,...(kind===chromium?{channel:'chrome'}:{})});
 try{
  const page=await browser.newPage();await page.goto(server.origin+'/web/player.html');
  await page.waitForFunction(()=>!!window.player);await page.evaluate(()=>player.preparationReady);
  await page.evaluate(()=>{
   window.progress=[];window.deepProbes=0;
   player.addEventListener('inspectionchange',e=>progress.push({phase:e.detail.phase,text:document.querySelector('#viewer').shadowRoot.querySelector('#busy').textContent}));
   const inspect=player.inspectWithFFmpeg;player.inspectWithFFmpeg=function(...args){deepProbes++;return inspect.apply(this,args);};
   // Inject slow file I/O; leave parser and routing untouched.
   const read=FileReader.prototype.readAsArrayBuffer;
   FileReader.prototype.readAsArrayBuffer=function(blob){setTimeout(()=>read.call(this,blob),250);};
  });
  await page.locator('#viewer #file').setInputFiles('fixtures/m0.mkv');
  await page.waitForFunction(()=>!!player.state.sourceId&&!player.state.pendingOperation,null,{timeout:30000});
  const result=await page.evaluate(()=>({progress,deepProbes,busy:document.querySelector('#viewer').shadowRoot.querySelector('#busy').textContent,plan:player.diagnostics.plan?.id}));
  assert.equal(result.deepProbes,0);assert.equal(result.plan,'native-direct-mpv');
  assert.ok(result.progress.some(p=>p.phase==='reading'&&p.text.includes('Reading media')));
  assert.ok(result.progress.some(p=>p.phase==='inspecting'&&p.text.includes('Inspecting media')));
  assert.ok(!result.busy.includes('Reading media'));
  await page.evaluate(()=>player.destroy());console.log(kind.name(),JSON.stringify(result));
 }finally{await browser.close();}
}}finally{await server.close();}
