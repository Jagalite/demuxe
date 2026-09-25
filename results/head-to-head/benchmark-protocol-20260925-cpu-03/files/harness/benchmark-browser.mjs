// SPDX-License-Identifier: Apache-2.0
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {chromium} from 'playwright';
import {closeBrowserObserved} from './browser-exit.mjs';

export const benchmarkPolicy={schema:2,browserLifetime:'one fixture/round comparison block; fresh context per arm',interArmIdleSeconds:2,profile:'fresh temporary Playwright profile per launch',
  startupIdleSeconds:30,warmupSeconds:5,measureSeconds:20,sampleIntervalSeconds:2,
  clock:'monotonic CPU-query midpoint; fixed sample deadlines',
  viewport:{width:960,height:540},deviceScaleFactor:1};
export const launchArgs=['--autoplay-policy=no-user-gesture-required'];
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function launchBenchmarkChrome({headless=false,channel='chrome'}={}){
  const browser=await chromium.launch({channel,headless,args:launchArgs,timeout:30000});
  try{
    const cdp=await browser.newBrowserCDPSession();
    const {arguments:effectiveArguments}=await cdp.send('Browser.getBrowserCommandLine');
    const version=await cdp.send('Browser.getVersion');await cdp.detach();
    const configurationSHA256=hash(JSON.stringify({arguments:effectiveArguments.map(arg=>arg.startsWith('--user-data-dir=')?'--user-data-dir=<fresh-temporary>':arg),headless,policy:benchmarkPolicy}));
    return {browser,identity:{configurationSHA256,version,channel,
      effectiveArguments,headless,policy:benchmarkPolicy}};
  }catch(error){await browser.close();throw error;}
}
export const delay=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms)));
async function until(deadline){while(performance.now()<deadline)await delay(deadline-performance.now());}
export async function processSample(cdp,snapshot){
  const start=performance.now();const {processInfo:processes}=await cdp.send('SystemInfo.getProcessInfo');const end=performance.now();
  const state=snapshot?await snapshot():null;
  let rssKiB=null;
  try{rssKiB=execFileSync('ps',['-o','rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8',timeout:3000}).trim().split(/\s+/).reduce((sum,n)=>sum+Number(n),0);}catch{}
  return {at:(start+end)/2,epochAt:Date.now(),processQueryMs:end-start,processes,rssKiB,state};
}
export async function collectCpuWindow(cdp,snapshot,{seconds=20,interval=2,sample=()=>processSample(cdp,snapshot),waitUntil=until}={}){
  if(!(seconds>0&&interval>0))throw Error('Invalid CPU window');
  const first=await sample(),samples=[first],start=first.at;
  for(let target=interval;target<seconds;target+=interval){await waitUntil(start+target*1000);const s=await sample();s.deadlineLatenessMs=Math.max(0,s.at-start-target*1000);samples.push(s);}
  await waitUntil(start+seconds*1000);const last=await sample();last.deadlineLatenessMs=Math.max(0,last.at-start-seconds*1000);samples.push(last);
  return samples;
}
export function summarizeCpu(samples){
  const first=samples[0],last=samples.at(-1),wallSeconds=(last.at-first.at)/1000;
  if(!(wallSeconds>0))throw Error('Invalid CPU elapsed time');
  const ids=s=>s.processes.map(p=>`${p.id}:${p.type}`).sort().join(',');
  const stable=samples.every(s=>ids(s)===ids(first));
  const prior=new Map(first.processes.map(p=>[p.id,p]));
  const roles={browser:0,renderer:0,gpu:0,audio:0,utility:0,other:0};const perProcess=[];
  for(const p of last.processes){const before=prior.get(p.id);if(!before)continue;
    const seconds=p.cpuTime-before.cpuTime;if(seconds<0)throw Error('Process CPU counter reset');
    const role=p.type==='browser'?'browser':p.type==='renderer'?'renderer':p.type==='GPU'?'gpu':p.type==='audio.mojom.AudioService'?'audio':p.type==='utility'||p.type.includes('.mojom.')?'utility':'other';
    const oneCorePercent=100*seconds/wallSeconds;roles[role]+=oneCorePercent;perProcess.push({id:p.id,type:p.type,role,cpuSeconds:seconds,oneCorePercent});
  }
  const total=Object.values(roles).reduce((a,b)=>a+b,0);
  return {wallSeconds,processIdsStable:stable,oneCorePercent:stable?total:null,cpuSeconds:stable?total*wallSeconds/100:null,
    roles:stable?roles:null,nonBrowserPercent:stable?total-roles.browser:null,perProcess,
    peakSummedRssKiB:Math.max(...samples.map(s=>s.rssKiB??0)),
    maxProcessQueryMs:Math.max(...samples.map(s=>s.processQueryMs??0)),maxDeadlineLatenessMs:Math.max(...samples.map(s=>s.deadlineLatenessMs??0))};
}
export async function settleBrowser(browser,page,{seconds=benchmarkPolicy.startupIdleSeconds}={}){
  await page.goto('about:blank');await page.bringToFront();
  const cdp=await browser.newBrowserCDPSession();
  try{const samples=await collectCpuWindow(cdp,null,{seconds});return {samples,...summarizeCpu(samples),scope:'Fixed startup idle observation; never subtracted from playback CPU'};}
  finally{await cdp.detach();}
}

