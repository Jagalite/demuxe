// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const root='build/head-to-head/assets-component-isolation-01/fixtures';
const cases=[
  ['h264-srt','index.mkv'],
  ['h264-movtext','index.mp4'],
  ['h264-ass','index.mkv'],
  ['multi-srt','build/mpv-subtitle-service/generalization/multi-srt.mkv'],
  ['h264-pgs','build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv'],
  ['h264-vobsub','build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv'],
];
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
  for(const [name,filename,lane] of cases.flatMap(([name,filename])=>[['direct',name,filename],['remux',name,filename]].map(([lane,n,f])=>[n,f,lane])).filter(([name,,lane])=>(!process.env.SUBTITLE_CASE||name===process.env.SUBTITLE_CASE)&&(!process.env.SUBTITLE_LANE||lane===process.env.SUBTITLE_LANE))){
    const page=await browser.newPage();
    const workerHistory=[];page.on('worker',worker=>{const item={url:worker.url(),closed:false};workerHistory.push(item);worker.on('close',()=>item.closed=true);});
    page.on('pageerror',error=>console.error('page error',error));
    await page.goto(server.origin+'/experiment/page.html');
    await page.evaluate(async lane=>{
      const {Player}=await import('/web/generated/index.js');
      window.player=new Player(document.querySelector('#surface'),{nativeRemux:lane==='remux'?'always':'auto'});
      const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);
    },lane);
    await page.locator('#media').setInputFiles(filename.includes('/')?filename:`${root}/${name}/${filename}`);
    try{await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));}
    catch(error){console.error(name,await page.evaluate(()=>player.diagnostics.selection));throw error;}
    const initial=await page.evaluate(()=>({plan:player.diagnostics.plan.id,backend:player.diagnostics.backend.plan,tracks:player.state.subtitleTracks}));
    assert.equal(initial.plan,lane==='direct'?'native-direct-mpv':'native-remux-mpv',`${name}: ${JSON.stringify(initial)}`);
    await page.evaluate(()=>player.play());await page.waitForTimeout(200);await page.evaluate(()=>player.pause());
    for(const seconds of [.25,.75,6,10,1,35.9]){
      await page.evaluate(time=>player.seek(time),seconds);
      await page.waitForTimeout(250);
      const d=await page.evaluate(async()=>({backend:player.diagnostics.backend,selection:player.diagnostics.selection,text:await player.current.backend.mpvSubs?.currentText(),...(()=>{const c=document.querySelector('.demuxe-native-ass');if(!c)return {pixels:0,magenta:0};const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0,magenta=0;for(let i=0;i<data.length;i+=4){if(data[i+3])pixels++;if(data[i]>140&&data[i+1]<95&&data[i+2]>140&&data[i+3])magenta++;}return {pixels,magenta};})()}));
      if(d.text===undefined)throw Error(`${name} lost subtitle service: ${JSON.stringify(d.selection)}`);
      assert.equal(d.backend.mpvSubtitles.avChains,0);
      if(['h264-srt','h264-movtext','multi-srt'].includes(name))assert.equal(d.text,seconds>=.5&&seconds<35.8?'DE MUXE TEST 123':'');
      const visible=name==='h264-pgs'||name==='h264-vobsub'?seconds<35.3:seconds>=.5&&seconds<35.8;
      assert.equal(d.pixels>0,visible,`${name} ${seconds}: visible overlay`);
      if(visible&&['h264-ass','h264-pgs','h264-vobsub'].includes(name))assert.ok(d.magenta>1000,`${name} ${seconds}: marked palette/shape color`);
      console.log(name,lane,seconds,initial.plan,d.pixels,JSON.stringify(d.text),d.backend.mpvSubtitles.io?.cacheHits);
    }
    await page.evaluate(()=>player.play());
    await page.waitForFunction(()=>player.state.status==='ended',null,{timeout:8000});
    await page.evaluate(()=>player.pause());
    await page.evaluate(()=>player.seek(1));await page.waitForTimeout(250);
    await page.evaluate(()=>player.subtitleVisible(false));
    assert.equal(await page.locator('.demuxe-native-ass').evaluate(node=>getComputedStyle(node).display),'none');
    await page.evaluate(()=>player.subtitleVisible(true));
    await page.evaluate(()=>player.selectSubtitleTrack(null));
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),'');
    await page.evaluate(id=>player.selectSubtitleTrack(id),initial.tracks[0].id);
    await page.waitForTimeout(250);
    if(name==='h264-srt'||name==='h264-movtext'||name==='multi-srt')assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),'DE MUXE TEST 123');
    if(name==='multi-srt'){
      assert.equal(initial.tracks.length,2);
      await page.evaluate(id=>player.selectSubtitleTrack(id),initial.tracks[1].id);
      await page.evaluate(()=>player.seek(1));await page.waitForTimeout(300);
      assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),'SECOND TRACK 456');
      await page.evaluate(id=>player.selectSubtitleTrack(id),initial.tracks[0].id);
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),'DE MUXE TEST 123');
      await page.evaluate(()=>player.seek(1));await page.evaluate(()=>player.play());
      await page.evaluate(id=>player.selectSubtitleTrack(id),initial.tracks[1].id);
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.currentText()),'SECOND TRACK 456');
      await page.evaluate(()=>player.pause());
    }
    await page.evaluate(()=>player.setPlaybackRate(1.5));
    await page.evaluate(()=>{window.oldNativeBackend=player.current.backend;return player.destroy();});
    await page.locator('#media').evaluate(node=>node.remove());
    for(let i=0;i<50&&page.workers().length;i++)await page.waitForTimeout(100);
    if(page.workers().length)console.log('cleanup detail',workerHistory,await page.evaluate(()=>({stopped:oldNativeBackend.stopped,remuxStopped:oldNativeBackend.remux?.stopped,remuxWorker:!!oldNativeBackend.remux?.worker,releasing:!!oldNativeBackend.remux?.releasing,mpvStopped:oldNativeBackend.mpvSubs?.stopped})));
    assert.equal(page.workers().length,0,`${name} leaked workers: ${page.workers().map(worker=>worker.url()).join(', ')}`);
    await page.close();
  }
}finally{await browser.close();await server.close();}
