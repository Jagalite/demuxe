// SPDX-License-Identifier: Apache-2.0
// Bounded API exposure check, not generated-stream or encoded-chunk playback.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const result={scope:'Default installed Chrome; no experimental feature flags added.',addedFlags:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
try {
 const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});server.on('error',reject);});
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();
 const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 result.window=await page.evaluate(()=>({secure:isSecureContext,isolated:crossOriginIsolated,VideoTrackGenerator:typeof globalThis.VideoTrackGenerator,MediaStreamTrackGenerator:typeof globalThis.MediaStreamTrackGenerator,appendEncodedChunks:typeof globalThis.SourceBuffer?.prototype.appendEncodedChunks,appendBuffer:typeof globalThis.SourceBuffer?.prototype.appendBuffer,invalidControl:typeof globalThis.SourceBuffer?.prototype.demuxeNonexistentProbeControl}));
 result.worker=await page.evaluate(()=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([`postMessage({VideoTrackGenerator:typeof globalThis.VideoTrackGenerator,MediaStreamTrackGenerator:typeof globalThis.MediaStreamTrackGenerator,appendEncodedChunks:typeof globalThis.SourceBuffer?.prototype.appendEncodedChunks,appendBuffer:typeof globalThis.SourceBuffer?.prototype.appendBuffer,invalidControl:typeof globalThis.SourceBuffer?.prototype.demuxeNonexistentProbeControl})`],{type:'text/javascript'}));const worker=new Worker(url);worker.onmessage=e=>{worker.terminate();URL.revokeObjectURL(url);resolve(e.data);};worker.onerror=e=>{worker.terminate();URL.revokeObjectURL(url);reject(Error(e.message));};}));
 for(const p of [result.window,result.worker]){assert.equal(p.appendBuffer,'function');assert.equal(p.invalidControl,'undefined');}
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);result.cleanup=true;result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile('results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/api-gates.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
