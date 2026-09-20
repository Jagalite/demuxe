// SPDX-License-Identifier: Apache-2.0
// Fault-injection regression: a rejected Native HLS trial must reach working Hybrid playback.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './server.mjs';
import {markedAudio,markedImage} from './checks.mjs';
const [assetArg,outputArg]=process.argv.slice(2);
assert.ok(assetArg&&outputArg,'Usage: node tests/head-to-head/hls-fallback.mjs <assets> <fresh-output>');
const assets=path.resolve(assetArg),out=path.resolve(outputArg);
const sha=data=>createHash('sha256').update(data).digest('hex');
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json'));
const manifest=JSON.parse(manifestBytes);
for(const [name,entry] of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),entry.sha256,name);
await fs.mkdir(out,{recursive:false});
await fs.writeFile(path.join(out,'assets-manifest.json'),manifestBytes);
await fs.mkdir(path.join(out,'harness'));
for(const name of ['hls-fallback.mjs','adapters.mjs','checks.mjs','server.mjs','harness.html'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'harness',name));
const result={kind:'fault-injection',fault:'NativePlayer.openRemote rejects HLS with UNSUPPORTED_MEDIA',assetsSHA256:sha(manifestBytes),command:process.argv,startedAt:new Date().toISOString()};
const server=await serve(assets,path.join(out,'harness'),path.join(out,'requests.jsonl'));
let browser,page;
try {
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 result.browser=browser.version();
 page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto(server.origin+'/harness/harness.html');
 await page.waitForFunction(()=>window.api);
 await page.evaluate(async()=>{
  const {NativePlayer}=await import('/demuxe/web/generated/internal/native-player.js');
  const {PlayerError}=await import('/demuxe/web/generated/internal/errors.js');
  const original=NativePlayer.prototype.openRemote;
  window.nativeRejected=0;
  NativePlayer.prototype.openRemote=async function(source){
   if(source.format==='hls'){window.nativeRejected++;throw new PlayerError('UNSUPPORTED_MEDIA','Injected native HLS incompatibility');}
   return original.call(this,source);
  };
 });
 const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
 result.initial=await page.evaluate(config=>api.start(config),{...catalogue['hls-ts'],id:'demuxe.auto.hls-ts',player:'demuxe',lane:'auto',correctness:true});
 await page.waitForFunction(()=>api.snapshot().position>0.5,{},{timeout:20000});
 await page.waitForTimeout(500);
 result.playing=await page.evaluate(()=>api.snapshot());
 result.nativeRejected=await page.evaluate(()=>window.nativeRejected);
 assert.equal(result.nativeRejected,1);
 assert.equal(result.playing.route,'hybrid');
 assert.ok(result.playing.diagnostics.selection.attempts.some(a=>a.mode==='native'&&a.outcome==='failed'&&a.reason.includes('Injected native HLS incompatibility')));
 result.audio=markedAudio(result.playing);
 assert.ok(result.audio,'Marked stereo output after fallback');
 const screenshot=await page.locator('#stage').screenshot({path:path.join(out,'fallback.png')});
 result.image=markedImage(screenshot,result.playing.position);
 assert.ok(result.image.markerCorrect,'Displayed video after fallback');
 result.cleanup=await page.evaluate(()=>api.stop());
 assert.equal(result.cleanup.remainingSurfaces,0);
 await page.waitForTimeout(300);
 assert.equal(page.workers().length,0);
 result.passed=true;
} catch(error) {
 result.passed=false;result.error=String(error.stack??error);
 result.failureState=await page?.evaluate(()=>api.snapshot()).catch(()=>null);
 process.exitCode=1;
} finally {
 await browser?.close();await server.close();
 result.finishedAt=new Date().toISOString();
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
 const files={};
 for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())files[name]=sha(await fs.readFile(path.join(out,name)));
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:files},null,2)+'\n');
}
console.log(JSON.stringify({output:out,passed:result.passed,error:result.error},null,2));
