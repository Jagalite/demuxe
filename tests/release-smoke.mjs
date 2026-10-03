// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const origin=process.env.RELEASE_URL||'http://127.0.0.1:4182';
const started=Date.now();
const browser=await chromium.launch({channel:'chrome',headless:false,ignoreDefaultArgs:['--mute-audio'],args:['--autoplay-policy=no-user-gesture-required']});
const result={started:new Date(started).toISOString(),browser:browser.version(),browserLaunchMs:Date.now()-started,origin,passed:false};
const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>{for(const n of ['VideoDecoder','AudioDecoder','VideoFrame','MediaSource'])Object.defineProperty(globalThis,n,{value:undefined,configurable:true});HTMLMediaElement.prototype.play=()=>{throw Error('Native media forbidden');};});
try{
 await page.goto(origin+'/web/index.html?no-codecs');await page.waitForFunction(()=>typeof createPlayer==='function');
 result.readyMs=await page.evaluate(async()=>{const start=performance.now();await createPlayer();return performance.now()-start;});
 await page.evaluate(async()=>{window.mediaStart=performance.now();await player.open(await(await fetch('/fixtures/m0.mkv')).arrayBuffer());await player.play();});
 await page.waitForFunction(()=>player.diagnostics?.rendered>3&&player.audioDiagnostics().mediaFrames>128&&player.audioDiagnostics().rms>.005);
 result.firstOutput=await page.evaluate(()=>({milliseconds:performance.now()-mediaStart,video:player.diagnostics,audio:player.audioDiagnostics(),browserCodecsAbsent:player.browserCodecsAbsent}));
 assert.equal(result.firstOutput.browserCodecsAbsent,true);
 await page.evaluate(async()=>{await player.pause();await player.seek(3);});await page.waitForFunction(()=>!player.diagnostics?.seeking&&Math.abs(player.diagnostics?.presentedPosition-3)<.2);
 await page.evaluate(()=>player.destroy());for(let i=0;i<30&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
 await page.route('**/web/example.html',async route=>{const response=await route.fetch(),body=await response.text();assert.ok(body.includes('async function run(action)'),'Example player test bridge must match');await route.fulfill({response,body:body.replace('async function run(action)', 'window.smokePlayer=()=>player; async function run(action)')});});
 await page.goto(origin+'/web/example.html');
 await page.locator('#automatic').uncheck();await page.waitForFunction(()=>window.smokePlayer?.().automaticSelection===false);
 await page.locator('#mode').selectOption('software');await page.waitForFunction(()=>window.smokePlayer().mode==='software'&&!window.smokePlayer().state.pendingOperation);
 await page.locator('#file').setInputFiles(fileURLToPath(new URL('../fixtures/m0.mkv',import.meta.url)));
 await page.waitForFunction(()=>{const state=window.smokePlayer?.().state;return state?.currentTime>.1&&state.status==='playing'&&state.activeMode==='software';});
 result.examplePlayback=await page.evaluate(()=>{const state=window.smokePlayer().state;return {status:state.status,mode:state.activeMode,currentTime:state.currentTime};});
 assert.equal(await page.locator('[role=status]').textContent(),'Ready.');
 await page.click('#close');await page.waitForFunction(()=>!document.querySelector('#surface canvas'));for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
 assert.equal(await page.locator('[role=status]').textContent(),'Ready.');
 assert.deepEqual(errors,[]);result.passed=true;console.log('PASS software playback and integration example smoke');
}catch(error){result.failure=String(error.stack);result.page=await page.evaluate(()=>({url:location.href,status:document.querySelector('[role=status]')?.textContent,surface:document.querySelector('#surface')?.innerHTML})).catch(()=>null);console.error(result.failure);process.exitCode=1;}
finally{result.errors=errors;result.finished=new Date().toISOString();try{const output=process.env.SMOKE_RESULT||'results/release-smoke.json';await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');}finally{await browser.close();}}
