// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {chromium,firefox} from 'playwright';
import {serve} from './server.mjs';
import {markedAudio,markedImage,selectCases,performanceEligible} from './checks.mjs';

const here=import.meta.dirname,repo=path.resolve(here,'../..');
const {values:args}=parseArgs({options:{assets:{type:'string'},output:{type:'string'},cases:{type:'string',default:'all'},
  browser:{type:'string',default:'chromium'},channel:{type:'string',default:'chrome'},headed:{type:'boolean',default:false},
  'negative-control':{type:'string'},catalogue:{type:'boolean',default:false},
  performance:{type:'boolean',default:false},exclusive:{type:'boolean',default:false},correctness:{type:'string'},rounds:{type:'string',default:'3'},
  'measure-seconds':{type:'string',default:'20'},'warmup-seconds':{type:'string',default:'5'},list:{type:'boolean',default:false}}});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let matrix=JSON.parse(await fs.readFile(path.join(here,'matrix.json')));
if(args.catalogue) {
  if(!args.assets)throw Error('--catalogue requires --assets');
  const fixtures=JSON.parse(await fs.readFile(path.resolve(args.assets,'fixtures/catalogue.json')));
  matrix={schema:2,fixtures,cases:Object.entries(fixtures).flatMap(([fixture,f])=>[
    ['video','default'],['demuxe','auto'],['movi','default'],['libmedia','default']
  ].map(([player,lane])=>({id:`${player}.${lane}.${fixture}`,player,lane,fixture,
    requirements:[...(f.video?['moving-video']:[]),...(f.audio?['marked-audio']:[]),'pause-resume','rate',...(f.live?['live-window']:['seek','eof']),'cleanup',...(f.subtitleCheck?['subtitle-output']:[])],
    ...(f.qualificationLimit?{qualificationLimit:f.qualificationLimit}:{})}))) };
}

const selected=selectCases(matrix,args.cases);
if(args.list){for(const c of selected)console.log(c.id);process.exit(0);}
if(!args.assets)throw Error('--assets is required; prepare a snapshot with setup.py');
if(!['chromium','firefox'].includes(args.browser))throw Error('Browser must be chromium or firefox');
if(args['negative-control']&&args['negative-control']!=='cover')throw Error('The supported negative control is cover');
if(args.performance&&args['negative-control'])throw Error('Negative controls are correctness-only');
if(args.performance&&(!args.correctness||!args.headed||!args.exclusive||args.browser!=='chromium'))throw Error('Performance requires --correctness <run>/summary.json, --headed, Chromium and --exclusive (no concurrent builds/benchmarks)');
const rounds=Number(args.rounds),measureSeconds=Number(args['measure-seconds']),warmupSeconds=Number(args['warmup-seconds']);
if(args.performance&&(!Number.isInteger(rounds)||rounds<3||measureSeconds<20||warmupSeconds<5))throw Error('Performance requires at least 3 rounds, 5s warmup and 20s measurement');
const assets=path.resolve(args.assets),manifestBytes=await fs.readFile(path.join(assets,'manifest.json'));
const manifest=JSON.parse(manifestBytes);
if(args.performance&&manifest.fixture?.duration<warmupSeconds+measureSeconds+5)throw Error('Prepare a longer fixture for the requested measurement window');
for(const [name,record]of Object.entries(manifest.files)) {
  const file=path.resolve(assets,name);
  if(!file.startsWith(assets+path.sep)||hash(await fs.readFile(file))!==record.sha256)throw Error('Asset snapshot mismatch: '+name);
}
const stamp=new Date().toISOString().replaceAll(':','-');
const output=path.resolve(args.output??`results/head-to-head/${stamp}-${args.performance?'performance':'correctness'}`);
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output); // EEXIST intentionally prevents overwrites.
const sourceNames=['run.mjs','server.mjs','checks.mjs','adapters.mjs','harness.html','matrix.json','assets.lock.json','setup.py','expand.py','planned.json','subtitle-ocr.swift','bitmap.py'];
const sourceHashes={};
await fs.mkdir(path.join(output,'files','harness'),{recursive:true});
for(const name of sourceNames){const bytes=name==='matrix.json'?Buffer.from(JSON.stringify(matrix,null,2)+'\n'):await fs.readFile(path.join(here,name));sourceHashes[name]=hash(bytes);await fs.writeFile(path.join(output,'files','harness',name),bytes);}
const harnessSHA256=hash(JSON.stringify(sourceHashes));
// Independently decode authored bitmap subtitles before interpreting browser failures.
for(const key of new Set(selected.map(c=>c.fixture).filter(key=>['hevc-pgs','h264-vobsub'].includes(key)))) {
  const fixture=matrix.fixtures[key];if(fixture.blockedReason)continue;
  const target=path.join(output,'files','bitmap-oracles');await fs.mkdir(target,{recursive:true});
  const png=path.join(target,key+'.png');
  const argv=['-nostdin','-v','error','-i',path.join(assets,'fixtures',fixture.file),'-filter_complex','[0:v][0:s]overlay','-ss','1','-frames:v','1',png];
  execFileSync('ffmpeg',argv,{timeout:30000});
  const proof=markedImage(await fs.readFile(png),1);
  await fs.writeFile(path.join(target,key+'.json'),JSON.stringify({argv,proof},null,2)+'\n');
  if(!proof.markerCorrect||proof.magentaPixels<150)throw Error('Authored bitmap subtitle failed independent decode oracle: '+key);
}
const previous=args.correctness?JSON.parse(await fs.readFile(path.resolve(args.correctness))):null;
const summary={schema:1,kind:args.performance?'performance':'correctness',startedAt:new Date().toISOString(),
  assets,assetsSHA256:hash(manifestBytes),harnessSHA256,sourceHashes,gitRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
  playerSourceRevision:manifest.git_revision,host:{platform:os.platform(),release:os.release(),architecture:os.arch(),cpus:os.cpus().length},
  command:{argv:process.argv,cwd:process.cwd()},
  selected:selected.map(c=>c.id),cases:[],limits:['Short synthetic marked-output screen; no exhaustive codec/fidelity, physical audio/display or release qualification.',
    'Startup is API/wall timing, not first sound/photon. Correctness uses intrusive audio analysis and screenshots.',
    'Fresh browser contexts do not flush OS caches. Host-library subtitle overlays are explicitly labeled.']};
