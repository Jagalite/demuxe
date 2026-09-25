// SPDX-License-Identifier: Apache-2.0
// Test-only probe for timing metadata from the pinned Wasm/mpv subtitle service.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const root=resolve('results/subtitle-timing-poc');
const fixture='results/subtitle-timing-poc/fixtures/h264-aac-two-cues.mkv';
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:960,height:540}});
const result={chrome:browser.version(),fixture,states:[]};
try{
 await page.route('**/web/engine-subtitles/service.mjs',async route=>route.fulfill({contentType:'text/javascript',body:await readFile(root+'/engine/service.mjs')}));
 await page.route('**/web/engine-subtitles/service.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/service.wasm')}));
 await page.route('**/web/mpv-subtitle-worker.js',async route=>{
  let response=await route.fetch(),source=await response.text();
  const before="}else if(d.type==='render'){";
  const insert=`}else if(d.type==='timing'){
    const pointer=engine._malloc(8192),view=new DataView(engine.HEAPU8.buffer);
    try{
      const a=performance.now(),count=engine._subtitle_poc_lines(pointer,512),linesMs=performance.now()-a;
      const lines=[];if(count>0)for(let i=0;i<count;i++)lines.push([view.getFloat64(pointer+16*i,true),view.getFloat64(pointer+16*i+8,true)]);
      const b=performance.now(),mask=engine._subtitle_poc_current(pointer),currentMs=performance.now()-b;
      const current=[view.getFloat64(pointer,true),view.getFloat64(pointer+8,true)];
      const c=performance.now(),stepStatus=engine._subtitle_poc_step(d.seconds,1,pointer),stepMs=performance.now()-c;
      const next=stepStatus>0?view.getFloat64(pointer,true):null;
      postMessage({id:d.id,count,lines,linesMs,mask,current,currentMs,stepStatus,next,stepMs});return;
    }finally{engine._free(pointer);}
  }else if(d.type==='render'){`;
  if(!source.includes(before))throw Error('worker patch target drift');
  await route.fulfill({response,body:source.replace(before,insert)});
 });
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
 await page.locator('#media').setInputFiles(fixture);
 await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
 await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
 result.route=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,service:player.diagnostics.backend.mpvSubtitles}));
 const state=async(label)=>{let x=await page.evaluate(async()=>{const s=player.current.backend.mpvSubs,begin=performance.now(),timing=await s.request('timing',{seconds:player.state.currentTime});return {time:player.state.currentTime,requestMs:performance.now()-begin,timing,rendered:s.stats.renders,bitmapUpdates:s.stats.bitmapUpdates,visual:s.canvas.getContext('2d').getImageData(0,0,s.canvas.width,s.canvas.height).data.some((v,i)=>i%4===3&&v>0)};});result.states.push({label,...x});console.log(label,JSON.stringify(x));};
 await state('selected');
 await page.evaluate(()=>player.play());
 await page.waitForFunction(()=>player.state.currentTime>1);
 await state('first-active');
 await page.evaluate(()=>player.seek(13));
 await page.waitForFunction(()=>player.state.currentTime>12.9);
 await state('gap');
 await page.evaluate(()=>player.seek(17));
 await page.waitForFunction(()=>player.state.currentTime>16.9);
 await state('second-active');
 await page.evaluate(()=>player.destroy());
}finally{await mkdir(root,{recursive:true});await writeFile(root+'/probe.json',JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();}
