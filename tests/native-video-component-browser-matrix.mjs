// SPDX-License-Identifier: Apache-2.0
// Diagnostic browser routing check; each browser decides video viability itself.
import {chromium,firefox,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const fixtures=[
  ['ac3-5.1','build/head-to-head/assets-release-supplement-20260925-04/fixtures/h264-ac3/index.mkv'],
  ['ac3-ass','build/selective-production/h264-ac3-ass.mkv'],
];
const result=[];
const server=await serve();
try{
  for(const [name,type] of [['chrome',chromium],['firefox',firefox],['webkit',webkit]]){
    if(process.env.BROWSER&&name!==process.env.BROWSER)continue;
    let browser;
    try{browser=await type.launch(name==='chrome'?{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}:{headless:true});}
    catch(error){result.push({browser:name,launchError:String(error)});continue;}
    try{
      for(const [fixture,file] of fixtures){
        const row={browser:name,version:browser.version(),fixture,file};result.push(row);
        const page=await browser.newPage();page.setDefaultTimeout(70000);
        try{
          await page.goto(server.origin+'/experiment/page.html');
          await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.errors=[];player.addEventListener('error',event=>errors.push(String(event.detail)));const input=document.createElement('input');input.type='file';input.id='source';document.body.append(input);});
          await page.locator('#source').setInputFiles(file);
          await page.evaluate(()=>player.open(document.querySelector('#source').files[0]));
          await page.evaluate(()=>player.play());await page.waitForTimeout(1200);
          row.state=await page.evaluate(()=>({plan:player.diagnostics.plan?.id,mode:player.mode,position:player.state.currentTime,videoFrames:player.current.backend.video?.getVideoPlaybackQuality?.().totalVideoFrames??0,
            splitVideoCapability:player.diagnostics.planAdmission?.find(plan=>plan.id==='native-video-mpv-audio')?.browserCapability,
            audio:player.current.backend.mpvAudio?.engine.audioDiagnostics(),subtitle:player.diagnostics.backend?.mpvSubtitles?{avChains:player.diagnostics.backend.mpvSubtitles.avChains}:null,
            attempts:player.diagnostics.selection?.attempts,errors}));
          await page.evaluate(()=>player.destroy());
        }catch(error){row.error=String(error?.stack??error);try{row.attempts=await page.evaluate(()=>player.diagnostics.selection?.attempts);}catch{}}
        finally{await page.close();}
        console.log(name,fixture,JSON.stringify({plan:row.state?.plan,frames:row.state?.videoFrames,error:row.error}));
      }
    }finally{await browser.close();}
  }
}finally{await server.close();}
await mkdir('results/native-video-component-routing',{recursive:true});
await writeFile('results/native-video-component-routing/browser-matrix.json',JSON.stringify(result,null,2)+'\n');
