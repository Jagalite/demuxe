// SPDX-License-Identifier: Apache-2.0
// Short browser gate for the upgraded Software engine; no CPU measurements.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../../experiments/pipeline-qualification/server.mjs';

const cases=[
 ['h264','build/fixtures/software-full/h264-aac.mp4'],
 ['hevc','build/fixtures/software-full/hevc-ac3.mkv'],
 ['av1','build/fixtures/format-matrix/av1.mp4'],
 ['mpeg2','build/fixtures/software-full/mpeg2-mp2.ts'],
 ['mpeg4','build/fixtures/software-full/mpeg4-mp3.avi'],
 ['prores','build/fixtures/software-full/prores-pcm.mov'],
];
const out='results/subtitle-stack-upgrade',report={cases:[]},server=await serve();
try{
 for(const [name,path] of cases){
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:640,height:360}}),item={name,path};report.cases.push(item);
  try{
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'software',width:640,height:360});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(path);
   await page.evaluate(async()=>{await player.open(document.querySelector('#media').files[0]);await player.play();});
   await page.waitForFunction(()=>player.diagnostics.backend?.rendered>=4,null,{timeout:15000});
   item.playing=await page.evaluate(()=>({decoder:player.diagnostics.backend.decoder,rendered:player.diagnostics.backend.rendered,audio:player.audioDiagnostics(),time:player.properties.get('time-pos')}));
   if(item.playing.decoder!=='software'||item.playing.rendered<4)throw Error('Software video decode not established');
   await page.evaluate(async()=>{await player.pause();await player.seek(.75);await player.rate(1.5);await player.play();});
   await page.waitForFunction(()=>Number(player.properties.get('time-pos'))>.8,null,{timeout:10000});
   item.afterSeek=await page.evaluate(()=>({time:player.properties.get('time-pos'),rate:player.properties.get('speed'),rendered:player.diagnostics.backend.rendered}));
   if(name==='h264')await page.waitForFunction(()=>player.state.status==='ended',null,{timeout:10000});
   item.eof=name==='h264'?await page.evaluate(()=>player.state.status):'not-tested';
   item.passed=true;
   console.log('PASS',name,JSON.stringify({playing:item.playing,afterSeek:item.afterSeek,eof:item.eof}));
  }catch(error){item.error=String(error.stack||error);console.error('FAIL',name,item.error);process.exitCode=1;}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();await browser.close();await mkdir(out,{recursive:true});await writeFile(out+'/software-smoke.json',JSON.stringify(report,null,2)+'\n');}
 }
}finally{await server.close();}
