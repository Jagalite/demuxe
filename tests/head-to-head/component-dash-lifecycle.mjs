// SPDX-License-Identifier: Apache-2.0
// Finite fixture-only MPD/MSE trial: replacement, cancellation and malformed input.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './server.mjs';
const [assetArg,outArg]=process.argv.slice(2),assets=path.resolve(assetArg),out=path.resolve(outArg),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(bytes);
for(const [name,value]of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),value.sha256,name);
await fs.mkdir(out);await fs.mkdir(path.join(out,'files'));
for(const name of ['component-dash-lifecycle.mjs','component-trials.mjs','server.mjs','harness.html','adapters.mjs'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'files',name));
await fs.writeFile(path.join(out,'assets-manifest.json'),bytes);
const server=await serve(assets,path.join(out,'files'),path.join(out,'requests.jsonl'));
const result={command:process.argv,startedAt:new Date().toISOString(),assetsSHA256:sha(bytes),cases:[]};let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
 for(const id of ['dash-h264','dash-av1']){
  const page=await browser.newPage({viewport:{width:960,height:540}}),record={id,checks:[]};result.cases.push(record);
  await page.addInitScript(()=>{window.liveURLs=new Set();const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=b=>{const u=create(b);liveURLs.add(u);return u;};URL.revokeObjectURL=u=>{liveURLs.delete(u);revoke(u);};});
  await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
  await page.evaluate(c=>api.start(c),{...catalogue[id],id,player:'demuxe',lane:'native',componentTrial:'dash',correctness:false});await page.evaluate(()=>api.pause());
  assert.equal(await page.evaluate(()=>liveURLs.size),1);
  await page.evaluate(async()=>{await componentPlayer.open(new URL('/fixtures/h264-vtt/index.mp4',location.href).href);await componentPlayer.play();await componentPlayer.pause();});
  assert.equal(await page.evaluate(()=>liveURLs.size),0);record.checks.push('source replacement revokes MSE URL and plays replacement');
  await page.route('**/invalid.mpd',route=>route.fulfill({contentType:'application/dash+xml',body:'<MPD type="dynamic"><Period/></MPD>'}));
  record.malformed=await page.evaluate(async()=>{try{await componentPlayer.open({url:new URL('/invalid.mpd',location.href).href,format:'dash'});return {rejected:false};}catch(e){return {rejected:true,error:String(e)};}});
  assert.ok(record.malformed.rejected);record.checks.push('unsupported/malformed profile rejects');
  await page.route('**/delayed.mpd',async route=>{await new Promise(r=>setTimeout(r,1000));await route.abort().catch(()=>{});});
  record.cancelled=await page.evaluate(async()=>{const p=componentPlayer;const pending=p.open({url:new URL('/delayed.mpd',location.href).href,format:'dash'}).then(()=>false,()=>true);await new Promise(r=>setTimeout(r,60));await p.destroy();return await pending;});
  assert.ok(record.cancelled);assert.equal(await page.evaluate(()=>liveURLs.size),0);await page.waitForTimeout(1200);assert.equal(page.workers().length,0);assert.equal(await page.locator('#stage video').count(),0);record.checks.push('destroy during fetch cancels open and releases resources');record.passed=true;await page.context().close();
 }
 result.passed=true;
}catch(e){result.passed=false;result.error=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await server.close();result.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
