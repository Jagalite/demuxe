// SPDX-License-Identifier: Apache-2.0
// Bounded public-controls screen of the published example; not a library claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,benchmarkPolicy,delay} from './benchmark-browser.mjs';
import {markedImage,decodePNG} from './checks.mjs';
import {referenceAudio} from './specialist-audio.mjs';
import {closeBrowserObserved} from './browser-exit.mjs';

const {values:args}=parseArgs({options:{assets:{type:'string'},fixture:{type:'string'},output:{type:'string'},cpu:{type:'boolean',default:false},correctness:{type:'string'}}});
assert(args.assets&&args.fixture&&args.output,'--assets, --fixture and --output required');
const assets=path.resolve(args.assets),out=path.resolve(args.output),here=import.meta.dirname;
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(manifestBytes);
const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
const specialists=JSON.parse(await fs.readFile(path.join(assets,'specialist.json')));
const source=specialists[args.fixture]??catalogue[args.fixture];assert(source?.file,'Unknown fixture');
const mediaFile=path.join(assets,'fixtures',source.file),mediaBytes=await fs.readFile(mediaFile);
assert.equal(sha(mediaBytes),manifest.files['fixtures/'+source.file]?.sha256,'Fixture hash mismatch');
await fs.mkdir(out);await fs.mkdir(path.join(out,'files/harness'),{recursive:true});
await fs.mkdir(path.join(out,'scripts'));
const sourceHashes={};
for(const name of ['mediabunny-backlog.mjs','benchmark-browser.mjs','browser-exit.mjs','checks.mjs','specialist-audio.mjs']){
  const bytes=await fs.readFile(path.join(here,name));sourceHashes[name]=sha(bytes);await fs.writeFile(path.join(out,'files/harness',name),bytes);
}
await fs.writeFile(path.join(out,'assets-manifest.json'),manifestBytes);
await fs.writeFile(path.join(out,'files/harness/matrix.json'),JSON.stringify({fixtures:{[args.fixture]:source}},null,2)+'\n');
const summary={schema:1,kind:args.cpu?'performance':'correctness',startedAt:new Date().toISOString(),assetsSHA256:sha(manifestBytes),harnessSHA256:sha(JSON.stringify(sourceHashes)),sourceHashes,
  command:process.argv,fixtureSHA256:sha(mediaBytes),player:'https://mediabunny.dev/examples/media-player/',cases:[],selected:['mediabunny.default.'+args.fixture],
  limits:['Published example with local File input; no library-wide compatibility claim','No playback-rate control or independently observable decoder/AudioContext teardown API','No discrete channel, lossless, spatial-audio, HDR or Dolby Vision fidelity qualification','Canvas draw submissions are not physical presentation or decoder drop counters']};
