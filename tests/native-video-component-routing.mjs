// SPDX-License-Identifier: Apache-2.0
// Bounded production Auto regressions for independent browser video ownership.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {markedImage} from './head-to-head/checks.mjs';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const root='build/head-to-head/assets-release-supplement-20260925-04/fixtures';
const output=process.env.OUT??'results/native-video-component-routing/correctness.json';
const packets=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash','-of','json',file],{encoding:'utf8',maxBuffer:8*1024*1024})).packets;
const cases=[
  {name:'ac3-5.1',file:`${root}/h264-ac3/index.mkv`,expect:'native-video-mpv-audio'},
  {name:'eac3-5.1',file:`${root}/h264-eac3/index.mkv`,expect:'native-video-mpv-audio'},
  {name:'dts-5.1',file:`${root}/h264-dts/index.mkv`,expect:'native-video-mpv-audio'},
  {name:'pcm16-stereo',file:`${root}/h264-pcm16/index.mkv`,expect:'native'},
  {name:'pcm24-5.1',file:`${root}/h264-pcm51/index.mkv`,expect:'native'},
  {name:'pcm16-split',file:`${root}/h264-pcm16/index.mkv`,expect:'native-video-mpv-audio',options:{nativeRemux:'always'}},
  {name:'pcm24-5.1-split',file:`${root}/h264-pcm51/index.mkv`,expect:'native-video-mpv-audio',options:{nativeRemux:'always'}},
  {name:'hevc-eac3',file:`${root}/hevc10-eac3/index.mkv`,expect:'native-video-mpv-audio',repeatSeeks:[10,9.95,1]},
  {name:'ac3-ass',file:'build/selective-production/h264-ac3-ass.mkv',expect:'native-video-mpv-audio-subtitles',subtitle:'Selective fixture'},
  {name:'ac3-pgs',file:'build/selective-production/h264-ac3-pgs.mkv',expect:'native-video-mpv-audio-subtitles',subtitle:'bitmap'},
  {name:'ac3-vtt',file:`${root}/h264-ac3/index.mkv`,expect:'native-video-mpv-audio',vtt:true},
  {name:'ac3-output-5.1',file:`${root}/h264-ac3/index.mkv`,expect:'hybrid',options:{audioOutput:'5.1'}},
];
const selected=cases.filter(item=>!process.env.CASE||process.env.CASE===item.name);
const result={browser:null,cases:[]};
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
result.browser=browser.version();
try{
  for(const item of selected){
    const row={name:item.name,file:item.file,expect:item.expect,phases:[],errors:[]};result.cases.push(row);
    const page=await browser.newPage({viewport:{width:960,height:540}});
    page.on('pageerror',error=>row.errors.push(String(error)));
    try{
      await page.goto(server.origin+'/experiment/page.html');
      if(item.repeatSeeks)await page.evaluate(()=>{
        window.remuxCaptures=[];
        const OriginalWorker=window.Worker;
        window.Worker=class extends OriginalWorker{
          constructor(url,options){
            super(url,options);
            if(new URL(String(url),location.href).pathname.endsWith('/native-remux-worker.js')){
              const capture=[];remuxCaptures.push(capture);
              this.addEventListener('message',({data})=>{
                if(!['ready','fragment','fragment-part'].includes(data.type))return;
                for(const buffer of [...(data.parts??[]),...(data.buffer?[data.buffer]:[])])
                  if(buffer.byteLength)capture.push(Array.from(new Uint8Array(buffer)));
              });
            }
          }
        };
      });
      await page.evaluate(async options=>{
        const {Player}=await import('/web/generated/index.js');
        window.player=new Player(document.querySelector('#surface'),options);
        window.errors=[];player.addEventListener('error',event=>errors.push(String(event.detail)));
        const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);
      },item.options??{});
      await page.locator('#source').setInputFiles(item.file);
      await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
      if(item.vtt)await page.evaluate(()=>player.addSubtitle(new File(['WEBVTT\n\n00:00:00.500 --> 00:00:04.000\nNATIVE CAPTION\n'],'caption.vtt')));
      await page.evaluate(()=>player.play());
      await page.waitForTimeout(1200);
      const snapshot=()=>page.evaluate(async()=>{
        const backend=player.current.backend,video=backend.video,diag=player.diagnostics.backend;
        const canvas=document.querySelector('.demuxe-native-ass');
        let pixels=0;
        if(canvas){const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=3;i<rgba.length;i+=4)if(rgba[i])pixels++;}
        return {plan:player.diagnostics.plan?.id,time:player.state.currentTime,frames:video?.getVideoPlaybackQuality?.().totalVideoFrames??diag.rendered??0,
          audio:diag.mpvAudio?{underruns:diag.mpvAudio.preEofUnderruns,driftP95Ms:diag.mpvAudio.absErrorP95Ms,mpvVideoTracks:diag.mpvAudio.mpvVideoTracks,...backend.mpvAudio.engine.audioDiagnostics()}:null,
          nativeAudio:diag.capability?.audioEvidenceStrength,subtitle:diag.mpvSubtitles?{avChains:diag.mpvSubtitles.avChains,text:await backend.mpvSubs.currentText(),pixels}:null,
          browserCues:Array.from(video?.textTracks??[]).flatMap(track=>Array.from(track.activeCues??[],cue=>cue.text)),
          errors,attempts:player.diagnostics.selection?.attempts};
      });
      row.phases.push({name:'play',state:await snapshot()});
      await page.evaluate(()=>player.seek(10));row.phases.push({name:'seek-forward',state:await snapshot()});
      await page.evaluate(()=>player.seek(1));row.phases.push({name:'seek-backward',state:await snapshot()});
      if(item.repeatSeeks){
        await page.evaluate(()=>player.pause());
        for(const target of item.repeatSeeks){
          await page.evaluate(time=>player.seek(time),target);
          const state=await snapshot();row.phases.push({name:`paused-seek-${target}`,state});
          assert.ok(Math.abs(state.time-target)<.1,`${item.name}: seek did not settle at ${target}`);
          const image=markedImage(await page.locator('#surface video').screenshot(),target);
          row.phases.at(-1).image=image;
          assert.ok(image.markerCorrect,`${item.name}: wrong displayed timeline marker at ${target}`);
        }
        await page.evaluate(()=>player.play());
        await page.waitForFunction(()=>player.state.currentTime>2,{},{timeout:10000});
        row.phases.push({name:'resume-across-cra',state:await snapshot()});
        assert.ok(row.phases.at(-1).state.time>2,`${item.name}: playback did not progress across the next CRA`);
        // Packet identity catches silent removal of later CRA leading pictures,
        // which clock progression and a coarse displayed marker cannot detect.
        const capture=await page.evaluate(()=>remuxCaptures.at(-1));
        assert.ok(capture?.length,`${item.name}: no remux packet capture`);
        const capturedFile=output.replace(/\.json$/,'')+'-hevc-continuous.mp4';
        await mkdir(dirname(capturedFile),{recursive:true});
        await writeFile(capturedFile,Buffer.concat(capture.map(bytes=>Buffer.from(bytes))));
        const original=packets(item.file),remuxed=packets(capturedFile);
        const expected=original.filter(p=>Number(p.pts_time)>=1.75&&Number(p.pts_time)<2);
        assert.ok(expected.length>=6,`${item.name}: missing source pictures before continuous CRA`);
        const hashes=new Set(remuxed.map(p=>p.data_hash));
        for(const packet of expected)assert.ok(packet.data_hash&&hashes.has(packet.data_hash),`${item.name}: lost/changed continuous picture at ${packet.pts_time}`);
        const suppressed=original.find(p=>Math.abs(Number(p.pts_time)-.967)<.001);
        assert.ok(suppressed?.data_hash,`${item.name}: fixture lacks initial RASL control`);
        assert.ok(!hashes.has(suppressed.data_hash),`${item.name}: initial RASL was not suppressed`);
        row.packetIdentity={capturedFile,continuous:expected,suppressed};
      }
      if(item.subtitle){await page.evaluate(time=>player.seek(time),item.subtitle==='bitmap'?.75:2.5);row.phases.push({name:'subtitle',state:await snapshot()});}
      await page.evaluate(()=>player.setPlaybackRate(1.5));await page.waitForTimeout(500);
      row.phases.push({name:'rate',state:await snapshot()});
      await page.evaluate(()=>player.pause());row.phases.push({name:'pause',state:await snapshot()});
      row.workersBeforeDestroy=page.workers().length;
      await page.evaluate(()=>player.destroy());
      await page.waitForTimeout(300);row.workersAfterDestroy=page.workers().length;
      const phases=row.phases.map(phase=>phase.state);
      assert.ok(phases.every(s=>s.plan===item.expect||item.expect==='native'&&s.plan?.startsWith('native-')),`${item.name}: unexpected route`);
      assert.ok(phases.every(s=>!s.errors.length)&&phases[0].frames>0,`${item.name}: missing video or error`);
      if(item.expect.startsWith('native-video'))assert.ok(phases.filter(s=>s.audio).every(s=>s.audio.underruns===0&&s.audio.mpvVideoTracks===0),`${item.name}: mpv audio output`);
      if(item.expect.startsWith('native-video'))assert.ok(phases[0].audio?.mediaFrames>6000&&phases[0].audio.rms>.001,`${item.name}: decoded PCM is absent`);
      if(item.repeatSeeks)assert.ok(phases.every(s=>!s.attempts?.some(a=>a.reason.startsWith('Seek presentation failure:'))),`${item.name}: seek required fallback`);
      if(item.subtitle){const samples=row.phases.map(phase=>phase.state.subtitle).filter(Boolean);assert.ok(samples.every(s=>s.avChains===0));assert.ok(item.subtitle==='bitmap'?samples.some(s=>s.pixels>0):samples.some(s=>s.text.includes(item.subtitle)),`${item.name}: subtitle output`);}
      if(item.vtt)assert.ok(phases.some(s=>s.browserCues.includes('NATIVE CAPTION')),`${item.name}: browser caption output`);
      assert.equal(row.workersAfterDestroy,0,`${item.name}: leaked worker`);
      row.passed=true;
    }catch(error){row.passed=false;row.failure=String(error?.stack??error);console.error(item.name,row.failure);}
    finally{await page.close();}
    console.log(item.name,JSON.stringify({passed:row.passed,plans:row.phases.map(phase=>phase.state.plan),failure:row.failure}));
  }
}finally{await browser.close();await server.close();}
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(result,null,2)+'\n');
if(result.cases.some(item=>!item.passed))process.exitCode=1;
