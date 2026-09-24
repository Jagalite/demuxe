// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {serve} from '../pipeline-qualification/server.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await serve({pagePath:'experiments/software-yuv-fidelity/player.html',mediaPaths:{prores:'build/yuv-cpu-investigation/prores-pcm.mov'}}),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{const page=await browser.newPage({viewport:{width:640,height:360}});await page.goto(server.origin+'/experiment/page.html');await page.waitForFunction(()=>!!window.openFixture);const result=await page.evaluate(p=>window.openFixture('yuv',p.url,640,360),{url:server.origin+'/media/prores'});await writeFile('results/software-yuv-fidelity/fallback.json',JSON.stringify(result,null,2)+'\n');assert.equal(result.videoParams.pixelformat,'yuv422p10');assert.equal(result.backend.softwarePresenter,'rgb');assert.equal(result.backend.yuvRejectionReason,'pixel-format');assert.ok(result.backend.yuv.fallbackFrames>0);assert.deepEqual(result.errors,[]);console.log(JSON.stringify({pixelformat:result.videoParams.pixelformat,fallbackFrames:result.backend.yuv.fallbackFrames,errors:result.errors}));await page.evaluate(()=>player.destroy());}finally{await browser.close();await server.close();}