const previous=args.correctness?JSON.parse(await fs.readFile(args.correctness)):null;
if(args.cpu){assert(previous?.cases[0]?.screenPassed&&previous.cases[0].status==='blocked','Matching successful bounded screen required');for(const k of ['assetsSHA256','harnessSHA256','fixtureSHA256'])assert.equal(summary[k],previous[k],k);}
const save=()=>fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const targets=args.fixture.includes('dtshd')?[12,4]:[10,1];
const unmarkedAudio=source.markedAudio===false,unmarkedVideo=source.markedVideo===false;
const references=!args.cpu&&unmarkedAudio&&source.audio!==false?targets.map(t=>referenceAudio(mediaFile,t)):[];
await fs.writeFile(path.join(out,'audio-oracles.json'),JSON.stringify(references,null,2)+'\n');
let browser,processIDs;
try{
  const launched=await launchBenchmarkChrome({headless:false,channel:'chrome',startupGate:args.cpu});browser=launched.browser;
  summary.browserLaunch=launched.identity;summary.browserIdentity=launched.identity.version.product+'/'+launched.identity.configurationSHA256;
  if(args.cpu)assert.equal(summary.browserIdentity,previous.browserIdentity,'Browser differs from correctness');
  for(let round=1;round<=(args.cpu?3:1);round++){
    const record={id:summary.selected[0],fixture:args.fixture,player:'mediabunny',lane:'default',status:'running',...(args.cpu?{round}:{})};
    record.recordPath=`round-${round}.json`;summary.cases.push(record);await save();
    const context=await browser.newContext({viewport:benchmarkPolicy.viewport,deviceScaleFactor:1});
    const page=await context.newPage();page.setDefaultTimeout(10000);
    const pending=[],scripts={};record.pageErrors=[];
    page.on('pageerror',error=>record.pageErrors.push(String(error)));
    page.on('response',response=>{if(response.request().resourceType()==='script'||/\.wasm(?:\?|$)/.test(response.url()))pending.push((async()=>{
      const bytes=await response.body();const digest=sha(bytes);scripts[response.url()]=digest;await fs.writeFile(path.join(out,'scripts',digest+'.js'),bytes);
    })().catch(error=>{record.captureErrors??=[];record.captureErrors.push(String(error));}));});
    await page.addInitScript(correctness=>{
      window.probe={draws:0,audioStarts:0,analysers:[]};
      const draw=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(...a){if(this.canvas.closest?.('#player'))probe.draws++;return draw.apply(this,a);};
      const start=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...a){probe.audioStarts++;return start.apply(this,a);};
      if(correctness){
        const connect=AudioNode.prototype.connect,tapped=new WeakSet();
        AudioNode.prototype.connect=function(destination,...a){
          if(destination instanceof AudioDestinationNode&&!tapped.has(this)){
            tapped.add(this);const split=this.context.createChannelSplitter(2);connect.call(this,split);
            for(let channel=0;channel<2;channel++){const analyser=this.context.createAnalyser();analyser.fftSize=8192;connect.call(split,analyser,channel);probe.analysers.push({analyser,channel});}
          }
          return connect.call(this,destination,...a);
        };
      }
      window.mbSnapshot=()=>{
        const time=id=>{const values=(document.querySelector(id)?.textContent??'0:0').split(':').map(Number);return values.reduce((total,n)=>total*60+n,0);};
        return {position:time('#current-time'),duration:time('#duration'),frames:probe.draws,audioStarts:probe.audioStarts,
          visible:document.visibilityState==='visible',focused:document.hasFocus(),
          playerVisible:!!document.querySelector('#player')&&getComputedStyle(document.querySelector('#player')).display!=='none',
          errors:['#error-element','#warning-element'].map(id=>document.querySelector(id)?.textContent?.trim()).filter(Boolean),
          audio:probe.analysers.map(({analyser,channel})=>{const wave=new Float32Array(analyser.fftSize),bins=new Float32Array(analyser.frequencyBinCount);analyser.getFloatTimeDomainData(wave);analyser.getFloatFrequencyData(bins);let peak=0;for(let i=1;i<bins.length;i++)if(bins[i]>bins[peak])peak=i;return {channel,rms:Math.sqrt(wave.reduce((s,x)=>s+x*x,0)/wave.length),hz:peak*analyser.context.sampleRate/analyser.fftSize};})};
      };
    },!args.cpu);
    const snap=()=>page.evaluate(()=>mbSnapshot());
    const seek=async target=>{
      const {duration}=await snap();assert(Number.isFinite(duration)&&duration>target,'Missing finite seek duration');
      const box=await page.locator('#progress-bar-container').boundingBox();assert(box?.width,'Missing public seek bar');
      await page.mouse.click(box.x+box.width*target/duration,box.y+box.height/2);
      await page.waitForFunction(t=>Math.abs(mbSnapshot().position-t)<.8,target,{timeout:7000});
    };
    const audio=async target=>{
      if(source.audio===false)return;
      await page.waitForFunction(({unmarked,target})=>{
        const state=mbSnapshot();return (target==null||state.position>=target-.1&&state.position<=target+2)&&[0,1].every(channel=>state.audio.some(a=>a.channel===channel&&a.rms>(unmarked?.003:.015)&&(unmarked||Math.abs(a.hz-[440,880][channel])<30)));
      },{unmarked:unmarkedAudio,target},{timeout:7000});
    };
    const picture=async label=>{
      const file=`round-${round}-${label}.png`,png=await page.locator(source.video===false?'#player':'#player canvas').screenshot({path:path.join(out,file)}),state=await snap();
      const observation={file,sha256:sha(png),state,marker:markedImage(png,state.position)};
      if(source.video!==false){
        if(unmarkedVideo){const {pixels,channels}=decodePNG(png);let lit=0;for(let i=0;i<pixels.length;i+=channels)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>20)lit++;assert(lit>200,'No visible video');}
        else assert(observation.marker.markerCorrect,'Displayed timeline marker incorrect');
      }
      if(['ass','bitmap'].includes(source.subtitleCheck))assert(observation.marker.magentaPixels>150,'Required subtitle drawing missing');
      if(source.subtitleCheck==='text')assert((await page.locator('#player').innerText()).replace(/[^A-Z0-9]/gi,'').toUpperCase().includes('DEMUXETEST123'),'Required subtitle text missing');
      return observation;
    };
    try{
      if(args.cpu){await page.bringToFront();const cdp=await browser.newBrowserCDPSession();record.idle=await collectCpuWindow(cdp,()=>page.evaluate(()=>({visible:document.visibilityState==='visible',focused:document.hasFocus()})),{seconds:20});await cdp.detach();}
      const document=await page.goto(summary.player,{waitUntil:'networkidle',timeout:30000});await page.bringToFront();
      const html=await document.body();record.documentSHA256=sha(html);await fs.writeFile(path.join(out,`round-${round}-document.html`),html);
      if(args.cpu)assert.equal(record.documentSHA256,previous.cases[0].documentSHA256,'Published example document changed');
      const chooser=page.waitForEvent('filechooser');await page.locator('#select-file').click();await(await chooser).setFiles(mediaFile);
      await Promise.race([page.locator('#player').waitFor({state:'visible',timeout:30000}),page.locator('#error-element:not(:empty)').waitFor({state:'visible',timeout:30000})]);
      record.open=await snap();assert(record.open.playerVisible&&!record.open.errors.length,'Open failed or downgraded: '+JSON.stringify(record.open));
      if(source.subtitle||source.subtitleIntegration==='built-in')throw Error('Required external subtitle cannot be supplied through published example controls');
      await page.locator('#play-button').evaluate(e=>e.click());
      await page.waitForFunction(()=>mbSnapshot().position>.2,null,{timeout:10000});
      if(args.cpu){
        await delay(5000);await Promise.all(pending);
        assert(Object.keys(scripts).length,'No captured player scripts');
        for(const [url,digest]of Object.entries(scripts))assert.equal(digest,previous.cases[0].playerScripts[url],'Published example script changed: '+url);
        const cdp=await browser.newBrowserCDPSession();record.samples=await collectCpuWindow(cdp,snap,{seconds:20});await cdp.detach();
        const cpu=summarizeCpu(record.samples),first=record.samples[0].state,last=record.samples.at(-1).state;
        assert(cpu.processIdsStable&&Number.isFinite(cpu.oneCorePercent),'Process identity or CPU unavailable');
        assert(Math.abs(last.position-first.position-cpu.wallSeconds)<1,'Playback stalled or reached EOF');
        assert(record.samples.every(s=>s.state.visible&&s.state.focused&&!s.state.errors.length),'Focus or playback error gate');
        if(source.video!==false){const fps=Number(source.frameRate??manifest.fixture.fps),expected=fps*cpu.wallSeconds;assert(Math.abs(last.frames-first.frames-expected)<=12+expected*.01,'Canvas presentation cadence outside frame budget');}
        if(source.audio!==false)assert(record.samples.every((s,i)=>!i||s.state.audioStarts>record.samples[i-1].state.audioStarts),'Audio scheduling stalled');
        record.measurement={...cpu,droppedFrames:null,scope:'Whole CDP-listed Chrome CPU; canvas submissions, no decoder drop counter or physical presentation proof'};
        record.screenMeasured=true;
      }else{
        if(unmarkedAudio)await seek(targets[0]);await audio(unmarkedAudio?targets[0]:null);
        record.initial=await picture('initial');await delay(650);record.moving=await picture('moving');
        if(source.video!==false)assert.notEqual(record.initial.sha256,record.moving.sha256,'Video did not change');
        await page.locator('#play-button').evaluate(e=>e.click());await delay(180);const paused=await snap();await delay(400);assert(Math.abs((await snap()).position-paused.position)<.12,'Pause failed');
        await page.locator('#play-button').evaluate(e=>e.click());await page.waitForFunction(p=>mbSnapshot().position>p+.2,paused.position,{timeout:3000});
        record.seeks=[];
        for(const target of unmarkedAudio?targets:[6,1,10]){await seek(target);await delay(180);await audio(target);record.seeks.push({target,...await picture('seek-'+target)});}
        const end=(await snap()).duration;await seek(end-.65);await page.waitForFunction(t=>mbSnapshot().position>=t-.2,end,{timeout:5000});await delay(500);record.eof=await snap();await delay(450);assert(Math.abs((await snap()).position-record.eof.position)<.1,'EOF did not settle');
      }
      assert(!record.pageErrors.length,'Page errors: '+record.pageErrors.join('; '));
      record.status='blocked';record.screenPassed=true;record.reason=summary.limits.join('; ');
    }catch(error){record.status='failed';record.reason=String(error.stack??error);record.failureState=await snap().catch(()=>null);await page.screenshot({path:path.join(out,`round-${round}-failure.png`)}).catch(()=>{});}
    finally{
      await Promise.all(pending);record.playerScripts=scripts;
      if(record.captureErrors?.length){record.status='blocked';record.screenPassed=false;record.reason='Player script capture incomplete';}
      await context.close();record.contextClosed=true;
      await fs.writeFile(path.join(out,record.recordPath),JSON.stringify(record,null,2)+'\n');await save();
      console.log(JSON.stringify({round,status:record.status,cpu:record.measurement?.oneCorePercent,reason:record.reason?.split('\n')[0]}));
    }
  }
}finally{
  if(browser){const cdp=await browser.newBrowserCDPSession();processIDs=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);await cdp.detach();summary.browserExit=await closeBrowserObserved(browser,processIDs);}
  summary.finishedAt=new Date().toISOString();summary.counts=Object.fromEntries(['passed','failed','blocked','skipped'].map(s=>[s,summary.cases.filter(c=>c.status===s).length]));await save();
  const captured={};
  async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else captured[path.relative(out,file)]=sha(await fs.readFile(file));}}
  await walk(out);await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schema:1,sha256:captured},null,2)+'\n');
}
