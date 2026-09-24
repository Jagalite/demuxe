// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from './server.mjs';
const out=`results/software-yuv-integration/routes-${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const server=await serve(),rows=[];
try{
 for(const name of ['mpeg2ts','mpeg2ps','mpeg4avi','prores'])for(const setting of ['auto','rgb','yuv']){
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage();const row={name,setting,chrome:browser.version()};rows.push(row);
  try{
   await page.goto(server.origin+'/experiment/page.html');
   row.state=await page.evaluate(async({setting,url})=>{
    const {Player}=await import('/web/generated/index.js');
    const player=window.routePlayer=new Player(document.querySelector('#surface'),{...(setting==='auto'?{}:{mode:'software',softwarePresenter:setting==='yuv'?'experimental-yuv':'rgb'}),width:1920,height:1080});
    const errors=[];player.addEventListener('error',e=>errors.push(String(e.detail)));
    await player.openRemote({url});await player.play();
    await new Promise((resolve,reject)=>{const end=performance.now()+15000;const tick=()=>{if((player.diagnostics.backend?.rendered??player.diagnostics.backend?.yuv?.frames??0)>3)return resolve();if(performance.now()>end)return reject(Error('No frames'));setTimeout(tick,30);};tick();});
    const answer={mode:player.mode,automatic:player.automaticSelection,plan:player.diagnostics.plan,selection:player.diagnostics.selection,backend:player.diagnostics.backend,videoParams:player.properties.get('video-params'),videoCodec:player.properties.get('video-codec'),audioCodec:player.properties.get('audio-codec-name'),errors};
    await player.destroy();return answer;
   },{setting,url:`${server.origin}/media/${name}`});
   await page.waitForTimeout(300);row.workersAfter=page.workers().length;
   console.log(name,setting,row.state.mode,row.state.backend?.softwarePresenter,row.state.backend?.yuv?.fallbackFrames,row.workersAfter);
  }catch(error){row.error=String(error.stack||error);console.log(name,setting,'ERROR',String(error));}
  finally{if(!row.state)await page.evaluate(()=>window.routePlayer?.destroy()).catch(()=>{});await browser.close();await writeFile(`${out}/result.json`,JSON.stringify(rows,null,2)+'\n');}
 }
}finally{await server.close();console.log(out);}
