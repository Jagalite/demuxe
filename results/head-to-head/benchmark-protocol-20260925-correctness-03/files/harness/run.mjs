// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {firefox} from 'playwright';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,benchmarkPolicy,CpuBrowserBlocks} from './benchmark-browser.mjs';
import {serve} from './server.mjs';
import {CampaignProgress} from './campaign-progress.mjs';
import {markedAudio,markedImage,selectCases,performanceEligible} from './checks.mjs';
import {frameObservation,validateFrameWindow} from './performance-metrics.mjs';
import {closeBrowserObserved} from './browser-exit.mjs';

const here=import.meta.dirname,repo=path.resolve(here,'../..');
const {values:args}=parseArgs({options:{assets:{type:'string'},output:{type:'string'},cases:{type:'string',default:'all'},
  browser:{type:'string',default:'chromium'},channel:{type:'string',default:'chrome'},headed:{type:'boolean',default:false},
  'negative-control':{type:'string'},catalogue:{type:'boolean',default:false},
  'configured-alternatives':{type:'boolean',default:false},
  'component-trial':{type:'string'},
  'demuxe-mode':{type:'string',default:'auto'},
  'include-software':{type:'boolean',default:false},
  'include-hybrid':{type:'boolean',default:false},
  'controlled-streaming':{type:'boolean',default:false},
  'streaming-backends':{type:'boolean',default:false},
  performance:{type:'boolean',default:false},exclusive:{type:'boolean',default:false},correctness:{type:'string'},rounds:{type:'string',default:'3'},
  'diagnostic-failed-cpu':{type:'boolean',default:false},
  'screened-cpu':{type:'boolean',default:false},
  'measure-seconds':{type:'string',default:'20'},'warmup-seconds':{type:'string',default:'5'},list:{type:'boolean',default:false}}});
if(args['component-trial']&&(!args.catalogue||args['demuxe-mode']!=='native'||!['subtitles','audio','dash','direct'].includes(args['component-trial'])))throw Error('Component trials require catalogue, explicit Native, and a known lab strategy');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(!['auto','native','hybrid','software'].includes(args['demuxe-mode']))throw Error('Invalid Demuxe mode');
if(!args.catalogue&&args['demuxe-mode']!=='auto')throw Error('--demuxe-mode requires --catalogue');
if(args['include-software']&&(!args.catalogue||args['demuxe-mode']!=='auto'))throw Error('--include-software requires --catalogue with automatic Demuxe routing');
if(args['include-hybrid']&&(!args.catalogue||args['demuxe-mode']!=='auto'))throw Error('--include-hybrid requires --catalogue with automatic Demuxe routing');
if(args['include-software']&&args['streaming-backends'])throw Error('--include-software and --streaming-backends cannot be combined');
if(args['include-hybrid']&&args['streaming-backends'])throw Error('--include-hybrid and --streaming-backends cannot be combined');
if(args['streaming-backends']&&(!args.catalogue||args['demuxe-mode']!=='auto'||!args['controlled-streaming']))throw Error('--streaming-backends requires --catalogue --controlled-streaming and auto policy');
if(args['configured-alternatives']&&!args.catalogue)throw Error('--configured-alternatives requires --catalogue');
let matrix=JSON.parse(await fs.readFile(path.join(here,'matrix.json')));
if(args.catalogue) {
  if(!args.assets)throw Error('--catalogue requires --assets');
  const fixtures=JSON.parse(await fs.readFile(path.resolve(args.assets,'fixtures/catalogue.json')));
  matrix={schema:2,fixtures,cases:Object.entries(fixtures).flatMap(([fixture,f])=>[
    ['video','default'],['demuxe',args['demuxe-mode']],...(args['include-software']?[['demuxe','software']]:[]),...(args['include-hybrid']?[['demuxe','hybrid']]:[]),['movi','default'],['libmedia','default'],...(args['configured-alternatives']?[['movi','native-first'],['libmedia','prefer-mse'],['libmedia','webcodecs-off'],...(!f.streamFormat&&!f.live?[['libmedia','file-input']]:[]),...(f.streamFormat?[['movi','shaka-first']]:[]),...(f.live?[['libmedia','live'],['libmedia','live-mse']]:[])]:[]),...(args['streaming-backends']?[['demuxe','hybrid'],['demuxe','software']]:[])
  ].map(([player,lane])=>({id:`${player}.${lane}.${fixture}`,player,lane,fixture,
    requirements:[...(f.video?['moving-video']:[]),...(f.audio?['marked-audio']:[]),'pause-resume','rate',...(f.live?['live-window']:['seek','eof']),'cleanup',...(f.subtitleCheck?['subtitle-output']:[])],
    ...(f.qualificationLimit?{qualificationLimit:f.qualificationLimit}:{})}))) };
}

