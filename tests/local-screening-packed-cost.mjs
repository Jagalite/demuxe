// SPDX-License-Identifier: Apache-2.0
// Paired complete playback work; CPU includes this harness, server and browser descendants.
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.env.RESULT_ROOT||`results/local-screening/runs/packed-cost-${Date.now()}`;await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const engines={};for(const [name,path] of Object.entries({reference:'build/local-screening/adaptation-profile',candidate:'build/local-screening/adaptation-packed'})){engines[name]={};for(const file of ['remux.mjs','remux.wasm'])engines[name][file]=await readFile(path+'/'+file);}
const result={scope:'Warm local assets; complete 30-second public open/play/EOF/destroy; process-tree CPU, not system CPU or energy. Observer present in both engines. No capture/hash work inside measured operation.',primary:'process-tree CPU seconds',minimumWorthwhileFraction:.05,pairs:7,engineHashes:Object.fromEntries(Object.entries(engines).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([f,b])=>[f,sha(b)]))])),fixtureSHA256:sha(await readFile('build/optimization-fixtures/long-pcm.mkv')),runs:[]};
function cpu(){const rows=execFileSync('ps',['-axo','pid=,ppid=,time=,comm='],{encoding:'utf8'}).trim().split('\n').map(l=>{const [pid,ppid,time,...command]=l.trim().split(/\s+/);let seconds=0;for(const part of time.split(':'))seconds=seconds*60+Number(part);return {pid:+pid,ppid:+ppid,seconds,command:command.join(' ')};}).filter(r=>r.command!=='ps'&&!r.command.endsWith('/ps'));const ids=new Set([process.pid]);for(let i=0;i<10;i++)for(const r of rows)if(ids.has(r.ppid))ids.add(r.pid);return rows.filter(r=>ids.has(r.pid));}
const app=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);app.once('error',reject);app.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 for(let pair=-1;pair<7;pair++)for(const variant of (pair%2===0?['reference','candidate']:['candidate','reference'])){
  const page=await browser.newPage();page.setDefaultTimeout(20000);
  await page.route('**/engine-adaptation/remux.*',async r=>{const name=r.request().url().endsWith('.wasm')?'remux.wasm':'remux.mjs';await r.fulfill({response:await r.fetch(),body:engines[variant][name]});});
  await page.goto(origin+'/examples/custom-controls.html');await page.evaluate(async()=>{await player.destroy();window.API=await import('/web/generated/index.js');const f=document.createElement('input');f.id='file';f.type='file';document.body.append(f);});await page.locator('#file').setInputFiles('build/optimization-fixtures/long-pcm.mkv');
  const before=cpu(),start=performance.now();
  await page.evaluate(async()=>{window.errors=[];window.player=new API.Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:'flac'});player.addEventListener('error',e=>errors.push(e.detail));await player.open(document.querySelector('#file').files[0]);await player.play();});
  await page.waitForFunction(()=>player.surface.ended,null,{timeout:45000});
  const diagnostics=await page.evaluate(()=>({d:player.diagnostics,errors,frames:player.surface.getVideoPlaybackQuality().totalVideoFrames}));assert.equal(diagnostics.d.plan.id,'native-flac');assert.deepEqual(diagnostics.errors,[]);assert.ok(diagnostics.frames>800);await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);
  const wallMs=performance.now()-start,after=cpu();const beforeMap=new Map(before.map(r=>[r.pid,r.seconds]));const cpuSeconds=after.reduce((n,r)=>n+r.seconds-(beforeMap.get(r.pid)??0),0);const afterIDs=new Set(after.map(r=>r.pid));const exited=before.filter(r=>!afterIDs.has(r.pid)&&r.pid!==process.pid);
  result.runs.push({pair,warmup:pair===-1,variant,wallMs,cpuSeconds,exitedBeforeSnapshot:exited,before,after,diagnostics});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(pair,variant,'CPU',cpuSeconds.toFixed(3),'wall',wallMs.toFixed(1));
 }
 result.passed=true;
}catch(error){result.error=String(error.stack);process.exitCode=1;}
finally{await browser?.close();app.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(result.passed?'PASS':result.error);}
