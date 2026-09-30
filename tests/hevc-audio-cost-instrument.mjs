// SPDX-License-Identifier: Apache-2.0
// Instrumentation only, not a CPU benchmark or production patch.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {serve} from './head-to-head/server.mjs';
const out=path.resolve('results/hevc-audio-cost/instrument-20260926-01');
await writeFile(path.join(out,'page.html'),'<style>body{margin:0}#surface{width:960px;height:540px}video{width:100%;height:100%}</style><div id="surface"></div>');
const server=await serve(path.resolve('build/head-to-head/assets-native-url-main-20260926-01'),out,path.join(out,'requests.jsonl'));
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});const report=[];
try{
 for(const fixture of ['hevc10-ac3','hevc10-eac3','hevc10-dts']){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
  try{
   await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
   await page.evaluate(async fixture=>{const {Player}=await import('/demuxe/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));await player.open({url:`/fixtures/${fixture}/index.mkv`,format:'file'});await player.play();},fixture);
   await page.waitForTimeout(5000);
   const setup=await page.evaluate(()=>{
    const b=player.current.backend,a=b.mpvAudio;if(!a)throw Error('No split audio service');
    window.cost={};
    function measured(name,fn,self,args){const at=performance.now();try{return fn.apply(self,args);}finally{const c=cost[name]??={calls:0,ms:0};c.calls++;c.ms+=performance.now()-at;}}
    for(const [o,key,name] of [[a,'estimatedAudioPresentationTime','timeline'],[a,'diagnostics','audioDiagnostics'],[b,'diagnostics','backendDiagnostics']]){
     const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(o),key);
     if(d?.get)Object.defineProperty(o,key,{configurable:true,get(){return measured(name,d.get,this,[]);}});
     else{const original=o[key];o[key]=function(...args){return measured(name,original,this,args);};}
    }
    a.engine.addEventListener('output',()=>{cost.outputEvents=(cost.outputEvents??0)+1;});
    return {route:player.diagnostics.plan.id,points:a.points.length};
   });
   await page.waitForTimeout(10000);
   const observation=await page.evaluate(()=>({cost,route:player.diagnostics.plan.id,audio:player.current.backend.mpvAudio.diagnostics}));
   report.push({fixture,setup,observation});console.log(fixture,JSON.stringify(observation.cost));
  }catch(e){report.push({fixture,error:String(e)});console.error(e);}
  finally{await context.close();await writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));}
 }
}finally{await browser.close();await server.close();}