await fs.writeFile(path.join(output,'assets-manifest.json'),manifestBytes);
if(args.catalogue)for(const name of ['fixtures/catalogue.json','commands.json']){const target=path.join(output,'files','preparation',name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(assets,name),target);}
if(args.catalogue&&await fs.stat(path.join(assets,'preparation')).catch(()=>null))await fs.cp(path.join(assets,'preparation'),path.join(output,'files/preparation/sources'),{recursive:true});
const save=async()=>fs.writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
await save();
const server=await serve(assets,path.join(output,'files','harness'),path.join(output,'requests.jsonl'));
let active;
let ocrDirectory,ocrBinary;
if(args.catalogue&&selected.some(c=>matrix.fixtures[c.fixture].subtitleCheck==='text')&&process.platform==='darwin') {
  ocrDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'demuxe-subtitle-ocr-'));
  ocrBinary=path.join(ocrDirectory,'ocr');
  try{execFileSync('swiftc',[path.join(output,'files/harness/subtitle-ocr.swift'),'-o',ocrBinary],{timeout:60000});}
  catch{ocrBinary=null;}
}

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deadline=async(promise,ms,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' deadline')),ms))]);}finally{clearTimeout(timer);}};
const expect=(condition,message)=>{if(!condition)throw Error(message);};
const stopSignal=async()=>{summary.interrupted=true;await save();await active?.close();await server.close();process.exit(130);};
process.once('SIGINT',stopSignal);process.once('SIGTERM',stopSignal);

