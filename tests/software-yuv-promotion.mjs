// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {serve} from '../experiments/software-yuv-integration/server.mjs';

const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();
 await page.goto(server.origin+'/experiment/page.html');
 const ts=server.origin+'/media/mpeg2ts',ps=server.origin+'/media/mpeg2ps',avi=server.origin+'/media/mpeg4avi',prores=server.origin+'/media/prores';
 await page.evaluate(url=>start({variant:'auto',url}),ts);
 await page.waitForFunction(()=>snapshot().diagnostics.softwarePresenter==='yuv');
 const first=await page.evaluate(()=>snapshot());
 assert.equal(first.diagnostics.yuvRejectionReason,null);
 for(const url of [ps,avi]){
  await page.evaluate(async next=>{await player.openRemote({url:next});await player.play();},url);
  await page.waitForFunction(()=>snapshot().diagnostics.softwarePresenter==='yuv'&&snapshot().frames>0);
  assert.equal((await page.evaluate(()=>snapshot())).diagnostics.yuvRejectionReason,null);
 }
 await page.evaluate(async()=>{await player.rate(1.25);await player.pause();await player.play();});
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>player.state.playbackRate),1.25);
 await page.evaluate(async url=>{await player.openRemote({url});await player.play();},prores);
 await page.waitForFunction(()=>snapshot().diagnostics.softwarePresenter==='rgb'&&snapshot().diagnostics.yuvRejectionReason==='pixel-format');
 const fallback=await page.evaluate(()=>snapshot());
 assert.equal(playerError(fallback),null);
 await page.evaluate(async url=>{await player.openRemote({url});await player.play();},ts);
 await page.waitForFunction(()=>snapshot().diagnostics.softwarePresenter==='yuv'&&snapshot().frames>0);
 const replaced=await page.evaluate(()=>snapshot());
 assert.equal(playerError(replaced),null);
 assert.equal(replaced.diagnostics.yuvRejectionReason,null);
 await page.evaluate(()=>stop());
 await page.waitForTimeout(250);
 assert.equal(page.workers().length,0);
 console.log(JSON.stringify({passed:true,qualifiedRoutes:['mpeg2ts','mpeg2ps','mpeg4avi'],first:first.diagnostics.softwarePresenter,fallback:{presenter:fallback.diagnostics.softwarePresenter,reason:fallback.diagnostics.yuvRejectionReason},replaced:replaced.diagnostics.softwarePresenter,workersAfter:page.workers().length}));
}finally{await browser.close();await server.close();}

function playerError(snapshot){return snapshot.errors.length?snapshot.errors:null;}
