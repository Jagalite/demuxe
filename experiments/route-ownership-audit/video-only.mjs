// SPDX-License-Identifier: Apache-2.0
// Research-only packet-copy/browser-presentation check on frozen fixture files.
import {chromium} from 'playwright';
import {readdir, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const root='build/head-to-head/assets-release-supplement-20260925-04/fixtures';
const names=['h264-pcm16','h264-pcm51','h264-ac3','h264-eac3','h264-dts','hevc10-ac3','hevc10-eac3','hevc10-dts','h264-ts','h264-srt','h264-movtext','h264-ass','h264-aac-pgs-isolation','h264-aac-vobsub-isolation'];
const out='results/route-ownership-audit';
const server=await serve();
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const rows=[];
try{
 const page=await browser.newPage();
 const cdp=await page.context().newCDPSession(page);
 const media=[];cdp.on('Media.playerPropertiesChanged',e=>media.push(e));await cdp.send('Media.enable');
 await page.goto(server.origin+'/experiment/page.html');
 await page.evaluate(()=>{const input=document.createElement('input');input.id='source';input.type='file';document.body.append(input);window.video=document.createElement('video');video.muted=true;video.playsInline=true;document.body.append(video);});
 for(const name of names){
  const files=await readdir(path.join(root,name));const file=path.join(root,name,files.find(f=>/^index\./.test(f)));
  const row={name,file};rows.push(row);media.length=0;
  try{
   await page.locator('#source').setInputFiles(file);
   Object.assign(row,await page.evaluate(async()=>{
    const {RemuxPlayer}=await import('/web/native-remux-player.js');
    const source=document.querySelector('#source').files[0];
    const remux=new RemuxPlayer(video,{mseOwner:'window'});
    let error;
    const onError=()=>{error=video.error?.message};video.addEventListener('error',onError);
    try{
     await remux.open({file:source,videoOnly:true});await remux.play();
     const until=performance.now()+6500;
     while(performance.now()<until&&!(video.currentTime>1&&video.getVideoPlaybackQuality().totalVideoFrames>10))await new Promise(r=>setTimeout(r,25));
     const result={mime:remux.mime,tracks:remux.tracks,position:video.currentTime,frames:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames,width:video.videoWidth,error};
     if(result.position>1&&result.frames>10){await remux.seek(8);const seekUntil=performance.now()+5000;while(performance.now()<seekUntil&&video.currentTime<8)await new Promise(r=>setTimeout(r,25));result.seekPosition=video.currentTime;}
     return result;
    }finally{video.removeEventListener('error',onError);await remux.destroy();}
   }));
   const props=media.flatMap(e=>e.properties??[]);row.decoder=props.find(p=>p.name==='kVideoDecoderName')?.value??null;row.platform=props.find(p=>p.name==='kIsPlatformVideoDecoder')?.value??null;
   row.passed=row.frames>10&&row.position>1&&row.seekPosition>=8&&!row.error;
  }catch(error){row.error=String(error?.stack??error);row.passed=false;}
  console.log(JSON.stringify(row));
 }
}finally{await browser.close();await server.close();await mkdir(out,{recursive:true});await writeFile(path.join(out,'video-only.json'),JSON.stringify({browser:browser.version(),rows},null,2)+'\n');}
