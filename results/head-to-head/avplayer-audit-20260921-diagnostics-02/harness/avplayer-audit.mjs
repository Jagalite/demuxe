// SPDX-License-Identifier: Apache-2.0
// Diagnostic counterfactuals, not replacements for the shared correctness contract.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {serve} from './server.mjs';
import {markedImage} from './checks.mjs';
import {closeBrowserObserved} from './browser-exit.mjs';
const assets=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]);
await fs.mkdir(output);await fs.mkdir(path.join(output,'harness'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json'));
for(const [name,record] of Object.entries(JSON.parse(manifestBytes).files))if(hash(await fs.readFile(path.join(assets,name)))!==record.sha256)throw Error('Asset mismatch '+name);
await fs.writeFile(path.join(output,'assets-manifest.json'),manifestBytes);
for(const file of ['harness.html','adapters.mjs','server.mjs','checks.mjs','avplayer-audit.mjs','subtitle-ocr.swift','browser-exit.mjs'])await fs.copyFile(path.join(import.meta.dirname,file),path.join(output,'harness',file));
// All injections are retained with the diagnostic evidence. They use public APIs.
let adapter=await fs.readFile(path.join(output,'harness/adapters.mjs'),'utf8');
adapter=adapter.replace("...(['prefer-mse','live-mse'].includes(c.lane)?", "...(c.auditOptions??{}),...(['prefer-mse','live-mse'].includes(c.lane)?");
adapter=adapter.replace('await player.load(input,loadOptions);',`window.auditPlayer=player;
    for(const name of ['loaded','played','paused','seeking','seeked','ended','error'])player.on(name,(...args)=>events.push({type:name,time:Number(player.currentTime)/1000,args:plain(args)}));
    if(c.auditVttPadding)loadOptions.externalSubtitles[0].source=new File([await (await fetch(subtitle)).text(),'\\n'], 'captions.vtt',{type:'text/vtt'});
    if(c.auditFile)input=new File([await (await fetch(source)).arrayBuffer()],c.file.split('/').at(-1));
    await player.load(input,loadOptions);`);
await fs.writeFile(path.join(output,'harness/adapters.mjs'),adapter);
const fixtures=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
const allPlans=[
 ...['h264-pcm16','h264-srt','h264-ass','h264-vtt','h264-fmp4','audio-vorbis','mpeg2-mp2','hls-ts'].map(fixture=>({fixture,variant:'unobserved',correctness:false})),
 ...['h264-pcm16','audio-pcm24','h264-fmp4','vp910-opus'].map(fixture=>({fixture,variant:'file',auditFile:true,correctness:true})),
 {fixture:'h264-pcm16',variant:'no-worker',auditOptions:{enableWorker:false},correctness:true},
 {fixture:'h264-vtt',variant:'padded-vtt',auditVttPadding:true,correctness:true},
 {fixture:'h264-srt',variant:'observed',correctness:true},
 {fixture:'h264-ass',variant:'observed',correctness:true},
 {fixture:'h264-vtt',variant:'file',auditFile:true,correctness:true},
 {fixture:'h264-vtt',variant:'padded-url',auditPadURL:true,correctness:true},
 {fixture:'h264-pcm16',variant:'no-webcodecs',auditOptions:{enableWebCodecs:false},correctness:true},
 {fixture:'h264-flac',variant:'control',correctness:true},
 ...['audio-mp3','audio-opus','audio-vorbis','mpeg2-mp2','mpeg4-mp3'].map(fixture=>({fixture,variant:'no-webcodecs',auditOptions:{enableWebCodecs:false},correctness:true})),
];
const plans=process.argv[4]?allPlans.filter(p=>process.argv[4].split(',').includes(p.fixture+'.'+p.variant)):allPlans;
if(!plans.length)throw Error('No diagnostic plans selected');
const summary={kind:'avplayer-diagnostics',statusMeaning:'passed means the diagnostic sequence completed, not that playback correctness passed',command:process.argv,startedAt:new Date().toISOString(),limits:['Counterfactual diagnostic runs; not full correctness passes. Unobserved runs do not verify audible output.','Padding and File input variants change the input presentation and cannot replace original fixture results.'],cases:[]};
const save=()=>fs.writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const server=await serve(assets,path.join(output,'harness'),path.join(output,'requests.jsonl'));
const ocr=path.join(output,'ocr');execFileSync('swiftc',[path.join(output,'harness/subtitle-ocr.swift'),'-o',ocr]);
const deadline=async(p,ms)=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('diagnostic deadline')),ms))]);}finally{clearTimeout(timer);}};
let browser;
try{for(const plan of plans){
 const id=plan.fixture+'.'+plan.variant,dir=path.join(output,id);await fs.mkdir(dir);
 const record={id,plan,status:'passed',recordPath:id+'/result.json',samples:[],console:[]};summary.cases.push(record);await save();
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});summary.browser=browser.version();
 const page=await browser.newPage({viewport:{width:960,height:540}});page.on('console',m=>record.console.length<60&&record.console.push(m.text()));page.on('pageerror',e=>record.console.length<60&&record.console.push(e.stack));
 const sample=async label=>{const state=await page.evaluate(()=>({...api.snapshot(),status:auditPlayer.getStatus(),hasAudio:auditPlayer.hasAudio(),hasVideo:auditPlayer.hasVideo(),hasSubtitle:auditPlayer.hasSubtitle(),subtitle:auditPlayer.getSelectedSubtitleStreamId()}));const file=path.join(dir,label+'.png');const png=await page.locator('#stage').screenshot({path:file});record.samples.push({label,state,image:markedImage(png,state.position),ocr:execFileSync(ocr,[file],{encoding:'utf8'}).trim()});await save();};
 try{
  if(plan.auditPadURL)await page.route('**/fixtures/captions.vtt',async route=>route.fulfill({status:200,contentType:'text/vtt',body:await fs.readFile(path.join(assets,'fixtures/captions.vtt'),'utf8')+'\n'}));
  await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
  await deadline(page.evaluate(c=>api.start(c),{id,player:'libmedia',lane:'default',...fixtures[plan.fixture],...plan}),25000);
  await page.waitForTimeout(1800);await page.evaluate(()=>api.subtitles());await sample('initial');
  for(const target of [6,1,10]){await deadline(page.evaluate(t=>api.seek(t),target),12000);await page.waitForTimeout(250);await sample('seek-'+target+'-early');await page.waitForTimeout(1600);await sample('seek-'+target+'-late');}
  const end=await page.evaluate(()=>api.snapshot().duration);if(end>10){await deadline(page.evaluate(t=>api.seek(t),end-.65),12000);await page.waitForTimeout(2500);await sample('eof-early');await page.waitForTimeout(3500);await sample('eof-late');}
 }catch(e){record.status='failed';record.reason=String(e);await sample('failure').catch(()=>{});}
 finally{record.cleanup=await deadline(page.evaluate(()=>api.stop()),5000).catch(e=>({error:String(e)}));const cdp=await browser.newBrowserCDPSession();const ids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);await cdp.detach();record.browserCleanup=await closeBrowserObserved(browser,ids);browser=null;await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(record,null,2)+'\n');await save();console.log(id,record.status,record.reason??'');}
}}finally{await browser?.close();await server.close();}
summary.finishedAt=new Date().toISOString();await save();
const sha256={};for(const file of await fs.readdir(output,{recursive:true})){const p=path.join(output,file);if((await fs.stat(p)).isFile())sha256[file]=hash(await fs.readFile(p));}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({sha256},null,2)+'\n');
