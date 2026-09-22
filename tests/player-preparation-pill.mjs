// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const server=await serve(),out=`results/player-preparation-pill/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});const results=[];
try{for(const name of ['chrome','firefox']){
 const browser=await(name==='chrome'?chromium:firefox).launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0}})});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/player.css*',route=>route.fulfill({path:'web/player.css',contentType:'text/css'}));
  await page.route('**/*.wasm',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue();});
  await page.goto(server.origin+'/web/player.html');await page.waitForFunction(()=>!!window.player);
  await page.evaluate(()=>{window.pills=[];const pill=document.querySelector('#viewer').shadowRoot.getElementById('busy');const record=()=>pills.push({text:pill.textContent,hidden:pill.hidden,complete:pill.dataset.complete});record();new MutationObserver(record).observe(pill,{attributes:true,childList:true,subtree:true,characterData:true});});
  assert.match(await page.locator('#viewer #busy').textContent(),/Loading|Compiling/);
  await page.screenshot({path:out+`/${name}-loading.png`});
  const report=await page.evaluate(()=>player.preparationReady);assert.ok(report.assets.every(a=>a.status==='ready'));
  await page.waitForFunction(()=>document.querySelector('#viewer').shadowRoot.getElementById('busy').textContent==='Components ready · 4/4');
  assert.equal(await page.locator('#viewer #busy').getAttribute('data-complete'),'true');assert.equal(page.workers().length,0);
  await page.screenshot({path:out+`/${name}-ready.png`});
  await page.setViewportSize({width:360,height:640});await page.screenshot({path:out+`/${name}-mobile.png`});
  const fits=await page.evaluate(()=>{const viewer=document.querySelector('#viewer'),a=viewer.getBoundingClientRect(),b=viewer.shadowRoot.getElementById('busy').getBoundingClientRect();return b.left>=a.left&&b.right<=a.right;});assert.ok(fits);
  await page.locator('#viewer #file').setInputFiles('fixtures/example.mp4');
  await page.waitForFunction(()=>!!player.state.sourceId&&!player.state.pendingOperation);
  assert.equal(await page.locator('#viewer #busy').isVisible(),false);
  const pills=await page.evaluate(()=>pills);assert.ok(pills.some(p=>p.text.startsWith('Compiling')));assert.ok(pills.some(p=>p.text==='Inspecting media…'));assert.ok(pills.some(p=>p.text==='Starting Native playback…'));
  await page.evaluate(()=>player.close());assert.equal(await page.locator('#viewer #busy').textContent(),'Components ready · 4/4');
  await page.evaluate(()=>player.destroy());await page.waitForTimeout(200);assert.equal(page.workers().length,0);
  await page.close();
  const failure=await browser.newPage();await failure.route('**/player.css*',route=>route.fulfill({path:'web/player.css',contentType:'text/css'}));await failure.route('**/engine-hybrid/player.wasm',r=>r.fulfill({status:503,body:'unavailable'}));await failure.goto(server.origin+'/web/player.html');await failure.waitForFunction(()=>!!window.player);await failure.evaluate(()=>player.preparationReady);
  assert.match(await failure.locator('#viewer #busy').textContent(),/Ready · 3\/4 prepared; others load when needed/);assert.equal(await failure.locator('#viewer #busy').getAttribute('data-complete'),'true');await failure.evaluate(()=>player.destroy());await failure.close();
  assert.deepEqual(errors,[]);results.push({name,passed:true,pills});console.log('PASS',name);
 }catch(error){results.push({name,passed:false,error:String(error.stack)});console.error(error);process.exitCode=1;}finally{await browser.close();}
}}finally{await server.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(out);}
