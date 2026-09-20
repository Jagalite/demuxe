// SPDX-License-Identifier: Apache-2.0
// Basic real-bitstream screening, deliberately separate from marked qualification.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from './server.mjs';
import {decodePNG,markedAudio,markedImage} from './checks.mjs';
import {closeBrowserObserved} from './browser-exit.mjs';
const [assetArg,outArg,laneArg='auto',onlyArg]=process.argv.slice(2),assets=path.resolve(assetArg),out=path.resolve(outArg);
const sha=b=>createHash('sha256').update(b).digest('hex'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function deadline(p,ms,label){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),ms);})]);}finally{clearTimeout(timer);}}
const bytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(bytes);
for(const [name,value] of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),value.sha256,name);
const fixtures=JSON.parse(await fs.readFile(path.join(assets,'specialist.json')));
await fs.mkdir(out);await fs.mkdir(path.join(out,'files'));
for(const name of ['specialist-screen.mjs','prepare-specialist-fixtures.py','prepare-library-fixtures.py','server.mjs','harness.html','adapters.mjs','checks.mjs','browser-exit.mjs'])await fs.copyFile(path.join(import.meta.dirname,name),path.join(out,'files',name));
await fs.writeFile(path.join(out,'assets-manifest.json'),bytes);
await fs.copyFile(path.join(assets,'specialist.json'),path.join(out,'fixtures.json'));
await fs.copyFile(path.join(assets,'fixtures/specialist/commands.json'),path.join(out,'preparation-commands.json'));
await fs.copyFile(path.join(assets,'fixtures/library/commands.json'),path.join(out,'library-preparation-commands.json'));
for(const [key,f] of Object.entries(fixtures))if(f.subtitleCheck==='bitmap'){const b=await fs.readFile(path.join(assets,'fixtures/library',key+'-oracle.png'));assert(markedImage(b,1).magentaPixels>150,'Host subtitle oracle '+key);await fs.writeFile(path.join(out,key+'-host-oracle.png'),b);}
for(const key of ['dv5','dv81'])await fs.copyFile(path.join(assets,'fixtures/specialist',key+'.frames.json'),path.join(out,key+'-rpu-frames.json'));
const audioOracles={};
for(const [key,f] of Object.entries(fixtures).filter(([k])=>!onlyArg||onlyArg.split(',').includes(k))){
 const targets=key.includes('dtshd')?[12,4]:[10,1];
 audioOracles[key]=targets.map(target=>{
  const argv=['-nostdin','-v','error','-ss',String(target),'-i',path.join(assets,'fixtures',f.file),'-vn','-t','0.5','-ac','2','-ar','8000','-f','f32le','-'];
  const bytes=execFileSync('ffmpeg',argv);let sum=0;for(let i=0;i<bytes.length;i+=4)sum+=bytes.readFloatLE(i)**2;const rms=Math.sqrt(sum/(bytes.length/4));
  assert(rms>.003,'Host source is silent at seek target '+key+': '+target);return {target,rms,argv};
 });
}
await fs.writeFile(path.join(out,'audio-oracles.json'),JSON.stringify(audioOracles,null,2)+'\n');
const server=await serve(assets,path.join(out,'files'),path.join(out,'requests.jsonl'));
const result={kind:'specialist-basic-screen',startedAt:new Date().toISOString(),command:process.argv,assetsSHA256:sha(bytes),qualificationLimit:'36-second local fixtures; visible changing frames, stereo audio energy and bounded lifecycle only. No CPU, discrete surround, losslessness, spatial objects, Dolby Vision color or physical HDR qualification.',cases:[]};
async function save(){await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');}
async function image(page,file){const png=await page.locator('#stage').screenshot({path:file,timeout:3000}),{pixels,channels}=decodePNG(png);let lit=0;for(let i=0;i<pixels.length;i+=channels)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>20)lit++;assert(lit>200,'No visible video');return {sha256:sha(png),litPixels:lit,marker:markedImage(png,await page.evaluate(()=>api.snapshot().position))};}
try{
 for(const [fixture,f] of Object.entries(fixtures).filter(([k])=>!onlyArg||onlyArg.split(',').includes(k)))for(const player of (laneArg==='auto'?['video','demuxe','movi','libmedia']:['demuxe'])){
  const id=fixture+'.'+player,record={id,fixture,player,lane:player==='demuxe'?laneArg:'default',status:'running',checks:[],console:[]};result.cases.push(record);
  let browser,page,ids;
  try{
   browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
   const cdp=await browser.newBrowserCDPSession();ids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);
   page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(12000);
   page.on('console',m=>{if(record.console.length<80)record.console.push(m.text());});
   await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
   await deadline(page.evaluate(c=>api.start(c),{...f,id,player,lane:record.lane,correctness:true}),60000,'open');
   await page.waitForFunction(()=>api.snapshot().position>2&&api.snapshot().audio.some(a=>a.rms>.003),null,{timeout:20000});
   if(f.subtitleCheck){record.subtitleSelection=await page.evaluate(()=>api.subtitles());await delay(250);}
   record.initial=await page.evaluate(()=>api.snapshot());assert(Number.isFinite(record.initial.duration)&&record.initial.duration>7,'duration');
   const first=await image(page,path.join(out,id+'-initial.png'));if(f.markedVideo)assert(first.marker.markerCorrect,'Initial marked video');if(f.markedAudio)assert(markedAudio(record.initial),'Initial marked audio');if(f.subtitleCheck)assert(first.marker.magentaPixels>150,'Initial subtitle drawing');record.checks.push('position advances with audible stereo energy and visible video');
   await page.evaluate(()=>api.pause());await delay(250);const paused=await page.evaluate(()=>api.snapshot().position);await delay(350);assert(Math.abs(await page.evaluate(()=>api.snapshot().position)-paused)<.15,'pause drift');
   await page.evaluate(()=>api.resume());await delay(500);assert(await page.evaluate(()=>api.snapshot().position)>paused+.1,'resume');record.checks.push('pause/resume');
   await page.evaluate(()=>api.rate(1.25));const before=await page.evaluate(()=>api.snapshot().position);await delay(800);const advance=await page.evaluate(()=>api.snapshot().position)-before;assert(advance>.65&&advance<1.6,'rate advance '+advance);await page.evaluate(()=>api.rate(1));record.checks.push('rate 1.25');
   record.seeks=[];
   for(const {target} of audioOracles[fixture]){
    await deadline(page.evaluate(t=>api.seek(t),target),10000,'seek');
    await page.waitForFunction(t=>Math.abs(api.snapshot().position-t)<.9&&api.snapshot().audio.some(a=>a.rms>.003),target,{timeout:12000});await delay(250);
    record.seeks.push({target,state:await page.evaluate(()=>api.snapshot()),image:await image(page,path.join(out,id+'-seek'+target+'.png'))});
    const current=record.seeks.at(-1);if(f.markedVideo)assert(current.image.marker.markerCorrect,'Seek video marker');if(f.markedAudio)assert(markedAudio(current.state),'Seek marked audio');if(f.subtitleCheck)assert(current.image.marker.magentaPixels>150,'Seek subtitle drawing');
   }
   assert(record.seeks.some(s=>s.image.sha256!==first.sha256),'Frozen surface');record.checks.push('forward/back seek with visible video and audio energy');
   const end=record.initial.duration;await deadline(page.evaluate(t=>api.seek(t),end-.7),10000,'EOF seek');await page.waitForFunction(end=>api.snapshot().position>=end-.2||api.snapshot().video?.ended,end,{timeout:12000});record.checks.push('reaches EOF');
   record.final=await page.evaluate(()=>api.snapshot());assert.equal(record.final.errors.length,0,'page/audio observer errors');record.status='passed';record.screenPassed=true;
  }catch(e){record.status='failed';record.reason=String(e.stack??e);if(page){record.failureState=await deadline(page.evaluate(()=>api.snapshot()),2000,'snapshot').catch(()=>null);await page.screenshot({path:path.join(out,id+'-failure.png'),timeout:2000}).catch(()=>{});}}
  finally{
   if(page){record.cleanup=await deadline(page.evaluate(()=>api.stop()),5000,'cleanup').catch(e=>({error:String(e)}));await delay(250);record.cleanup.workers=page.workers().length;if(record.status==='passed'&&(record.cleanup.error||record.cleanup.remainingSurfaces||record.cleanup.contexts.some(c=>c!=='closed')||record.cleanup.workers)){record.status='failed';record.screenPassed=false;record.reason='Cleanup failed';}}
   if(browser){const cdp=await browser.newBrowserCDPSession();ids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);record.browserExit=await closeBrowserObserved(browser,ids);}
   await save();console.log(id,record.status,record.reason?.split('\n')[0]??record.initial?.route);
  }
 }
}finally{
 await server.close();result.finishedAt=new Date().toISOString();await save();const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');
}
