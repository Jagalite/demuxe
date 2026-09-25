// SPDX-License-Identifier: Apache-2.0
// Read-only metadata probe against the unchanged production host scheduler.
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const root=resolve('results/subtitle-deadline-candidate');
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={chrome:browser.version(),fixtures:[]};
try{
 for(const name of (process.env.FIXTURES?.split(',')??['stress-srt.mkv','mixed-ass.mkv','late-srt.mkv','pgs.mkv','vobsub.mkv'])){
  const page=await browser.newPage({viewport:{width:960,height:540}});
  const fixture={name,points:[]};result.fixtures.push(fixture);
  try{
   await page.route('**/web/engine-subtitles/service.mjs',async route=>route.fulfill({contentType:'text/javascript',body:await readFile(root+'/engine/service.mjs')}));
   await page.route('**/web/engine-subtitles/service.wasm',async route=>route.fulfill({contentType:'application/wasm',body:await readFile(root+'/engine/service.wasm')}));
   await page.route('**/web/mpv-subtitle-worker.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    const before="}else if(d.type==='render'){";
    if(!source.includes(before))throw Error('Worker patch drift');
    source=source.replace(before,` }else if(d.type==='candidateSnapshot'){
      const ptr=textPointer,view=new DataView(engine.HEAPU8.buffer),started=performance.now();
      const status=engine._subtitle_candidate_snapshot(d.seconds,ptr);
      const values=Array.from({length:5},(_,i)=>view.getFloat64(ptr+i*8,true));
      postMessage({id:d.id,status,values,workerMs:performance.now()-started});return;
    }else if(d.type==='render'){`);
    await route.fulfill({response,body:source});
   });
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   const path=name==='pgs.mkv'?'build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv':name==='vobsub.mkv'?'build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv':root+'/fixtures/'+name;
   await page.locator('#media').setInputFiles(path);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   await page.evaluate(()=>player.selectSubtitleTrack(player.state.subtitleTracks[0].id));
   fixture.route=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,service:player.diagnostics.backend.mpvSubtitles}));
   if(fixture.route.plan!=='native-direct-mpv'||fixture.route.service.avChains!==0)throw Error('Route mismatch');
   const points=name.startsWith('stress')?[0,.5,3.2,4.2,5.2,10.9,11.045,11.10,12.1,13.1,34.7]:name.startsWith('mixed')?[0,.5,3.2,4.2,5.2,12.2,18.2,25.2,33.5]:name.startsWith('late')?[1.5,4.5,30,199,201]:[0,1,20,35.1,35.5];
   for(const target of points){
    const point=await page.evaluate(async target=>{
     await player.seek(target);
     const s=player.current.backend.mpvSubs,now=player.state.currentTime;
     const text=await s.currentText();
     const snapshot=await s.request('candidateSnapshot',{seconds:now});
     const canvas=s.canvas,ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     let nonzeroAlpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])nonzeroAlpha++;
     return {target,now,text,snapshot,nonzeroAlpha,bitmapUpdates:s.stats.bitmapUpdates};
    },target);
    fixture.points.push(point);console.log(name,JSON.stringify(point));
   }
   await page.evaluate(()=>player.destroy());
  }catch(e){fixture.error=String(e.stack||e);console.error(name,fixture.error);}
  finally{await page.close();await writeFile(root+'/probe.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();await server.close();}