const selected=selectCases(matrix,args.cases);
if(args['component-trial']){const allowed={subtitles:['h264-srt','h264-movtext','h264-ass','pcm-ass'],audio:['h264-ac3','h264-eac3','h264-dts','hevc10-ac3','hevc10-eac3','hevc10-dts','hdr10-hevc','hevc-pgs','h264-vobsub'],dash:['dash-h264','dash-av1'],direct:['hls-live','hevc-pgs','h264-vobsub']}[args['component-trial']];if(selected.some(c=>c.player!=='demuxe'||!allowed.includes(c.fixture)))throw Error('Component trial is restricted to its authored Demuxe fixtures');}
if(args['negative-control']==='hide-subtitles'&&selected.some(c=>matrix.fixtures[c.fixture].subtitleCheck!=='text'))throw Error('hide-subtitles requires text-subtitle cases');
if(args.list){for(const c of selected)console.log(c.id);process.exit(0);}
if(!args.assets)throw Error('--assets is required; prepare a snapshot with setup.py');
if(!['chromium','firefox'].includes(args.browser))throw Error('Browser must be chromium or firefox');
if(args['negative-control']&&!['cover','hide-subtitles'].includes(args['negative-control']))throw Error('Supported negative controls: cover, hide-subtitles');
if(args.performance&&args['negative-control'])throw Error('Negative controls are correctness-only');
if(args['diagnostic-failed-cpu']&&!args.performance)throw Error('Failed-player CPU diagnostics require --performance');
if(args['diagnostic-failed-cpu']&&selected.some(c=>!['movi','libmedia'].includes(c.player)))throw Error('Failed-player CPU diagnostics are limited to Movi and AVPlayer');
if(args['screened-cpu']&&(!args.performance||args['diagnostic-failed-cpu']||selected.some(c=>c.player!=='demuxe')))throw Error('Screened CPU requires performance and Demuxe cases only');
if(args.performance&&(!args.correctness||!args.headed||!args.exclusive||args.browser!=='chromium'))throw Error('Performance requires --correctness <run>/summary.json, --headed, Chromium and --exclusive (no concurrent builds/benchmarks)');
const rounds=Number(args.rounds),measureSeconds=Number(args['measure-seconds']),warmupSeconds=Number(args['warmup-seconds']);
if(args.performance&&(!Number.isInteger(rounds)||rounds<(args['diagnostic-failed-cpu']?1:3)||measureSeconds<20||warmupSeconds<5))throw Error('Performance requires at least 3 accepted rounds (1 diagnostic round), 5s warmup and 20s measurement');
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
const sourceNames=['campaign-progress.mjs','benchmark-browser.mjs','browser-exit.mjs','performance-metrics.mjs','component-trials.mjs','run.mjs','server.mjs','checks.mjs','adapters.mjs','harness.html','matrix.json','assets.lock.json','setup.py','expand.py','planned.json','subtitle-ocr.swift','bitmap.py'];
const sourceHashes={};
await fs.mkdir(path.join(output,'files','harness'),{recursive:true});
for(const name of sourceNames){const bytes=name==='matrix.json'?Buffer.from(JSON.stringify(matrix,null,2)+'\n'):await fs.readFile(path.join(here,name));sourceHashes[name]=hash(bytes);await fs.writeFile(path.join(output,'files','harness',name),bytes);}
const harnessSHA256=hash(JSON.stringify(sourceHashes));
// Independently decode authored bitmap subtitles before interpreting browser failures.
for(const key of new Set(selected.map(c=>c.fixture).filter(key=>matrix.fixtures[key].subtitleCheck==='bitmap'))) {
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
const summary={schema:1,benchmarkPolicy,kind:args.performance?'performance':'correctness',startedAt:new Date().toISOString(),
  controlledStreaming:args['controlled-streaming'],streamingBackends:args['streaming-backends'],
  screenedCpu:args['screened-cpu'],diagnosticFailedCpu:args['diagnostic-failed-cpu'],
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
let active,progress;
const browserBlocks=new CpuBrowserBlocks({launchOptions:{headless:!args.headed,channel:args.channel}});
summary.browserBlocks=browserBlocks.records;
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
const codecKey=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const stopSignal=async()=>{summary.interrupted=true;await save();progress?.close();await browserBlocks.close();await active?.close();await server.close();process.exit(130);};
process.once('SIGINT',stopSignal);process.once('SIGTERM',stopSignal);

async function correctness(page,config,result,directory) {
  const snap=()=>page.evaluate(()=>api.snapshot());
  const stage=name=>{result.stage=name;progress?.phase(name);};
  stage('open');
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
  if(args['negative-control']==='hide-subtitles') {
    result.negativeControl='hide-subtitles';
    await page.evaluate(()=>{const cover=document.createElement('div');cover.style.cssText='position:absolute;left:0;right:0;top:65%;bottom:0;background:black;z-index:999999';document.querySelector('#stage').append(cover);});
  }
  if(args['negative-control']==='cover') {
    result.negativeControl='cover';
    await page.evaluate(()=>{const cover=document.createElement('div');cover.style.cssText='position:absolute;inset:0;background:black;z-index:999999';document.querySelector('#stage').append(cover);});
  }
  stage('initial-playback');
  await page.waitForFunction(audio=>api.snapshot().position>.65&&(!audio||api.snapshot().audio.some(a=>a.rms>.015)),hasAudio,{timeout:10000});
  stage('initial-output');
  if(config.subtitleCheck||config.subtitleIntegration){result.subtitleSelection=await page.evaluate(()=>api.subtitles());await delay(250);}
  result.initial=await snap();if(hasAudio)expect(markedAudio(result.initial),'Marked left/right audio missing or incorrect');
  if(config.player==='demuxe'&&config.expectedAudioCodec) {
    const selected=result.initial.selectedAudioTrack;
    expect(codecKey(selected?.codec)===codecKey(config.expectedAudioCodec),`Expected ${config.expectedAudioCodec} selected; observed ${JSON.stringify(selected)}`);
    result.selectedAudioTrack=selected;
  }
  const first=await page.locator('#stage').screenshot({path:path.join(directory,'initial.png')});
  result.initialImage=markedImage(first,result.initial.position);if(hasVideo)expect(result.initialImage.markerCorrect,'Initial displayed timeline marker incorrect');
  await delay(600);
  const second=await page.locator('#stage').screenshot({path:path.join(directory,'moving.png')});
  result.moving=hash(first)!==hash(second);if(hasVideo)expect(result.moving,'Displayed output did not change');
  result.initialPlaybackPassed=true;
  stage('initial-subtitles');
  checkSubtitle(second,await snap(),path.join(directory,'moving.png'));
  if(config.player==='demuxe'&&config.audioTrackSwitches?.length) {
    stage('audio-track-selection');result.audioTrackTransitions=[];
    for(const codec of config.audioTrackSwitches) {
      const before=await snap();
      const selection=await page.evaluate(value=>api.selectAudioCodec(value),codec);
      await page.waitForFunction(expected=>String(api.snapshot().selectedAudioTrack?.codec??'').toLowerCase()===expected,codec,{timeout:10000});
      await page.waitForFunction(()=>api.snapshot().audio.some(a=>a.channel===0&&a.rms>.015)&&api.snapshot().audio.some(a=>a.channel===1&&a.rms>.015),null,{timeout:8000});
      const after=await snap();
      expect(codecKey(after.selectedAudioTrack?.codec)===codecKey(codec),'Selected audio identity changed unexpectedly: '+codec);
      expect(markedAudio(after),'Marked audio missing after selecting '+codec);
      expect(after.position>=before.position-1&&after.position<before.position+8,'Track selection lost the accepted playback position');
      result.audioTrackTransitions.push({requestedCodec:codec,beforePosition:before.position,afterPosition:after.position,
        selectedAudioTrack:after.selectedAudioTrack,route:after.route,selection});
    }
  }
  stage('pause-resume');
  await page.evaluate(()=>api.pause());await delay(180);const paused=(await snap()).position;await delay(250);
  expect(Math.abs((await snap()).position-paused)<.12,'Pause did not stop the timeline');
  await page.evaluate(()=>api.resume());await delay(300);expect((await snap()).position>paused+.08,'Resume did not advance');
  stage('playback-rate');
  await page.evaluate(()=>api.rate(1.25));const r1=(await snap()).position;await delay(800);const r2=(await snap()).position;
  result.rateAdvance=r2-r1;expect(result.rateAdvance>.7&&result.rateAdvance<1.5,'Playback-rate progression outside bounded tolerance');
  await page.evaluate(()=>api.rate(1));
  if(config.live) {
    stage('live-window');
    result.liveSamples=[];
    let previousLiveImage;
    for(let i=0;i<4;i++) {
      await delay(2200);const state=await snap();
      const png=await page.locator('#stage').screenshot({path:path.join(directory,`live-${i}.png`)});
      const image=markedImage(png,state.position);result.liveSamples.push({...state,image});
      if(hasAudio)expect(markedAudio(state),'Live audio missing/wrong across playlist updates');
      if(hasVideo){expect(image.markerCorrect,'Live displayed timeline marker incorrect');if(previousLiveImage)expect(hash(png)!==previousLiveImage,'Live displayed output stopped changing');}
      previousLiveImage=hash(png);
    }
    expect(result.liveSamples.at(-1).position-result.liveSamples[0].position>5,'Live playback failed to advance across segment updates');
    expect(!result.liveSamples.at(-1).errors.length,'Player errors during live playback');
    result.qualificationLimit='Bounded live-window progression only; long-running recovery and discontinuities not covered.';
    return;
  }
  result.seeks=[];
  for(const target of [6,1,10]) {
    stage('seek-'+target);
    await deadline(page.evaluate(t=>api.seek(t),target),10000,'seek');await waitPosition(target);await delay(180);
    const state=await snap();const png=await page.locator('#stage').screenshot({path:path.join(directory,`seek-${target}.png`)});
    const image=markedImage(png,state.position);result.seeks.push({target,state,image});
    expect(Math.abs(state.position-target)<1,'Seek position incorrect');if(hasVideo)expect(image.markerCorrect,'Seek displayed stale/wrong timeline marker');
    if(hasAudio)expect(markedAudio(state),'Audio missing/wrong after seek');
    checkSubtitle(png,state,path.join(directory,`seek-${target}.png`));
  }
  stage('near-eof');
  const end=(await snap()).duration;
  expect(Number.isFinite(end)&&end>10,'Missing finite duration');
  await deadline(page.evaluate(t=>api.seek(t),end-.65),10000,'near-EOF seek');
  // A duration is not necessarily an absolute terminal timestamp (e.g. TS starts at 1.4s).
  // Prefer the public ended signal when the adapter exposes one.
  await page.waitForFunction(end=>{const state=api.snapshot();return state.ended===true||state.video?.ended||(state.ended==null&&state.position>=end-.2);},end,{timeout:7000});
  await delay(700);result.eof=await snap();expect(result.eof.position>=end-.2,'EOF did not reach final media region');
  await delay(400);expect(Math.abs((await snap()).position-result.eof.position)<.1,'EOF timeline did not settle');
  expect(!result.eof.errors.length,'Player reported errors: '+result.eof.errors.join('; '));
}

async function measure(page,config,result,browser) {
  const before=Date.now();await deadline(page.evaluate(c=>api.start(c),config),20000,'open');
  result.openWallMs=Date.now()-before;
  await page.waitForFunction(()=>api.snapshot().position>.25,null,{timeout:10000});
  if(config.subtitleCheck||config.subtitleIntegration)await page.evaluate(()=>api.subtitles());
  progress?.phase('warmup',warmupSeconds,measureSeconds+3);
  await delay(warmupSeconds*1000);
  progress?.phase('measurement',measureSeconds,3);
  const cdp=await browser.newBrowserCDPSession();
  frameObservation(await page.evaluate(()=>api.snapshot()),config);
  result.samples=[];
  try{result.samples=await collectCpuWindow(cdp,async()=>{
    const state=await page.evaluate(()=>api.snapshot());
    expect(state.visible&&state.focused,'Performance window lost foreground/focus');
    expect(!state.errors.length,'Player errors during measurement');return state;
  },{seconds:measureSeconds});}finally{await cdp.detach();}
  const first=result.samples[0],last=result.samples.at(-1);
  const ids=sample=>sample.processes.map(p=>p.id).sort().join(',');
  expect(result.samples.every(s=>ids(s)===ids(first)),'Process turnover makes this CPU window invalid');
  const wall=(last.at-first.at)/1000,advance=last.state.position-first.state.position;
  expect(Math.abs(advance-wall)<1,'Playback stalled or reached EOF during measurement');
  const fixtureFps=Number(config.frameRate??manifest.fixture.fps);
  if(!Number.isFinite(fixtureFps)||fixtureFps<=0)throw Error('Missing numeric fixture frame rate for CPU acceptance');
  const quality=validateFrameWindow(result.samples,config,fixtureFps);
  const dropped=quality.droppedFrames;
  result.measurement={...summarizeCpu(result.samples),
    peakSummedRssKiB:Math.max(...result.samples.map(s=>s.rssKiB??0)),droppedFrames:dropped,quality,
    scope:'CDP-listed browser processes; excludes server, external media services and physical energy. Summed RSS can double count shared pages. Route-specific frame submission semantics; missing drop counters remain null.'};
}

async function measureFailedPlayer(page,config,result,browser) {
  // This is diagnostic process use during a failed lifecycle, never an accepted
  // playback CPU result or an input to cross-player efficiency comparisons.
  const issues=[];
  try{await deadline(page.evaluate(c=>api.start(c),config),20000,'open');}
  catch(error){issues.push('open: '+String(error));}
  try{await page.waitForFunction(()=>api.snapshot().position>.25,null,{timeout:10000});}
  catch(error){issues.push('startup progress: '+String(error));}
  progress?.phase('warmup',warmupSeconds,measureSeconds+3);
  await delay(warmupSeconds*1000);
  progress?.phase('measurement',measureSeconds,3);
  const cdp=await browser.newBrowserCDPSession();
  result.samples=[];
  try{
    result.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>api.snapshot()).catch(error=>{issues.push('snapshot: '+String(error));return null;}),{seconds:measureSeconds});
  }finally{await cdp.detach();}
  const first=result.samples[0],last=result.samples.at(-1);
  const wall=(last.at-first.at)/1000;
  const ids=sample=>sample.processes.map(p=>p.id).sort().join(',');
  const stable=result.samples.every(sample=>ids(sample)===ids(first));
  const cpu=sample=>sample.processes.reduce((sum,p)=>sum+p.cpuTime,0);
  const advance=Number.isFinite(first.state?.position)&&Number.isFinite(last.state?.position)?last.state.position-first.state.position:null;
  if(!stable)issues.push('Chrome process IDs changed during the window');
  if(advance===null||Math.abs(advance-wall)>1)issues.push('Playback did not advance at normal 1x cadence');
  if(result.samples.some(sample=>sample.state?.errors?.length))issues.push('Player reported errors during the window');
  if(result.samples.some(sample=>sample.state&&!sample.state.visible||sample.state&&!sample.state.focused))issues.push('Window lost foreground or focus');
  try{validateFrameWindow(result.samples,config,Number(config.frameRate??manifest.fixture.fps));}
  catch(error){issues.push('frame quality: '+String(error));}
  result.diagnosticMeasurement={...summarizeCpu(result.samples),oneCorePercent:stable&&wall>0?100*(cpu(last)-cpu(first))/wall:null,
    wallSeconds:wall,playbackAdvanceSeconds:advance,processIdsStable:stable,issues,
    acceptedForComparison:false,scope:'Whole CDP-listed Chrome family during failed-player attempt; may include stalled, silent, missing or incorrect playback.'};
}

