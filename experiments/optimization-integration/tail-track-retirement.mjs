// Bounded browser contract probe: retirement of a genuinely completed track.
// Inputs are offline fixtures, not a playback-time transcoding implementation.
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
const family=process.env.BROWSER||'chrome',windows=process.env.WINDOWS==='1';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{server.on('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)resolve(m[0]);});});
const browser=await (family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
const result={family,windows,browser:browser.version(),cases:[]};
try{
 for(const kind of ['audio-tail','video-tail']){
  const page=await browser.newPage();
  for(const track of ['v','a'])await page.route('**/tail-probe/'+kind+'-'+track+'.mp4',async route=>route.fulfill({contentType:'video/mp4',body:await readFile('build/tail-track-check/'+kind+'-'+track+(windows?'-full':'')+'.mp4')}));
  await page.goto(origin+'/examples/custom-controls.html');
  const item=await page.evaluate(async({kind,windows})=>{
   await player.destroy();const v=document.createElement('video');v.controls=true;document.body.append(v);
   const media=new MediaSource();v.src=URL.createObjectURL(media);await new Promise(r=>media.addEventListener('sourceopen',r,{once:true}));media.duration=30;
   const sources={};const events=[];for(const name of ['waiting','playing','ended','error'])v.addEventListener(name,()=>events.push({name,time:v.currentTime,error:v.error?.message}));
   for(const track of ['v','a'])sources[track]=media.addSourceBuffer(track==='v'?'video/mp4; codecs="avc1.64000b"':'audio/mp4; codecs="flac"');
   const remaining={};
   const append=(s,bytes)=>new Promise((resolve,reject)=>{s.addEventListener('updateend',resolve,{once:true});s.addEventListener('error',()=>reject(Error('append')), {once:true});s.appendBuffer(bytes);});
   for(const track of ['v','a']){
    const s=sources[track];
    const response=await fetch('/tail-probe/'+kind+'-'+track+'.mp4');if(!response.ok)throw Error('fixture fetch '+response.status);const bytes=await response.arrayBuffer();if(!bytes.byteLength)throw Error('empty fixture');
    if(windows){
     const view=new DataView(bytes);let at=0,count=0,cut=bytes.byteLength;
     while(at<bytes.byteLength){const size=view.getUint32(at),type=String.fromCharCode(...new Uint8Array(bytes,at+4,4));if(size<8)throw Error('Invalid fixture box');if(type==='moof'&&count++===10){cut=at;break;}at+=size;}
     remaining[track]=bytes.slice(cut);await append(s,bytes.slice(0,cut));
    }else await append(s,bytes);
   }
   if(windows)media.endOfStream();
   const snapshot=()=>{const c=document.createElement('canvas');c.width=160;c.height=90;c.getContext('2d').drawImage(v,0,0,160,90);return {time:v.currentTime,width:v.videoWidth,ready:v.readyState,image:c.toDataURL(),sources:Array.from(media.sourceBuffers,s=>({ranges:Array.from({length:s.buffered.length},(_,i)=>[s.buffered.start(i),s.buffered.end(i)])})),active:media.activeSourceBuffers.length,ranges:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),media:media.readyState};};
   v.currentTime=v.buffered.length?v.buffered.start(0):0;
   const playing=v.play();await Promise.race([playing,new Promise(r=>setTimeout(r,2000))]);await new Promise(r=>setTimeout(r,1400));const before=snapshot();
   if(windows){for(const track of ['v','a'])if(remaining[track].byteLength)await append(sources[track],remaining[track]);media.endOfStream();}
   else media.removeSourceBuffer(sources[kind==='audio-tail'?'v':'a']);
   await new Promise(r=>setTimeout(r,1800));const after=snapshot();
   v.currentTime=v.currentTime;await new Promise(r=>setTimeout(r,1000));const afterSeek=snapshot();
   const url=v.src;v.pause();v.removeAttribute('src');v.load();URL.revokeObjectURL(url);v.remove();playing.catch(()=>{});return {kind,before,after,afterSeek,events};
  },{kind,windows}).catch(error=>({kind,error:String(error)}));
  result.cases.push(item);console.log(kind,item.error||{before:item.before.time,after:item.after.time,width:item.after.width,samePixels:item.before.image===item.after.image});await page.close();
 }
}finally{await browser.close();server.kill();await writeFile('results/optimization-final/tail-'+(windows?'windows':'track-retirement')+'-'+family+'.json',JSON.stringify(result,null,2)+'\n');}
