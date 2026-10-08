// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function control(config){const result={config,kind:'control',frames:[],checks:{},samples:[]};let p;
 try{
  p=new Player(document.querySelector('#surface'),{mode:config.path==='hybrid'?'hybrid':config.path==='software'?'software':'native',automaticSelection:false,nativeRemux:config.path==='remux'?'always':'never',remuxRuntime:'off',preview:false,startupEscalation:false,experimentalMpvSubtitles:false});
  await p.openRemote({url:new URL('/media/'+config.file,location.href).href,immutable:config.path!=='direct'});await p.play();
  const start=performance.now(),time=p.state.currentTime;while(performance.now()-start<8000){result.samples.push({wallMs:performance.now()-start,time:p.state.currentTime,status:p.state.status,diagnostics:p.current.backend.diagnostics});await sleep(100);}
  result.pace=(p.state.currentTime-time)/((performance.now()-start)/1000);result.checks.keepsPace=result.pace>.8;result.status=result.checks.keepsPace?'pass':'fail';
 }catch(e){result.status='fail';result.failure=String(e.stack??e);}finally{await p?.destroy();}
 await fetch('/receipt',{method:'POST',body:JSON.stringify(result)});return result;
}