async function retireBenchmarkBrowser(browser){
 const cdp=await browser.newBrowserCDPSession();
 try{const ids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);return await closeBrowserObserved(browser,ids);}
 finally{await cdp.detach().catch(()=>{});}
}

// Browser ownership follows fixture/round blocks, while contexts belong to arms.
export class CpuBrowserBlocks{
  constructor({launchOptions={},progress=null,launch=launchBenchmarkChrome,idle=settleBrowser,retire=retireBenchmarkBrowser}={}){this.launchOptions=launchOptions;this.progress=progress;this.launch=launch;this.idle=idle;this.retire=retire;this.records=[];}
  async acquire(id){
    if(this.current?.id!==id){await this.close();this.current={id,arms:0,status:'starting'};this.records.push(this.current);}
    const record=this.current;
    if(record.status==='failed')throw Error('CPU block aborted after prior cleanup/browser failure: '+id);
    if(!this.browser){
      this.progress?.phase('Chrome launch',null);
      const launched=await this.launch(this.launchOptions);this.browser=launched.browser;record.browserLaunch=launched.identity;
      record.status='running';record.startedAt=new Date().toISOString();
    }
    const context=await this.browser.newContext({viewport:benchmarkPolicy.viewport,deviceScaleFactor:1});
    try{
      const page=await context.newPage();
      const seconds=record.arms===0?benchmarkPolicy.startupIdleSeconds:benchmarkPolicy.interArmIdleSeconds;
      this.progress?.phase(record.arms===0?'browser settling':'between-arm idle',seconds,30);
      const idle=await this.idle(this.browser,page,{seconds});
      const index=record.arms++;(record.idle??=[]).push({beforeArm:index+1,...idle});
      return {browser:this.browser,identity:record.browserLaunch,blockId:id,armIndex:index+1,idle};
    }catch(error){record.status='failed';throw error;}finally{await context.close().catch(async error=>{record.status='failed';record.reason=String(error);await this.close();throw error;});}
  }
  async invalidate(reason){if(this.current){this.current.status='failed';this.current.reason=String(reason);}await this.close();}
  async close(){
    if(!this.browser)return;
    const browser=this.browser;this.browser=null;
    try{
      this.current.browserExit=await this.retire(browser);if(this.current.status!=='failed')this.current.status='complete';
    }catch(error){this.current.status='failed';this.current.reason=String(error);await browser.close().catch(()=>{});throw error;}
    finally{this.current.finishedAt=new Date().toISOString();}
  }
}
