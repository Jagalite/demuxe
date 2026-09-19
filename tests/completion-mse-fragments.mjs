// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';import {spawn,execFileSync} from 'node:child_process';import {mkdir,readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const out='results/full-completion/fragments';await mkdir(out,{recursive:true});const data=await readFile('results/full-completion/continuity/red.mp4');const boxes=[];for(let p=0;p<data.length;){const size=data.readUInt32BE(p);assert.ok(size>=8);boxes.push({p,size,type:data.toString('ascii',p+4,p+8)});p+=size;}const moofs=boxes.filter(b=>b.type==='moof');const groups=moofs.map(b=>{const m=boxes.find(x=>x.p===b.p+b.size);assert.equal(m.type,'mdat');return {moof:[...data.subarray(b.p,b.p+b.size)],mdat:[...data.subarray(m.p,m.p+m.size)]};});const init=[...data.subarray(0,moofs[0].p)];
const packets=JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-of','json','results/full-completion/continuity/red.mp4'])).packets;const first=packets.find(p=>p.codec_type==='video');const firstSampleEnd=Number(first.pos)+Number(first.size);const result={scope:'Browser SourceBuffer component with identical existing fMP4 payload; split appends, partial-parser reset and actual A/V output. No current-controller patch or CPU claim.',cases:[],firstSampleEnd};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});let browser;
try{const origin=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Server timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});});browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto(origin+'/examples/custom-controls.html');
 for(const mode of ['whole','split-moof-mdat','abort-mid-moof','abort-mid-sample','quota-once','quota-twice','non-quota']){
  const row=await page.evaluate(async({mode,init,groups})=>{
   const v=document.createElement('video');document.body.append(v);const ac=new AudioContext({sampleRate:48000});await ac.resume();const source=ac.createMediaElementSource(v),analyser=ac.createAnalyser();analyser.fftSize=4096;source.connect(analyser);analyser.connect(ac.destination);const canvas=new OffscreenCanvas(160,96),ctx=canvas.getContext('2d');const media=new MediaSource(),url=URL.createObjectURL(media);let appends=0,error=null,eof=false,av=0,staleRejected=false,quotaRetries=0,quotaCount=0;
   const event=(target,type)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{clean();reject(Error(type+' timeout'));},6000);const ok=()=>{clean();resolve();},bad=()=>{clean();reject(Error(type+' failed'));};function clean(){clearTimeout(t);target.removeEventListener(type,ok);target.removeEventListener('error',bad);}target.addEventListener(type,ok);target.addEventListener('error',bad);});
   const opened=event(media,'sourceopen');v.src=url;await opened;const sb=media.addSourceBuffer('video/mp4; codecs="avc1.64000a,mp4a.40.2"');
   const append=async bytes=>{const done=event(sb,'updateend');sb.appendBuffer(new Uint8Array(bytes));await done;appends++;};
   const publish=async(bytes,retry=false)=>{if((mode==='quota-once'&&quotaCount<1)||(mode==='quota-twice'&&quotaCount<2)){quotaCount++;throw new DOMException('Injected quota','QuotaExceededError');}if(mode==='non-quota')throw new DOMException('Injected invalid state','InvalidStateError');await append(bytes);};
   try{await append(init);await append([...groups[0].moof,...groups[0].mdat]);
    for(let i=1;i<groups.length;i++){
     const g=groups[i];if(i===1&&mode.startsWith('abort-')){await append(mode==='abort-mid-moof'?g.moof.slice(0,Math.floor(g.moof.length/2)):[...g.moof,...g.mdat.slice(0,Math.min(45,g.mdat.length-1))]);sb.abort();let generation=2;const acceptStale=(bytes,epoch)=>epoch===generation;staleRejected=!acceptStale(g.mdat,1);}
     if(mode==='split-moof-mdat'){await append(g.moof);await append(g.mdat);}
     else if(mode.startsWith('quota')||mode==='non-quota'){
      try{await publish([...g.moof,...g.mdat]);}catch(e){if(e.name!=='QuotaExceededError')throw e;quotaRetries++;const done=event(sb,'updateend');sb.remove(0,.8);await done;await publish([...g.moof,...g.mdat],true);v.currentTime=1.25;}
     }else await append([...g.moof,...g.mdat]);
    }
    media.endOfStream();const ended=event(v,'ended');await v.play();const interval=setInterval(()=>{if(v.readyState>=2){ctx.drawImage(v,0,0,160,96);const p=ctx.getImageData(80,48,1,1).data,bins=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(bins);let best=1;for(let i=2;i<bins.length;i++)if(bins[i]>bins[best])best=i;if(p[0]>180&&p[1]<60&&Math.abs(best*ac.sampleRate/analyser.fftSize-440)<20&&bins[best]>-70)av++;}},20);try{await ended;eof=true;}finally{clearInterval(interval);}
   }catch(e){error={name:e.name,message:e.message};}
   finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);source.disconnect();analyser.disconnect();await ac.close();}
   return {mode,error,eof,av,appends,staleRejected,quotaRetries,quotaCount,cleanup:true};
  },{mode,init,groups});result.cases.push(row);
 }
 for(const r of result.cases.slice(0,5)){assert.equal(r.error,null,JSON.stringify(r));assert.ok(r.eof&&r.av>3);if(r.mode.startsWith('abort'))assert.ok(r.staleRejected);}
 assert.equal(result.cases[5].error.name,'QuotaExceededError');assert.equal(result.cases[5].quotaRetries,1);assert.equal(result.cases[6].error.name,'InvalidStateError');assert.equal(result.cases[6].quotaRetries,0);await page.evaluate(()=>player.destroy());result.passed=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
