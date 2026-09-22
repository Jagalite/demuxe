// SPDX-License-Identifier: Apache-2.0
// Additional fixture-scoped qualification for independent subtitle ownership.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './server.mjs';
import {markedImage} from './checks.mjs';
const [assetArg,outArg]=process.argv.slice(2),assets=path.resolve(assetArg),out=path.resolve(outArg),sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(bytes);
for(const [name,value]of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),value.sha256,name);
await fs.mkdir(out);await fs.mkdir(path.join(out,'files'));
for(const name of ['component-isolation-lifecycle.mjs','component-trials.mjs','server.mjs','harness.html','adapters.mjs','checks.mjs'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'files',name));
await fs.writeFile(path.join(out,'assets-manifest.json'),bytes);
const server=await serve(assets,path.join(out,'files'),path.join(out,'requests.jsonl'));
const result={command:process.argv,startedAt:new Date().toISOString(),assetsSHA256:sha(bytes),cases:[]};let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
 for(const id of ['h264-srt','h264-movtext','h264-ass','pcm-ass']){
  const page=await browser.newPage({viewport:{width:960,height:540}}),record={id,checks:[]};result.cases.push(record);
  await page.addInitScript(()=>{window.liveURLs=new Set();const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=b=>{const u=create(b);liveURLs.add(u);return u;};URL.revokeObjectURL=u=>{liveURLs.delete(u);revoke(u);};});
  await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
  await page.evaluate(c=>api.start(c),{...catalogue[id],id,player:'demuxe',lane:'native',componentTrial:'subtitles',correctness:false});await page.evaluate(()=>api.pause());
  const styled=['h264-ass','pcm-ass'].includes(id);
  for(const time of [.25,.75,35.9,1]){
   await page.evaluate(t=>api.seek(t),time);await page.waitForTimeout(180);
   const expected=time>=.5&&time<35.8,png=await page.locator('#stage').screenshot({path:path.join(out,id+'-'+time+'.png')});
   if(styled)assert.equal(markedImage(png,time).magentaPixels>150,expected,'ASS timing '+time);
   else {const active=await page.evaluate(()=>[...document.querySelector('#stage video').textTracks].filter(t=>t.mode==='showing').flatMap(t=>[...t.activeCues??[]].map(c=>c.text)));assert.deepEqual(active,expected?['DE MUXE TEST 123']:[]);}
   record.checks.push('caption timing at '+time);
  }
  record.lifecycle=await page.evaluate(async ({id,styled})=>{
   const p=window.componentPlayer,checks=[],ok=(x,label)=>{if(!x)throw Error(label);checks.push(label);};
   const old=p.state.subtitleTracks.find(t=>t.selected).id;
   await p.subtitleVisible(false);ok(!p.state.subtitlesVisible,'hide');await p.subtitleVisible(true);ok(p.state.subtitlesVisible,'show');
   let text;if(styled)text=await(await fetch('/fixtures/captions.ass')).text();else text='WEBVTT\n\n00:00.000 --> 00:35.000\nALTERNATE\n';
   await p.addSubtitle(new File([text],styled?'alternate.ass':'alternate.vtt'),{select:false});
   ok(p.state.subtitleTracks.find(t=>t.selected).id===old,'unselected attachment retains selection');
   const second=p.state.subtitleTracks.at(-1).id;await p.selectSubtitleTrack(second);ok(p.state.subtitleTracks.find(t=>t.selected).id===second,'track change');await p.selectSubtitleTrack(old);ok(p.state.subtitleTracks.find(t=>t.selected).id===old,'track restore');
   {let rejected=false;try{await p.addSubtitle(styled?new File([],'bad.ass'):new File(['WEBVTT\n\n00:04.000 --> 00:01.000\nINVALID'],'bad.vtt'));}catch{rejected=true;}ok(rejected&&p.state.subtitleTracks.length===2,styled?'empty ASS rejection and rollback':'malformed timing rollback');}
   await p.open(new URL('/fixtures/h264-vtt/index.mp4',location.href).href);ok(p.state.subtitleTracks.length===0,'replacement clears captions');ok(liveURLs.size===0,'replacement releases caption URLs');
   ok(!document.querySelector('.demuxe-native-ass'),'replacement removes ASS overlay');await p.play();await p.pause();
   return checks;
  },{id,styled});
  await page.waitForTimeout(200);assert.equal(page.workers().length,0,'replacement leaves no renderer worker');
  assert.equal((await page.evaluate(()=>api.snapshot())).errors.length,0);record.cleanup=await page.evaluate(()=>api.stop());assert.equal(record.cleanup.remainingSurfaces,0);assert.equal(await page.evaluate(()=>liveURLs.size),0);await page.waitForTimeout(200);assert.equal(page.workers().length,0);record.passed=true;await page.context().close();
 }
 result.passed=true;
}catch(e){result.passed=false;result.error=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await server.close();result.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
