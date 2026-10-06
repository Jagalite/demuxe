// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {checkSequenceModel} from './sequence-model.mjs';
import {checkRuntimeBuffering} from '../buffering/runtime-policy-browser.mjs';

const family=process.env.BROWSER??'chromium';
if(!['chromium','chrome','firefox'].includes(family))throw Error('Unsupported browser family for sequence suite: '+family);
const directory=`results/api-stability/scenarios/${family}-${Date.now()}`;
await mkdir(directory,{recursive:true});
const report={family,passed:false,checks:[]};
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
let browser;
async function deadline(work,ms,label){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Deadline: ${label}`)),ms);})]);}finally{clearTimeout(timer);}}
async function check(name,operation,options={}) {
  const context=await browser.newContext();const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(String(error.stack)));
  try {
    await page.route('**/__api_stability__',route=>route.fulfill({contentType:'text/html',body:'<button id="activate">Activate</button><div id="host"></div>'}));
    await page.goto(report.origin+'/__api_stability__');await page.locator('#activate').click();
    const evidence=await deadline(page.evaluate(operation,options),options.timeoutMs??(process.env.API_EXTENDED==='1'?300000:90000),name);
    assert.deepEqual(errors,[]);report.checks.push({name,passed:true,evidence});
  }catch(error){report.checks.push({name,passed:false,error:String(error.stack),errors});process.exitCode=1;await page.screenshot({path:`${directory}/failure-${report.checks.length}.png`}).catch(()=>{});}
  finally{await deadline(context.close(),10000,'context cleanup');await writeFile(directory+'/result.json',JSON.stringify(report,null,2));}
}
try {
  report.origin=await deadline(new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});}),10000,'server startup');
  browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{}),args:family==='firefox'?[]:['--autoplay-policy=no-user-gesture-required'],firefoxUserPrefs:{'media.autoplay.default':0}});
  report.browser=browser.version();
  for(const mode of ['native','hybrid','software']) {
    await check(`${mode}: runtime buffering while paused and playing`,checkRuntimeBuffering,{mode});
    await check(`${mode}: rapid intent, borrowed binding, media element, seek and replacement`,async({mode})=>{
      const {Player}=await import('/web/generated/index.js');
      const {bindPlayer}=await import('/web/generated/integration/index.js');
      const {registerMediaElement}=await import('/web/generated/media-element/index.js');
      const assert=(value,label)=>{if(!value)throw Error(label);};
      const p=new Player(document.querySelector('#host'),{mode,preview:false}),binding=bindPlayer(p);
      registerMediaElement();const media=document.createElement('demuxe-media');document.body.append(media);media.bind(p);
      const states=[],events=[];const stop=p.subscribe(state=>states.push(state));
      for(const name of ['play','pause','seeking','seeked','error'])media.addEventListener(name,()=>events.push({name,intent:p.state.playbackIntent,source:p.state.sourceId}));
      try {
        const movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'movie.mp4');
        await p.open(movie);const original=p.state.sourceId;
        await Promise.all([binding.play(),binding.pause(),binding.play(),binding.pause()]);
        assert(p.state.playbackIntent==='pause'&&media.paused,'Rapid Pause lost');
        await binding.setVolume(.37);await binding.setMuted(true);await binding.setPlaybackRate(1.25);
        assert(media.volume===.37&&media.muted&&media.playbackRate===1.25,'Borrowed values drifted');
        const seeks=await Promise.allSettled([p.seek(1,{policy:'latest'}),p.seek(2,{policy:'latest'}),p.seek(3,{policy:'latest'})]);
        assert(seeks.at(-1).status==='fulfilled'&&Math.abs(p.state.currentTime-3)<.25,'Latest seek lost');
        assert(seeks.every(r=>r.status==='fulfilled'||r.reason.code==='ABORTED'),'Unexpected seek rejection');
        await p.open(movie,{startTime:1});assert(p.state.sourceId!==original,'Source identity reused');
        assert(p.state.volume===.37&&p.state.muted&&p.state.playbackRate===1.25,'Settings lost on replacement');
        assert(!p.state.pendingOperation&&!p.state.error,'Queue did not settle');
        assert(states.every(Object.isFrozen),'Mutable public snapshot');
        stop();const count=states.length;await media.dispose();await binding.dispose();media.remove();
        assert(!p.isDestroyed,'Borrowed teardown destroyed owner');await p.close();assert(states.length===count,'Retired subscription called');
        await p.open(movie);await p.play();await p.pause();
        return {states:count,events,seeks:seeks.map(r=>r.status),source:p.state.sourceId};
      }finally{stop();await media.dispose();await binding.dispose();await p.destroy();media.remove();}
    },{mode});
    await check(`${mode}: presented image changes after seek and close/reopen`,async({mode})=>{
      const {Player}=await import('/web/generated/index.js');
      const p=new Player(document.querySelector('#host'),{mode,preview:false});
      const pixels=async()=>{const shot=await p.snapshot({includeSubtitles:false});const image=await createImageBitmap(shot.blob);const canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,64,36);image.close();return ctx.getImageData(0,0,64,36).data;};
      const diff=(a,b)=>a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
      try{
        const movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'movie.mp4');
        await p.open(movie);await p.seek(1);const before=await pixels();await p.seek(4);const after=await pixels();
        const changed=diff(before,after);if(changed<2)throw Error('Output frozen or blank after seek: '+changed);
        await p.close();await p.open(movie);await p.seek(1);const reopened=await pixels(),restored=diff(before,reopened);
        if(restored>12)throw Error('Reopened output differs at same time: '+restored);
        return {meanPixelChange:changed,reopenedDifference:restored,scope:'Decoded video readback; not audio fidelity'};
      }finally{await p.destroy();}
    },{mode});
    await check(`${mode}: repeated lifecycle releases workers, URLs and subscriptions`,async({mode,cycles})=>{
      const {Player}=await import('/web/generated/index.js');
      const liveURLs=new Set(),workers=new Set(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),WorkerClass=window.Worker;
      URL.createObjectURL=value=>{const url=create(value);liveURLs.add(url);return url;};URL.revokeObjectURL=url=>{liveURLs.delete(url);revoke(url);};
      window.Worker=class extends WorkerClass{constructor(...args){super(...args);workers.add(this);}terminate(){workers.delete(this);return super.terminate();}};
      const movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'movie.mp4');const trace=[];
      for(let i=0;i<cycles;i++){
        const p=new Player(document.querySelector('#host'),{mode,preview:false});let observed=0;
        const stop=p.subscribe(()=>observed++);
        try{await p.open(movie);await Promise.all([p.play(),p.pause()]);await p.seek(i%3+1);await p.close();await p.open(movie);}
        finally{stop();const before=observed;await p.destroy();await p.destroy();if(before!==observed)throw Error('Retired observer called');}
        trace.push({cycle:i,urls:liveURLs.size,workers:workers.size,hosts:document.querySelector('#host').childElementCount});
        if(liveURLs.size||workers.size||document.querySelector('#host').childElementCount)throw Error('Leaked resources '+JSON.stringify(trace));
      }
      return trace;
    },{mode,cycles:process.env.API_EXTENDED==='1'?12:3});
  }
  await check('native: preview → seek → source replacement → unload',async()=>{
    const {Player}=await import('/web/generated/index.js');const p=new Player(document.querySelector('#host'),{mode:'native',preview:{strategy:{type:'on-demand'},debounceMs:0}});
    try{
      const movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'movie.mp4');await p.open(movie);await p.seek(1);
      const frame=await p.preview.getFrame({time:3,width:160});if(!frame?.image.blob?.size)throw Error('Missing preview image');
      if(Math.abs(p.state.currentTime-1)>.2||p.state.playbackIntent!=='pause')throw Error('Preview moved playback');
      await p.play();const pending=p.preview.getFrame({time:4,width:160}).catch(error=>{if(error.name!=='AbortError')throw error;return null;});
      await p.pause();await p.open(movie);await pending;
      p.preview.unload({start:0,end:12});if(p.preview.diagnostics.cacheEntries!==0)throw Error('Retired preview cache survived');
      const next=await p.preview.getFrame({time:2,width:160});if(!next?.image.blob?.size)throw Error('Preview failed after replacement');
      return {previewBytes:next.image.blob.size,state:p.state};
    }finally{await p.destroy();}
  });
  await check('attachments: select → remove other → mode switch → close → stale handle',async()=>{
    const {Player}=await import('/web/generated/index.js');const p=new Player(document.querySelector('#host'),{mode:'hybrid',preview:false});
    try{
      const movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'movie.mp4');await p.open(movie);
      const subtitle=name=>new File(['1\n00:00:00,000 --> 00:00:06,000\n'+name+'\n'],name+'.srt');
      const first=await p.attachSubtitle(subtitle('one')),second=await p.attachSubtitle(subtitle('two'));
      const selected=p.state.subtitleTracks.find(t=>t.selected)?.id;if(!selected)throw Error('No selected subtitle');
      await p.removeAttachment(first);await p.setMode('software');
      if(p.state.subtitleTracks.find(t=>t.selected)?.id!==selected)throw Error('Selection lost after removal/mode switch');
      await p.close();await p.open(movie);const code=await p.removeAttachment(second).then(()=>null,e=>e.code);
      if(code!=='INVALID_ARGUMENT'||p.state.subtitleTracks.length)throw Error('Old attachment survived source lifetime');
      return {selected,staleHandle:code};
    }finally{await p.destroy();}
  });
  for(const mode of ['auto','native','hybrid','software'])for(const offset of [0,7919]){
    const seed=(Number(process.env.API_SEED??24301)+offset)>>>0;
    await check(`${mode}: expected-state sequence model, seed ${seed}`,checkSequenceModel,
      {mode,seed,rounds:process.env.API_EXTENDED==='1'?10:3,timeoutMs:process.env.API_EXTENDED==='1'?600000:180000});
  }
  assert.equal(report.checks.length,22);assert.ok(report.checks.every(c=>c.passed));report.passed=true;
}finally{
  try{if(browser)await deadline(browser.close(),15000,'browser cleanup');}finally{server.kill();await writeFile(directory+'/result.json',JSON.stringify(report,null,2)+'\n');}
}
