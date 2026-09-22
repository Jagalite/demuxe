// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {serveLab,bounded} from './screened-owner-lab.mjs';
const context=JSON.parse(await readFile(process.argv[2],'utf8')),out=context.run+'/boundary-checks';await mkdir(out,{recursive:true});
const server=await serveLab(context),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),videos:[]};const save=()=>writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n');
async function video(name,batch,times,policy='always'){
 const page=await browser.newPage();await page.goto(server.origin+'/current/');let row={name,policy,times};result.videos.push(row);
 try{Object.assign(row,await bounded(page.evaluate(async({name,batch,times,policy,build})=>{
  const {Player}=await import('/current/web/generated/index.js');window.p=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:policy});const errors=[];p.addEventListener('error',e=>errors.push(String(e.detail)));
  await p.openRemote({url:location.origin+'/'+build+`/batch${String(batch).padStart(2,'0')}/`+name});
  const frames=[];const duration=p.properties.get('duration');
  for(const t of times){await p.seek(t);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const v=p.surface,c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;frames.push({target:t,actual:p.properties.get('time-pos'),width:c.width,height:c.height,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('')});}
  const buffered=Array.from({length:p.surface.buffered.length},(_,i)=>[p.surface.buffered.start(i),p.surface.buffered.end(i)]);await p.seek(Math.max(0,duration-.4));await p.play();await new Promise((resolve,reject)=>{const start=performance.now(),timer=setInterval(()=>{if(p.surface.ended){clearInterval(timer);resolve();}else if(performance.now()-start>5000){clearInterval(timer);reject(Error('EOF deadline'));}},30);});
  const route=p.diagnostics.plan?.id;await p.destroy();return {frames,duration,buffered,route,errors,eof:true};
 },{name,batch,times,policy,build:context.build}),22000));row.completed=true;}catch(e){row.error=String(e);row.completed=false;}
 finally{await bounded(page.evaluate(()=>window.p?.destroy()).catch(()=>{}),2000).catch(()=>{});await page.waitForTimeout(80);row.workersAfterDestroy=page.workers().length;await page.close();await save();console.log(name,policy,row.completed?'PASS':row.error);}
 return row;
}
try{
 // Exact real SourceBuffer removal called by the maintained pump, versus a late cut.
 const page=await browser.newPage();await page.goto(server.origin+'/current/');
 result.eviction=await bounded(page.evaluate(async build=>{
  const {RemuxPlayer}=await import('/current/web/native-remux-player.js');const data=await(await fetch('/'+build+'/batch11/video6.mp4')).arrayBuffer(),results=[];
  const event=(target,name)=>new Promise((resolve,reject)=>{target.addEventListener(name,resolve,{once:true});target.addEventListener('error',()=>reject(Error('MSE error')),{once:true});});
  for(const negative of [false,true]){
   const v=document.createElement('video'),ms=new MediaSource(),url=URL.createObjectURL(ms);v.src=url;document.body.append(v);await event(ms,'sourceopen');const sb=ms.addSourceBuffer('video/mp4; codecs="avc1.64000A"');let done=event(sb,'updateend');sb.appendBuffer(data);await done;
   const ranges=()=>Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]),before=ranges();
   done=event(sb,'updateend');let actualRemove;
   if(negative){actualRemove=4.0001;sb.remove(0,actualRemove);}else{
    const original=sb.remove.bind(sb);sb.remove=(a,b)=>{actualRemove=b;original(a,b);};
    const owner=Object.assign(Object.create(RemuxPlayer.prototype),{stopped:false,sb,busy:false,pulling:false,media:ms,video:{currentTime:4.5,paused:true,seeking:false,playbackRate:1},timelineBias:0,target:4.5,targetReady:true,ranges,raps:[0,2,4],segments:[],pending:null,eof:false,lastEviction:-Infinity,buffering:{backwardSeconds:.5},stats:{peakBufferedSeconds:0,peakBufferedBytesUpperBound:0,gapSkips:[]},worker:{postMessage(){}},fail:e=>{throw Error(e);}});owner.pump();
   }
   await done;results.push({negative,before,actualRemove,after:ranges()});v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);
  }return results;
 },context.build),15000).catch(e=>({error:String(e)}));await page.close();await save();
 const explicit=await video('vfr_explicit.webm',17,[.06,.3,.62,1.1,1.56,2.2]);
 const direct=await video('vfr_explicit.webm',17,[.06,.3,.62,1.1,1.56,2.2],'never');
 await video('vfr_default_short.webm',17,[.06,.3,.62,1.1,1.56]);
 result.sparseVideo={exactCheckedPictures:explicit.completed&&direct.completed&&explicit.frames.every((f,i)=>f.sha256===direct.frames[i].sha256),completeHoldBuffered:explicit.buffered?.some(([a,b])=>a<=.01&&b>=2.74)};
 for(const name of ['sar_s2_p2_w320.mp4','sar_rotated_s2.mp4','sar_s2_p1_w160.mp4','sar_s1_p2_w320.mp4']){
  await video(name,17,[.25,1.25,2.25]);await video(name,17,[.25,1.25,2.25],'never');
 }
 for(const name of ['original.mp4','repaired.mp4','damaged.mp4'])await video(name,13,[.125,.925,1.125,1.925,2.125,2.925,3.125,3.825,1.425,.225]);
 result.syncRepair={exactCheckedPictures:result.videos.filter(v=>['original.mp4','repaired.mp4'].includes(v.name)).every(v=>v.completed)&&JSON.stringify(result.videos.find(v=>v.name==='original.mp4')?.frames)===JSON.stringify(result.videos.find(v=>v.name==='repaired.mp4')?.frames)};
}finally{result.assets=[...server.assets.values()];const cdp=await browser.newBrowserCDPSession();result.processesBeforeClose=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;await browser.close();await server.close();await save();}
