// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const out='research/shared/runs/20260919T215000Z-progressive-live-reference';
const fixture='research/shared/runs/20260919T214800Z-progressive-fidelity';
const bytes=await readFile(fixture+'/source.mp4'), boxes=[];
for(let p=0;p<bytes.length;){const n=bytes.readUInt32BE(p);if(n<8||p+n>bytes.length)throw Error('box bounds');boxes.push({p,n,type:bytes.toString('ascii',p+4,p+8)});p+=n;}
const head=boxes.filter(x=>x.type==='moof')[1].p;
const result={scope:'Finite eight-second AVC/AAC native URL, four-second first fragment then remaining bytes after 3.5 seconds. Native full-response baseline, no MSE or library.',head,requests:[],cases:[]};
const server=http.createServer((req,res)=>{
 const row={path:req.url,started:Date.now(),range:req.headers.range};result.requests.push(row);
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Progressive source fidelity</title>');return;}
 if(req.url==='/favicon.ico'){res.writeHead(404).end();return;}if(req.url.startsWith('/truncated')&&req.headers.range!=='bytes=0-'){res.writeHead(410).end();row.rejectedResume=true;return;}
 res.setHeader('Content-Type','video/mp4');res.setHeader('Cache-Control','no-store');
 if(req.url.startsWith('/full')){res.setHeader('Content-Length',bytes.length);res.end(bytes);row.ended=Date.now();return;}
 res.setHeader('Content-Length',bytes.length);res.write(bytes.subarray(0,head));
 const timer=setTimeout(()=>{row.ended=Date.now();if(req.url.startsWith('/truncated'))res.destroy();else res.end(bytes.subarray(head));},3500);
 res.on('close',()=>{clearTimeout(timer);row.closed=Date.now();});
});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const oracle=JSON.parse(await readFile('research/shared/runs/20260919T214900Z-progressive-settled/full.json','utf8')); const references=oracle.presented.map(x=>x.hash); result.references=references;
 for(const mode of ['full','slow','truncated','cancel']){
  const r=await page.evaluate(async({mode,references})=>{
   const v=document.createElement('video');document.body.append(v);const ac=new AudioContext({sampleRate:48000});await ac.resume();
   const code=`class Capture extends AudioWorkletProcessor {process(input,output){const a=input[0]?.[0];if(a)this.port.postMessage({frame:currentFrame,a:[...a]});for(let c=0;c<output[0].length;c++)output[0][c].set(input[0]?.[c]??new Float32Array(128));return true;}}registerProcessor('capture',Capture);`;
   const module=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));await ac.audioWorklet.addModule(module);URL.revokeObjectURL(module);const source=ac.createMediaElementSource(v),capture=new AudioWorkletNode(ac,'capture'),gain=ac.createGain();gain.gain.value=0;source.connect(capture);capture.connect(gain).connect(ac.destination);const chunks=[];let recording=true;capture.port.onmessage=e=>{if(recording)chunks.push({...e.data,mediaTime:v.currentTime});};
   const row={mode,presented:[],pcmChunks:chunks,firstOutput:null},hashes=[];let active=true;const frame=(_,m)=>{if(!active)return;const c=new OffscreenCanvas(160,96),ctx=c.getContext('2d');ctx.drawImage(v,0,0);const x={time:m.mediaTime};row.firstOutput??=Date.now();row.presented.push(x);hashes.push(crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,160,96).data).then(h=>{x.hash=[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');const i=Math.round((m.mediaTime-.021333)*12);x.ordinal=i;x.match=x.hash===references[i];}));v.requestVideoFrameCallback(frame);};v.requestVideoFrameCallback(frame);
   let failed;v.onerror=()=>failed=v.error?.message;v.src='/'+mode+'?'+Date.now();v.play().catch(e=>failed=String(e));const deadline=performance.now()+13000;
   while(!v.ended&&!failed&&performance.now()<deadline){if(mode==='cancel'&&v.currentTime>.4){row.cancelTime=v.currentTime;v.pause();v.removeAttribute('src');v.load();row.cancelledAt=Date.now();await new Promise(r=>setTimeout(r,400));row.noFurtherSource=v.getAttribute('src')===null&&v.readyState===0;break;}await new Promise(r=>setTimeout(r,20));}
   active=false;recording=false;v.pause();await Promise.all(hashes);row.ended=v.ended;row.error=failed;row.duration=v.duration;row.position=v.currentTime;row.sampleRate=ac.sampleRate;
   if(mode==='full'||mode==='slow'){
    row.seek=[];for(const t of [.3,6.3,1.3]){const done=new Promise((r,j)=>{const timeout=setTimeout(()=>j(Error('seek')),5000);v.addEventListener('seeked',()=>{clearTimeout(timeout);r();},{once:true});});v.currentTime=t;await done;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=new OffscreenCanvas(160,96),ctx=c.getContext('2d');ctx.drawImage(v,0,0);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,160,96).data))].map(b=>b.toString(16).padStart(2,'0')).join('');row.seek.push({t,actualTime:v.currentTime,hash,match:hash===references[Math.floor((t-.021333)*12)]});}
   }
   v.pause();v.removeAttribute('src');v.load();v.remove();source.disconnect();capture.disconnect();gain.disconnect();await ac.close();row.cleanup=true;return row;
  },{mode,references});
  await writeFile(out+'/'+mode+'.json',JSON.stringify(r)+'\n');result.cases.push({...r,pcmChunks:undefined,presented:r.presented});await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
 }
}catch(e){result.error=String(e.stack);process.exitCode=1;}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,references:undefined,cases:result.cases.map(r=>({...r,presented:r.presented.length,wrong:r.presented.filter(x=>!x.match).length}))},null,2));}
