// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve();
try{for(const name of ['firefox','chrome']){
 const browser=await(name==='firefox'?firefox:chromium).launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0}})});
 try{
  const page=await browser.newPage(),requests=[];
  page.on('request',r=>{if(r.url().endsWith('.wasm')||r.url().endsWith('.ttf'))requests.push(r.url());});
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.Player=Player;window.player=new Player(document.querySelector('#surface'));});
  assert.deepEqual(await page.evaluate(()=>player.preparationReady),{milliseconds:0,assets:[]});assert.equal(requests.length,0);
  const report=await page.evaluate(()=>player.prepare(['inspector']));assert.equal(report.assets.length,1);assert.equal(report.assets[0].status,'ready');assert.equal(requests.length,1);assert.equal(page.workers().length,0);
  await page.evaluate(()=>player.prepare('all'));assert.equal(requests.length,4);assert.equal(page.workers().length,0);
  await page.evaluate(()=>player.prepare('all'));assert.equal(requests.length,4);
  await page.evaluate(()=>player.destroy());assert.equal(page.workers().length,0);
  // Failure to prepare cannot prevent normal playback loading.
  let fail=true;
  await page.route('**/engine-software-full/player.wasm',r=>fail?r.fulfill({status:503,body:'unavailable'}):r.continue());
  await page.evaluate(()=>{window.player=new Player(document.querySelector('#surface'),{mode:'software',prepare:['software']});const input=document.createElement('input');input.type='file';input.id='file';document.body.append(input);});
  const failed=await page.evaluate(()=>player.preparationReady);assert.equal(failed.assets.find(a=>a.name==='software').status,'failed');fail=false;
  await page.locator('#file').setInputFiles('fixtures/example.mp4');
  await page.evaluate(async()=>{await player.open(document.querySelector('#file').files[0]);await player.play();});
  await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.1);
  await page.evaluate(()=>player.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);
  console.log('PASS',name,'selective/all preparation, deduplication, no preparation workers, failed preparation fallback, cleanup');
 }finally{await browser.close();}
}}finally{await server.close();}