async function correctness(page,config,result,directory) {
  const snap=()=>page.evaluate(()=>api.snapshot());
  const hasVideo=config.video!==false,hasAudio=config.audio!==false;
  const checkSubtitle=(png,state,file)=>{
    if(config.subtitleCheck==='text') {
      if(!ocrBinary)throw Error('UNQUALIFIED: subtitle OCR requires macOS Vision and swiftc');
      const text=execFileSync(ocrBinary,[file],{encoding:'utf8',timeout:5000}).trim();
      (result.subtitleOCR??=[]).push({position:state.position,text});
      expect(text.toUpperCase().replace(/[^A-Z0-9]/g,'').includes('DEMUXETEST123'),'Required subtitle text missing or incorrect');
    }
    if(['ass','bitmap'].includes(config.subtitleCheck)||config.subtitleIntegration)expect(markedImage(png,state.position).magentaPixels>150,'Required marked subtitle drawing missing');
  };
  const waitPosition=async target=>{
    await page.waitForFunction(t=>Math.abs(api.snapshot().position-t)<.8,target,{timeout:7000});
  };
  await deadline(page.evaluate(c=>api.start(c),{...config,correctness:true}),20000,'open');
  if(args['negative-control']==='cover') {
    result.negativeControl='cover';
    await page.evaluate(()=>{const cover=document.createElement('div');cover.style.cssText='position:absolute;inset:0;background:black;z-index:999999';document.querySelector('#stage').append(cover);});
  }
  await page.waitForFunction(audio=>api.snapshot().position>.65&&(!audio||api.snapshot().audio.some(a=>a.rms>.015)),hasAudio,{timeout:10000});
  if(config.subtitleCheck){result.subtitleSelection=await page.evaluate(()=>api.subtitles());await delay(250);}
  result.initial=await snap();if(hasAudio)expect(markedAudio(result.initial),'Marked left/right audio missing or incorrect');
  const first=await page.locator('#stage').screenshot({path:path.join(directory,'initial.png')});
  result.initialImage=markedImage(first,result.initial.position);if(hasVideo)expect(result.initialImage.markerCorrect,'Initial displayed timeline marker incorrect');
  await delay(600);
  const second=await page.locator('#stage').screenshot({path:path.join(directory,'moving.png')});
  result.moving=hash(first)!==hash(second);if(hasVideo)expect(result.moving,'Displayed output did not change');
  checkSubtitle(second,await snap(),path.join(directory,'moving.png'));
  await page.evaluate(()=>api.pause());await delay(180);const paused=(await snap()).position;await delay(250);
  expect(Math.abs((await snap()).position-paused)<.12,'Pause did not stop the timeline');
  await page.evaluate(()=>api.resume());await delay(300);expect((await snap()).position>paused+.08,'Resume did not advance');
  await page.evaluate(()=>api.rate(1.25));const r1=(await snap()).position;await delay(800);const r2=(await snap()).position;
  result.rateAdvance=r2-r1;expect(result.rateAdvance>.7&&result.rateAdvance<1.5,'Playback-rate progression outside bounded tolerance');
  await page.evaluate(()=>api.rate(1));
  if(config.live) {
    result.liveSamples=[];
    for(let i=0;i<4;i++){await delay(2200);result.liveSamples.push(await snap());}
    expect(result.liveSamples.at(-1).position-result.liveSamples[0].position>5,'Live playback failed to advance across segment updates');
    expect(!result.liveSamples.at(-1).errors.length,'Player errors during live playback');
    result.qualificationLimit='Bounded live-window progression only; long-running recovery and discontinuities not covered.';
    return;
  }
  result.seeks=[];
  for(const target of [6,1,10]) {
    await deadline(page.evaluate(t=>api.seek(t),target),10000,'seek');await waitPosition(target);await delay(180);
    const state=await snap();const png=await page.locator('#stage').screenshot({path:path.join(directory,`seek-${target}.png`)});
    const image=markedImage(png,state.position);result.seeks.push({target,state,image});
    expect(Math.abs(state.position-target)<1,'Seek position incorrect');if(hasVideo)expect(image.markerCorrect,'Seek displayed stale/wrong timeline marker');
    if(hasAudio)expect(markedAudio(state),'Audio missing/wrong after seek');
    checkSubtitle(png,state,path.join(directory,`seek-${target}.png`));
  }
  const end=(await snap()).duration;
  expect(Number.isFinite(end)&&end>10,'Missing finite duration');
  await deadline(page.evaluate(t=>api.seek(t),end-.65),10000,'near-EOF seek');
  await page.waitForFunction(end=>api.snapshot().position>=end-.2||api.snapshot().video?.ended,end,{timeout:7000});
  await delay(700);result.eof=await snap();expect(result.eof.position>=end-.2,'EOF did not reach final media region');
  await delay(400);expect(Math.abs((await snap()).position-result.eof.position)<.1,'EOF timeline did not settle');
  expect(!result.eof.errors.length,'Player reported errors: '+result.eof.errors.join('; '));
}

