// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';import path from 'node:path';
import {chromium} from 'playwright';import {serve} from '../../tests/head-to-head/server.mjs';
const mode=process.argv[2]??'direct',fastRate=Number(process.env.FAST_RATE??1.5);
const out=path.resolve(`results/selective-audio-timeline/${mode}-${Date.now()}`);await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);
await fs.copyFile('experiments/selective-audio-timeline/poc.html',path.join(harness,'poc.html'));
let code=await fs.readFile('experiments/selective-audio-timeline/poc.mjs','utf8');
code=code.replaceAll('h264-1080p60-ac3.mkv','rate-pulses-wide.mkv').replace("mode:'hybrid',audioOutput:'stereo'","mode:'hybrid',audioOutput:'stereo',measureOutput:true");
code=code.replace('  const e=s.errorMs;','  if(globalThis.__rateDiagnostic)return;\n  const e=s.errorMs;');
code=code.replace('    await backend.ready;',`    backend.addEventListener('output',ev=>{const d=ev.detail;if(d.kind!=='click')return;
      const now=performance.now(),delta=(d.wallTime-performance.timeOrigin-now)/1000;
      events.push({name:'pulse',at:now,videoTime:video.currentTime,videoAtOutput:video.currentTime+delta*video.playbackRate,
        audioEstimateAtOutput:estimatedAudioPresentationTime(now)+delta*actualRate,output:d,rate:video.playbackRate});
    });
    await backend.ready;`);
if(mode==='small-buffer')code=code.replace("    await backend.command('set','vid','no');","    await backend.command('set','audio-buffer','0.01');\n    await backend.command('set','vid','no');");
code+=`\nwindow.directRate=async value=>{const at=performance.now();baseRate=value;actualRate=value;video.playbackRate=value;await backend.rate(value);corrections.push({type:'direct-rate',rate:value,at});};\nglobalThis.__rateDiagnostic=true;\n`;
if(mode==='reset'){const start=code.indexOf('export async function rate(');const end=code.indexOf('export function samples',start);let section=code.slice(start,end).replace('let anchor;const wasRunning=running;','const anchor=video.currentTime,wasRunning=running;').replace('video.pause();await backend.pause();anchor=video.currentTime;','video.pause();await backend.pause();');code=code.slice(0,start)+section+code.slice(end);}
if(mode==='delayed-video')code=code.replaceAll('video.playbackRate=value;await backend.rate(value);','await backend.rate(value);await new Promise(resolve=>setTimeout(resolve,340));video.playbackRate=value;');
await fs.writeFile(path.join(harness,'poc.mjs'),code);
const server=await serve(path.resolve('build/selective-audio-timeline/assets'),harness,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:960,height:540}});await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
await page.evaluate(()=>poc.start('C'));await page.waitForFunction(()=>poc.snapshot().audioOutput.mediaFrames>10000);await page.evaluate(()=>poc.seek(0));await page.waitForTimeout(4200);
for(const [rate,ms] of [[fastRate,5000],[1,4000]]){await page.evaluate(({mode,rate})=>mode.startsWith('reset')?poc.rate(rate):directRate(rate),{mode,rate});await page.waitForTimeout(ms);}
const state=await page.evaluate(()=>poc.snapshot()),samples=await page.evaluate(()=>poc.samples());
const pulses=state.events.filter(e=>e.name==='pulse').map((p,i)=>({...p,expectedMediaTime:i+1,errorMs:((i+1)-p.videoAtOutput)*1000,clockBiasMs:(p.audioEstimateAtOutput-(i+1))*1000}));
await fs.writeFile(path.join(out,'result.json'),JSON.stringify({mode,fastRate,browser:browser.version(),state,samples,pulses},null,2));
console.log(out);console.log(pulses.map(p=>({pulse:p.expectedMediaTime,rate:p.rate,errorMs:Math.round(p.errorMs),clockBiasMs:Math.round(p.clockBiasMs)})));
await page.evaluate(()=>poc.stop());}finally{await browser.close();await server.close();}
