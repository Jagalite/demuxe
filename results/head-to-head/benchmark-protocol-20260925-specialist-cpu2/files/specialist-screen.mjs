// SPDX-License-Identifier: Apache-2.0
// Basic real-bitstream screening, deliberately separate from marked qualification.
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,benchmarkPolicy,CpuBrowserBlocks} from './benchmark-browser.mjs';
import assert from 'node:assert/strict';
import {CampaignProgress} from './campaign-progress.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from './server.mjs';
import {decodePNG,markedAudio,markedImage} from './checks.mjs';
import {closeBrowserObserved} from './browser-exit.mjs';
const cli=process.argv.slice(2),reuseIndex=cli.indexOf('--correctness');
const reusePath=reuseIndex<0?null:cli.splice(reuseIndex,2)[1];
if(reuseIndex>=0&&!reusePath)throw Error('--correctness requires a completed specialist summary');
const [assetArg,outArg,laneArg='auto',onlyArg,cpuArg]=cli,assets=path.resolve(assetArg),out=path.resolve(outArg);
const previous=reusePath?JSON.parse(await fs.readFile(path.resolve(reusePath))):null;
if(previous&&!cpuArg)throw Error('--correctness is for CPU rounds only');
if(!['auto','demuxe-auto','native','hybrid','software','configured-alternatives','competitors'].includes(laneArg))throw Error('Unknown lane '+laneArg);
if(cpuArg&&!/^cpu[1-5]$/.test(cpuArg))throw Error('Expected optional cpu1 through cpu5 flag');
const sha=b=>createHash('sha256').update(b).digest('hex'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function deadline(p,ms,label){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),ms);})]);}finally{clearTimeout(timer);}}
const bytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(bytes);
for(const [name,value] of Object.entries(manifest.files))assert.equal(sha(await fs.readFile(path.join(assets,name))),value.sha256,name);
const fixtures=JSON.parse(await fs.readFile(path.join(assets,'specialist.json')));
await fs.mkdir(out);await fs.mkdir(path.join(out,'files'));
const sourceHashes={};
for(const name of ['specialist-screen.mjs','prepare-specialist-fixtures.py','prepare-library-fixtures.py','server.mjs','harness.html','adapters.mjs','checks.mjs','browser-exit.mjs','benchmark-browser.mjs','campaign-progress.mjs']){const source=await fs.readFile(path.join(import.meta.dirname,name));sourceHashes[name]=sha(source);await fs.writeFile(path.join(out,'files',name),source);}
const harnessSHA256=sha(JSON.stringify(sourceHashes));
if(previous&&(previous.kind!=='specialist-basic-screen'||!previous.finishedAt||previous.assetsSHA256!==sha(bytes)||previous.harnessSHA256!==harnessSHA256))throw Error('Reusable specialist correctness must match completed assets and harness');
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
const result={cpuRound:cpuArg?Number(cpuArg.slice(3)):null,harnessSHA256,sourceHashes,correctnessSource:reusePath,benchmarkPolicy,kind:'specialist-basic-screen',startedAt:new Date().toISOString(),command:process.argv,assetsSHA256:sha(bytes),qualificationLimit:'36-second local fixtures; visible changing frames, stereo audio energy and bounded lifecycle only. CPU, when requested, is a 20-second whole-Chrome basic-screen window; no discrete surround, losslessness, spatial objects, Dolby Vision color or physical HDR qualification.',cases:[]};
async function save(){await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');}
async function image(page,file){const png=await page.locator('#stage').screenshot({path:file,timeout:3000}),{pixels,channels}=decodePNG(png);let lit=0;for(let i=0;i<pixels.length;i+=channels)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>20)lit++;assert(lit>200,'No visible video');return {sha256:sha(png),litPixels:lit,marker:markedImage(png,await page.evaluate(()=>api.snapshot().position))};}
// CPU arms share a fixture/round browser block after all correctness screens finish.
async function measureCpu(config,screenPassed,screenLaunch){
 const launched=await browserBlocks.acquire(config.fixture+':'+cpuArg),browser=launched.browser;
 let page,context;
 const cpu={browserLaunch:launched.identity,browserBlock:launched.blockId,blockArm:launched.armIndex,idleBeforeArm:launched.idle,accepted:false,diagnostic:!screenPassed,issues:[]};
 if(screenLaunch&&(screenLaunch.version.product!==launched.identity.version.product||screenLaunch.configurationSHA256!==launched.identity.configurationSHA256))cpu.issues.push('Browser version/configuration differs from correctness screen');
 try{
  context=await browser.newContext({viewport:benchmarkPolicy.viewport,deviceScaleFactor:1});page=await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
  try{
   await deadline(page.evaluate(c=>api.start(c),{...config,correctness:false}),60000,'CPU open');
   await page.waitForFunction(()=>api.snapshot().position>.25,null,{timeout:15000});
   if(config.subtitleCheck)await page.evaluate(()=>api.subtitles());
  }catch(error){cpu.issues.push('startup: '+String(error));}
  progress.phase('warmup',5,23);await delay(5000);progress.phase('measurement',20,3);
  const cdp=await browser.newBrowserCDPSession();
  try{cpu.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>api.snapshot()).catch(()=>null));}finally{await cdp.detach();}
  Object.assign(cpu,summarizeCpu(cpu.samples));
  const first=cpu.samples[0].state,last=cpu.samples.at(-1).state;
  cpu.advanceSeconds=last&&first?last.position-first.position:null;cpu.route=last?.route;
  cpu.droppedFrames=first?.video&&last?.video?last.video.dropped-first.video.dropped:null;
  if(!cpu.processIdsStable)cpu.issues.push('process turnover');
  if(cpu.advanceSeconds===null||Math.abs(cpu.advanceSeconds-cpu.wallSeconds)>1)cpu.issues.push('invalid playback advance');
  if(cpu.samples.some(s=>!s.state||!s.state.visible||!s.state.focused||s.state.errors.length))cpu.issues.push('state/error/focus gate');
  if(cpu.droppedFrames!==null&&(cpu.droppedFrames<0||cpu.droppedFrames>Math.max(2,(last.video.total-first.video.total)*.01)))cpu.issues.push('dropped frames');
  cpu.accepted=screenPassed&&!cpu.issues.length;
  cpu.scope='Fresh playback without correctness audio observer; whole CDP-listed Chrome family; bounded specialist screen only.';
 }finally{
  if(page)cpu.cleanup=await deadline(page.evaluate(()=>api.stop()),5000,'CPU cleanup').catch(e=>({error:String(e)}));
  if(cpu.cleanup?.error||cpu.cleanup?.remainingSurfaces||cpu.cleanup?.contexts?.some(c=>c!=='closed')){cpu.accepted=false;cpu.issues.push('cleanup failed');}
  await context?.close();
  if(cpu.issues.includes('cleanup failed'))await browserBlocks.invalidate('CPU arm cleanup failed');
 }
 return cpu;
}
let progress;const browserBlocks=new CpuBrowserBlocks();result.browserBlocks=browserBlocks.records;
try{
 const selectedEntries=Object.entries(fixtures).filter(([k])=>!onlyArg||onlyArg.split(',').includes(k));
 const offset=cpuArg?(Number(cpuArg.at(-1))-1)%selectedEntries.length:0;
 const orderedEntries=[...selectedEntries.slice(offset),...selectedEntries.slice(0,offset)];
 const schedule=orderedEntries.flatMap(([fixture,f])=>{const arms=(laneArg==='configured-alternatives'?[['movi','default'],['movi','native-first'],['libmedia','default'],['libmedia','prefer-mse']]:(laneArg==='auto'?['video','demuxe','movi','libmedia']:laneArg==='competitors'?['movi','libmedia']:['demuxe']).map(player=>[player,player==='demuxe'?(laneArg==='demuxe-auto'?'auto':laneArg):'default']));const shift=cpuArg?(Number(cpuArg.at(-1))-1)%arms.length:0;return [...arms.slice(shift),...arms.slice(0,shift)].map(([player,lane])=>({fixture,f,player,lane}));});
 progress=new CampaignProgress({total:schedule.length*(previous?1:cpuArg?2:1),output:path.join(out,'progress.json'),estimateSeconds:45});browserBlocks.progress=progress;
 for(const {fixture,f,player,lane} of schedule){
  const id=fixture+'.'+player+(laneArg==='configured-alternatives'?'.'+lane:''),record={id,fixture,player,lane,status:'running',checks:[],console:[]};result.cases.push(record);
  if(previous){const proof=previous.cases.find(c=>c.fixture===fixture&&c.player===player&&c.lane===lane);if(!proof)throw Error('Missing reusable specialist screen: '+id);Object.assign(record,structuredClone(proof),{recordPath:id+'.json',correctnessSource:reusePath});delete record.cpu;delete record.cpuUnavailable;result.browser=previous.browser;continue;}
  progress.start(id+' correctness');progress.phase('correctness checks');
  let browser,page,ids;
  try{
   const launched=await launchBenchmarkChrome();browser=launched.browser;record.browserLaunch=launched.identity;result.browser=browser.version();
   const cdp=await browser.newBrowserCDPSession();ids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);
   page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(12000);
   page.on('console',m=>{if(record.console.length<80)record.console.push(m.text());});
   await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
   record.recordPath=id+'.json';
   record.stage='open';
   await deadline(page.evaluate(c=>api.start(c),{...f,id,player,lane:record.lane,correctness:true}),60000,'open');
   record.stage='initial-playback';
   await page.waitForFunction(()=>api.snapshot().position>2&&api.snapshot().audio.some(a=>a.rms>.003),null,{timeout:20000});
   record.stage='initial-output';
   if(f.subtitleCheck){record.subtitleSelection=await page.evaluate(()=>api.subtitles());await delay(250);}
   record.initial=await page.evaluate(()=>api.snapshot());assert(Number.isFinite(record.initial.duration)&&record.initial.duration>7,'duration');
   const first=await image(page,path.join(out,id+'-initial.png'));if(f.markedVideo)assert(first.marker.markerCorrect,'Initial marked video');if(f.markedAudio)assert(markedAudio(record.initial),'Initial marked audio');record.initialPlaybackPassed=true;record.stage='initial-subtitles';if(f.subtitleCheck)assert(first.marker.magentaPixels>150,'Initial subtitle drawing');record.checks.push('position advances with audible stereo energy and visible video');
   record.stage='pause-resume';
   await page.evaluate(()=>api.pause());await delay(250);const paused=await page.evaluate(()=>api.snapshot().position);await delay(350);assert(Math.abs(await page.evaluate(()=>api.snapshot().position)-paused)<.15,'pause drift');
   await page.evaluate(()=>api.resume());await delay(500);assert(await page.evaluate(()=>api.snapshot().position)>paused+.1,'resume');record.checks.push('pause/resume');
   record.stage='playback-rate';
   await page.evaluate(()=>api.rate(1.25));const before=await page.evaluate(()=>api.snapshot().position);await delay(800);const advance=await page.evaluate(()=>api.snapshot().position)-before;assert(advance>.65&&advance<1.6,'rate advance '+advance);await page.evaluate(()=>api.rate(1));record.checks.push('rate 1.25');
   record.seeks=[];
   for(const {target} of audioOracles[fixture]){
    record.stage='seek-'+target;
    await deadline(page.evaluate(t=>api.seek(t),target),10000,'seek');
    await page.waitForFunction(t=>Math.abs(api.snapshot().position-t)<.9&&api.snapshot().audio.some(a=>a.rms>.003),target,{timeout:12000});await delay(250);
    record.seeks.push({target,state:await page.evaluate(()=>api.snapshot()),image:await image(page,path.join(out,id+'-seek'+target+'.png'))});
    const current=record.seeks.at(-1);if(f.markedVideo)assert(current.image.marker.markerCorrect,'Seek video marker');if(f.markedAudio)assert(markedAudio(current.state),'Seek marked audio');if(f.subtitleCheck)assert(current.image.marker.magentaPixels>150,'Seek subtitle drawing');
   }
   assert(record.seeks.some(s=>s.image.sha256!==first.sha256),'Frozen surface');record.checks.push('forward/back seek with visible video and audio energy');
   record.stage='near-eof';
   const end=record.initial.duration;await deadline(page.evaluate(t=>api.seek(t),end-.7),10000,'EOF seek');await page.waitForFunction(end=>api.snapshot().position>=end-.2||api.snapshot().video?.ended,end,{timeout:12000});record.checks.push('reaches EOF');
   record.final=await page.evaluate(()=>api.snapshot());assert.equal(record.final.errors.length,0,'page/audio observer errors');record.status='passed';record.screenPassed=true;
  }catch(e){record.failureStage=record.stage??'setup';record.status='failed';record.reason=String(e.stack??e);if(page){record.failureState=await deadline(page.evaluate(()=>api.snapshot()),2000,'snapshot').catch(()=>null);await page.screenshot({path:path.join(out,id+'-failure.png'),timeout:2000}).catch(()=>{});}
  }
  finally{
   if(page){record.cleanup=await deadline(page.evaluate(()=>api.stop()),5000,'cleanup').catch(e=>({error:String(e)}));await delay(250);record.cleanup.workers=page.workers().length;if(record.status==='passed'&&(record.cleanup.error||record.cleanup.remainingSurfaces||record.cleanup.contexts.some(c=>c!=='closed')||record.cleanup.workers)){record.status='failed';record.screenPassed=false;record.failureStage='cleanup';record.reason='Cleanup failed';}}
   if(browser){const cdp=await browser.newBrowserCDPSession();ids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);record.browserExit=await closeBrowserObserved(browser,ids);}
   record.recordPath=id+'.json';await fs.writeFile(path.join(out,record.recordPath),JSON.stringify(record,null,2)+'\n');
   progress.finish(record.status);await save();console.log(id,record.status,record.reason?.split('\n')[0]??record.initial?.route);
  }
 }
 if(cpuArg)for(const record of result.cases){
  progress.start(record.id+' '+cpuArg);
  if(record.status!=='passed'&&cpuArg!=='cpu1'){record.cpuUnavailable='Correctness failed; repeated qualification CPU skipped';progress.finish('blocked');await fs.writeFile(path.join(out,record.recordPath),JSON.stringify(record,null,2)+'\n');continue;}
  try{record.cpu=await measureCpu({...fixtures[record.fixture],id:record.id,fixture:record.fixture,player:record.player,lane:record.lane},record.status==='passed',record.browserLaunch);}catch(error){record.cpuUnavailable=String(error.stack??error);}
  await fs.writeFile(path.join(out,record.recordPath),JSON.stringify(record,null,2)+'\n');await save();progress.finish(record.cpu?.accepted?'passed':'diagnostic-or-rejected');
 }
}finally{
 progress?.close();await browserBlocks.close();await server.close();result.finishedAt=new Date().toISOString();await save();const hashes={};for(const name of await fs.readdir(out,{recursive:true}))if((await fs.stat(path.join(out,name))).isFile())hashes[name]=sha(await fs.readFile(path.join(out,name)));await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:hashes},null,2)+'\n');
}