async function measure(page,config,result,browser) {
  const before=Date.now();await deadline(page.evaluate(c=>api.start(c),config),20000,'open');
  result.openWallMs=Date.now()-before;
  await page.waitForFunction(()=>api.snapshot().position>.25,null,{timeout:10000});
  await delay(warmupSeconds*1000);
  const cdp=await browser.newBrowserCDPSession();
  if(!(await page.evaluate(()=>api.snapshot())).video)throw Error('UNQUALIFIED: no comparable dropped-frame counters for this custom route');
  result.samples=[];
  for(let tick=0;tick<=measureSeconds;tick+=2) {
    const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
    const state=await page.evaluate(()=>api.snapshot());
    expect(state.visible&&state.focused,'Performance window lost foreground/focus');
    expect(!state.errors.length,'Player errors during measurement');
    let rssKiB=null;
    if(['darwin','linux'].includes(os.platform()))try{rssKiB=execFileSync('ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split(/\s+/).reduce((a,x)=>a+Number(x),0);}catch{}
    result.samples.push({at:Date.now(),processes,rssKiB,state});
    if(tick+2<=measureSeconds)await delay(2000);
  }
  const first=result.samples[0],last=result.samples.at(-1);
  const ids=sample=>sample.processes.map(p=>p.id).sort().join(',');
  expect(result.samples.every(s=>ids(s)===ids(first)),'Process turnover makes this CPU window invalid');
  const wall=(last.at-first.at)/1000,advance=last.state.position-first.state.position;
  expect(Math.abs(advance-wall)<1,'Playback stalled or reached EOF during measurement');
  const cpu=sample=>sample.processes.reduce((sum,p)=>sum+p.cpuTime,0);
  const dropped=first.state.video&&last.state.video?last.state.video.dropped-first.state.video.dropped:null;
  if(dropped!==null)expect(dropped<=Math.max(2,wall*30*.01),'Excessive dropped frames');
  result.measurement={wallSeconds:wall,cpuSeconds:cpu(last)-cpu(first),oneCorePercent:100*(cpu(last)-cpu(first))/wall,
    peakSummedRssKiB:Math.max(...result.samples.map(s=>s.rssKiB??0)),droppedFrames:dropped,
    scope:'CDP-listed browser processes; excludes server, external media services and physical energy. Summed RSS can double count shared pages. Custom-path dropped frames unavailable.'};
}

try {
  const schedule=args.performance?Array.from({length:rounds},(_,round)=>selected.map((_,i)=>({...selected[(i+round)%selected.length],round:round+1}))).flat():selected;
  for(const c of schedule) {
    const result={...c,status:'running',startedAt:new Date().toISOString(),console:[],requestFailures:[]};summary.cases.push(result);
    const recordName=c.id+(c.round?'.round-'+c.round:'');result.recordPath=recordName+'/result.json';
    const directory=path.join(output,recordName);await fs.mkdir(directory);await save();
    const fixture=matrix.fixtures[c.fixture];
    if(fixture.blockedReason) {
      result.status='blocked';result.reason=fixture.blockedReason;
      await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');await save();
      console.log('BLOCKED',c.id,result.reason);continue;
    }
    if(c.player==='demuxe'&&c.subtitleIntegration==='built-in'&&!manifest.engines['engine-hybrid']&&!manifest.engines['engine-software-full']) {
      result.status='blocked';result.reason='Current Demuxe Hybrid/Software engine assets are absent; no legacy binaries substituted.';
      await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');await save();continue;
    }
    let page;
    try {
      active=await (args.browser==='firefox'?firefox:chromium).launch({headless:!args.headed,
        ...(args.browser==='chromium'&&args.channel?{channel:args.channel}:{}),
        args:args.browser==='chromium'?['--autoplay-policy=no-user-gesture-required']:[],timeout:20000});
      summary.browserIdentity=args.browser+'/'+active.version()+'/'+(args.channel||'bundled')+'/'+(args.headed?'headed':'headless');
      if(args.performance&&!performanceEligible(previous,summary,c.id)) {result.status='blocked';result.reason='No matching passed correctness record for these assets, harness and browser';continue;}
      const context=await active.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
      page=await context.newPage();page.setDefaultTimeout(10000);
      page.on('console',m=>result.console.length<80&&result.console.push(m.text()));
      page.on('pageerror',e=>result.console.length<80&&result.console.push(e.message));
      page.on('requestfailed',q=>result.requestFailures.push({url:q.url(),error:q.failure()}));
      page.on('response',r=>{if(r.status()>=400)result.requestFailures.push({url:r.url(),status:r.status()});});
      await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
      const config={...c,...matrix.fixtures[c.fixture]};
      await (args.performance?measure(page,config,result,active):correctness(page,config,result,directory));
      result.status='passed';
      if(config.qualificationLimit){result.screenPassed=true;result.status='blocked';result.reason=config.qualificationLimit;}
    } catch(error) {
      result.status='failed';result.reason=String(error.stack??error);
      if(c.player==='demuxe'&&result.requestFailures.some(r=>r.status===404&&Object.entries(manifest.engines).some(([name,exists])=>!exists&&r.url.includes('/'+name+'/')))){result.status='blocked';result.reason='Required current Demuxe engine assets are absent. '+result.reason;}
      if(result.reason.includes('UNQUALIFIED:'))result.status='blocked';
      if(/Executable doesn't exist|Chromium distribution.*not found/.test(result.reason))result.status='blocked';
      if(page){result.failureState=await deadline(page.evaluate(()=>api.snapshot()),2000,'failure snapshot').catch(()=>null);await page.screenshot({path:path.join(directory,'failure.png'),timeout:2000}).catch(()=>{});}
    } finally {
      if(page) {
        result.cleanup=await deadline(page.evaluate(()=>api.stop()),4000,'cleanup').catch(error=>({error:String(error)}));
        await delay(400);result.workersAfter=page.workers().length;
        if((result.status==='passed'||result.screenPassed)&&(result.cleanup.error||result.cleanup.remainingSurfaces||result.workersAfter||result.cleanup.contexts.some(s=>s!=='closed'))) {
          result.status='failed';result.reason='Cleanup did not release observed surfaces, contexts or workers';
        }
      }
      await active?.close();active=null;result.finishedAt=new Date().toISOString();
      await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');await save();
      console.log(result.status.toUpperCase(),c.id,result.reason?.split('\n')[0]??'');
    }
  }
} finally {await active?.close();await server.close();if(ocrDirectory)await fs.rm(ocrDirectory,{recursive:true,force:true});}
summary.finishedAt=new Date().toISOString();
summary.counts=Object.fromEntries(['passed','failed','blocked','skipped'].map(s=>[s,summary.cases.filter(c=>c.status===s).length]));
summary.passed=summary.cases.every(c=>c.status==='passed');await save();
const lines=['# Head-to-head '+summary.kind,'',`Browser: ${summary.browserIdentity??'unavailable'}. Player source: ${summary.playerSourceRevision}.`,'',
  'Each pass is a bounded synthetic marked-output/lifecycle screen, not a general player ranking.','', '| Case | Result | Details |','| --- | --- | --- |'];
for(const c of summary.cases)lines.push(`| ${c.id}${c.round?' round '+c.round:''} | ${c.status} | [record](${c.recordPath}) |`);
await fs.writeFile(path.join(output,'REPORT.md'),lines.join('\n')+'\n');
const captured={};
for(const name of (await fs.readdir(output,{recursive:true})).sort()) {
  const file=path.join(output,name);
  if((await fs.stat(file)).isFile())captured[name.replaceAll(path.sep,'/')]=hash(await fs.readFile(file));
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({schema:1,scope:'Captured run files; prepared dependency/fixture/runtime hashes are in assets-manifest.json.',sha256:captured},null,2)+'\n');
console.log(JSON.stringify({output,...summary.counts},null,2));
process.exitCode=summary.passed?0:1;