try {
  const scheduledCases=args['diagnostic-failed-cpu']?selected.filter(c=>previous?.cases.some(p=>p.id===c.id&&p.status==='failed')):
    args['screened-cpu']?selected.filter(c=>previous?.cases.some(p=>p.id===c.id&&p.status==='blocked'&&p.screenPassed)):selected;
  if(args['diagnostic-failed-cpu']||args['screened-cpu']){summary.selected=scheduledCases.map(c=>c.id);await save();}
  const schedule=args.performance?[...new Set(scheduledCases.map(c=>c.fixture))].flatMap(fixture=>{const group=scheduledCases.filter(c=>c.fixture===fixture);return Array.from({length:rounds},(_,round)=>group.map((_,i)=>({...group[(i+round)%group.length],round:round+1}))).flat();}):scheduledCases;
  progress=new CampaignProgress({total:schedule.length,output:path.join(output,'progress.json'),estimateSeconds:args.performance?45:30});browserBlocks.progress=progress;
  for(const [scheduleIndex,c] of schedule.entries()) {
    progress.start(c.id+(c.round?' round '+c.round:''));
    const result={...c,...(args['component-trial']?{componentTrial:args['component-trial']} : {}),status:'running',startedAt:new Date().toISOString(),console:[],requestFailures:[]};summary.cases.push(result);
    const recordName=c.id+(c.round?'.round-'+c.round:'');result.recordPath=recordName+'/result.json';
    const directory=path.join(output,recordName);await fs.mkdir(directory);await save();
    const fixture=matrix.fixtures[c.fixture];
    if(fixture.blockedReason) {
      result.status='blocked';result.reason=fixture.blockedReason;
      await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');await save();
      console.log('BLOCKED',c.id,result.reason);progress.finish('blocked');continue;
    }
    if(c.player==='demuxe'&&c.subtitleIntegration==='built-in'&&!manifest.engines['engine-hybrid']&&!manifest.engines['engine-software-full']) {
      result.status='blocked';result.reason='Current Demuxe Hybrid/Software engine assets are absent; no legacy binaries substituted.';
      await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');await save();progress.finish('blocked');continue;
    }
    let page;
    try {
      if(args.performance){const proof=previous?.cases.find(p=>p.id===c.id);const expected=args['diagnostic-failed-cpu']?'failed':args['screened-cpu']?'blocked':'passed';if(!proof||proof.status!==expected){result.status='blocked';result.reason='No qualifying correctness result; CPU not attempted';continue;}}
      progress.phase('Chrome setup');
      if(args.performance){const block=await browserBlocks.acquire(c.fixture+':'+c.round);active=block.browser;result.browserLaunch=block.identity;result.browserBlock=block.blockId;result.blockArm=block.armIndex;result.idleBeforeArm=block.idle;}
      else if(args.browser==='firefox')active=await firefox.launch({headless:!args.headed,timeout:20000});
      else {const launched=await launchBenchmarkChrome({headless:!args.headed,channel:args.channel});active=launched.browser;result.browserLaunch=launched.identity;}
      const browserIdentity=args.browser+'/'+active.version()+'/'+(args.browser==='chromium'?args.channel:'bundled')+'/'+(args.headed?'headed':'headless')+(result.browserLaunch?'/'+result.browserLaunch.configurationSHA256:'');
      if(summary.browserIdentity&&summary.browserIdentity!==browserIdentity)throw Error('Browser version/configuration changed within this run');
      summary.browserIdentity=browserIdentity;
      const prior=previous?.cases.find(record=>record.id===c.id);
      const diagnosticEligible=args['diagnostic-failed-cpu']&&prior?.status==='failed'&&
        previous.kind==='correctness'&&previous.assetsSHA256===summary.assetsSHA256&&
        previous.harnessSHA256===summary.harnessSHA256&&previous.browserIdentity===summary.browserIdentity;
      const screenedEligible=args['screened-cpu']&&prior?.status==='blocked'&&prior.screenPassed&&
        previous.kind==='correctness'&&previous.assetsSHA256===summary.assetsSHA256&&
        previous.harnessSHA256===summary.harnessSHA256&&previous.browserIdentity===summary.browserIdentity;
      if(args.performance&&(!(args['diagnostic-failed-cpu']?diagnosticEligible:args['screened-cpu']?screenedEligible:performanceEligible(previous,summary,c.id))||!!previous.controlledStreaming!==args['controlled-streaming'])) {result.status='blocked';result.reason='No matching correctness record for these assets, harness, streaming policy and browser';continue;}
      const context=await active.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
      page=await context.newPage();page.setDefaultTimeout(10000);
      page.on('console',m=>result.console.length<80&&result.console.push(m.text()));
      page.on('pageerror',e=>result.console.length<80&&result.console.push(e.message));
      page.on('requestfailed',q=>result.requestFailures.push({url:q.url(),error:q.failure()}));
      page.on('response',r=>{if(r.status()>=400)result.requestFailures.push({url:r.url(),status:r.status()});});
      await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);
      const config={...c,...matrix.fixtures[c.fixture],...(args['controlled-streaming']&&c.player==='demuxe'&&['auto','native'].includes(c.lane)?{streaming:{maxBandwidth:100000000}}:{}),...(args['component-trial']?{componentTrial:args['component-trial']}:{})};
      await (args['diagnostic-failed-cpu']?measureFailedPlayer(page,config,result,active):args.performance?measure(page,config,result,active):correctness(page,config,result,directory));
      result.status=args['diagnostic-failed-cpu']?'failed':args['screened-cpu']?'blocked':'passed';
      if(args['diagnostic-failed-cpu']){result.failureStage=prior.failureStage??'correctness';result.reason='Correctness failed: '+String(prior.reason??'unknown failure').split('\n')[0];result.correctnessRecord=prior.recordPath;}
      if(args['screened-cpu']){result.screenMeasured=true;result.screenPassed=true;result.reason=config.qualificationLimit??prior.reason;result.correctnessRecord=prior.recordPath;}
      else if(config.qualificationLimit&&!args['diagnostic-failed-cpu']){result.screenPassed=true;result.status='blocked';result.reason=config.qualificationLimit;}
    } catch(error) {
      result.status='failed';result.failureStage=result.stage??'setup';result.reason=String(error.stack??error);
      if(c.player==='demuxe'&&result.requestFailures.some(r=>r.status===404&&Object.entries(manifest.engines).some(([name,exists])=>!exists&&r.url.includes('/'+name+'/')))){result.status='blocked';result.reason='Required current Demuxe engine assets are absent. '+result.reason;}
      if(result.reason.includes('UNQUALIFIED:'))result.status='blocked';
      if(/Executable doesn't exist|Chromium distribution.*not found/.test(result.reason))result.status='blocked';
      if(page){result.failureState=await deadline(page.evaluate(()=>api.snapshot()),2000,'failure snapshot').catch(()=>null);await page.screenshot({path:path.join(directory,'failure.png'),timeout:2000}).catch(()=>{});}
    } finally {
      progress.phase('cleanup');
      if(page) {
        result.cleanup=await deadline(page.evaluate(()=>api.stop()),4000,'cleanup').catch(error=>({error:String(error)}));
        await delay(400);result.workersAfter=page.workers().length;
        if((result.status==='passed'||result.screenPassed)&&(result.cleanup.error||result.cleanup.remainingSurfaces||result.workersAfter||result.cleanup.contexts.some(s=>s!=='closed'))) {
          result.status='failed';result.failureStage='cleanup';result.reason='Cleanup did not release observed surfaces, contexts or workers';
        }
      }
      let processIDs;
      if(active&&args.browser==='chromium'&&['darwin','linux'].includes(os.platform())){
        try{const session=await active.newBrowserCDPSession();const info=(await session.send('SystemInfo.getProcessInfo')).processInfo;
          if(!info.some(p=>p.type==='browser'))throw Error('Browser process identity unavailable');
          processIDs=info.map(p=>p.id);await session.detach();
        }catch(error){result.status='failed';result.reason=(result.reason??'')+'; Process observation: '+String(error);}
      }
      if(page)await deadline(page.context().close(),10000,'context teardown').catch(error=>{result.status='failed';result.contextCleanupError=String(error);result.reason=(result.reason??'')+'; '+String(error);});
      try{
        if(args.performance){
          if(result.contextCleanupError||result.cleanup?.error||result.cleanup?.remainingSurfaces||result.workersAfter||result.cleanup?.contexts?.some(s=>s!=='closed')||active&&!active.isConnected())await browserBlocks.invalidate('Arm cleanup or browser failure');
          const next=schedule[scheduleIndex+1];
          if(!next||next.fixture!==c.fixture||next.round!==c.round)await browserBlocks.close();
        }else if(processIDs)result.browserCleanup=await closeBrowserObserved(active,processIDs);else await deadline(active?.close()??Promise.resolve(),10000,'browser teardown');
      }catch(error){result.status='failed';result.reason=(result.reason??'')+'; '+String(error);}
      active=null;result.finishedAt=new Date().toISOString();
      await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');await save();
      progress.finish(result.status);
      console.log(result.status.toUpperCase(),c.id,result.reason?.split('\n')[0]??'');
    }
  }
} finally {progress?.close();await browserBlocks.close();await active?.close();await server.close();if(ocrDirectory)await fs.rm(ocrDirectory,{recursive:true,force:true});}
for(const c of summary.cases){if(c.browserBlock&&browserBlocks.records.find(b=>b.id===c.browserBlock)?.status==='failed'){c.status='failed';c.failureStage='browser-block';c.reason='Comparison block failed cleanup or browser retirement';await fs.writeFile(path.join(output,c.recordPath),JSON.stringify(c,null,2)+'\n');}}
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
