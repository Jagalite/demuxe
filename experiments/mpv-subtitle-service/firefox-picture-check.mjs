// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {serve} from '../pipeline-qualification/server.mjs';
import {videoCodecConfig} from '../../web/video-codec-config.js';
const out=`results/mpv-subtitle-service/firefox-picture-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});
const source=process.env.SOURCE??'build/mpv-subtitle-service/fixtures/firefox-control-709.mp4';
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=extradata,width,height','-show_data','-of','json',source])).streams[0];
const description=Buffer.from(probe.extradata.split('\n').filter(line=>line.includes(':')).map(line=>line.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex');
const decoderConfiguration=videoCodecConfig({kind:2,description,width:probe.width,height:probe.height}).configuration;
const serialConfiguration={...decoderConfiguration,description:Array.from(decoderConfiguration.description)};
const server=await serve({mediaPaths:{synthetic:source}}),url=server.origin+'/experiment/page.html';
const expression=`(async()=>{
 const target=${Number(process.env.SEEK_TIME??2)},remux=${!!process.env.REMUX};const config=${JSON.stringify(serialConfiguration)};config.description=new Uint8Array(config.description);let webCodecs;try{webCodecs=typeof VideoDecoder==='undefined'?{available:false}:{available:true,supported:(await VideoDecoder.isConfigSupported(config)).supported,codec:config.codec};}catch(e){webCodecs={error:String(e)};}document.body.replaceChildren();const v=document.createElement('video');v.width=1280;v.height=720;document.body.append(v);v.muted=true;let player;
 if(remux){const {NativePlayer}=await import('/web/generated/internal/native-player.js');player=new NativePlayer(v,'always',new URL('/',location.href),true);await player.ready;await player.openRemote({url:location.origin+'/media/synthetic'});}else await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error(v.error?.message));v.src='/media/synthetic';});
 const frame=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Frame deadline')),10000);const next=(_,m)=>{if(m.mediaTime>target+(remux?1:0)-.1){clearTimeout(timeout);resolve(m.mediaTime);}else v.requestVideoFrameCallback(next);};v.requestVideoFrameCallback(next);if(player)player.seek(target).catch(reject);else v.currentTime=target;});await new Promise(r=>setTimeout(r,100));const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d').drawImage(v,0,0);
 const result={webCodecs,ua:navigator.userAgent,width:v.videoWidth,height:v.videoHeight,time:v.currentTime,frame,referenceTime:frame-(remux?1:0),remux,png:c.toDataURL().split(',')[1]};const before=v.currentTime,frames=v.getVideoPlaybackQuality().totalVideoFrames;await v.play();await new Promise(r=>setTimeout(r,3000));result.progress=v.currentTime-before;result.frames=v.getVideoPlaybackQuality().totalVideoFrames-frames;v.pause();result.seeks=[];for(const nextTarget of ${JSON.stringify((process.env.MORE_SEEKS??'').split(',').filter(Boolean).map(Number))}){const nextFrame=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Extra seek frame deadline')),10000);const next=(_,m)=>{if(Math.abs(m.mediaTime-nextTarget-(remux?1:0))<.06){clearTimeout(timer);resolve(m.mediaTime);}else v.requestVideoFrameCallback(next);};v.requestVideoFrameCallback(next);if(player)player.seek(nextTarget).catch(reject);else v.currentTime=nextTarget;});result.seeks.push({target:nextTarget,time:v.currentTime,frame:nextFrame});}if(player){result.diagnostics=player.diagnostics;await player.destroy();}return JSON.stringify(result);
})()`;
const result={source,hevcPreferenceOverride:process.env.HEVC_PREF==='1',decoderConfiguration:serialConfiguration,remux:!!process.env.REMUX,seekTime:Number(process.env.SEEK_TIME??2),trials:[]};
try{
 for(const family of (process.env.BROWSERS?.split(',')??['chrome','bundled-firefox','installed-firefox'])){
  const trial={family};result.trials.push(trial);let browser,child,socket;
  try{
   let captured;
   if(family!=='installed-firefox'){
    browser=await(family==='chrome'?chromium:firefox).launch({headless:false,...(family==='chrome'?{channel:'chrome'}:{})});trial.version=browser.version();const page=await browser.newPage();page.setDefaultTimeout(20000);await page.goto(url);captured=JSON.parse(await page.evaluate(expression));
   }else{
    const profile=await mkdtemp(tmpdir()+'/demuxe-firefox-picture-');trial.profile=profile;if(process.env.HEVC_PREF==='1')await writeFile(profile+'/user.js','user_pref("dom.media.webcodecs.h265.enabled", true);\n');
    child=spawn('/Applications/Firefox.app/Contents/MacOS/firefox',['--no-remote','--profile',profile,'--remote-debugging-port','0','about:blank'],{stdio:['ignore','pipe','pipe']});
    const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('BiDi startup timeout')),20000);let log='';const read=b=>{log+=b;const m=log.match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}};child.stdout.on('data',read);child.stderr.on('data',read);child.on('error',reject);});
    socket=new WebSocket(endpoint.endsWith('/session')?endpoint:endpoint+'/session');await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let serial=0;const pending=new Map();socket.onmessage=({data})=>{const r=JSON.parse(data),p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.type==='error'?p.reject(Error(JSON.stringify(r))):p.resolve(r.result);}};
    const call=(method,params)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},25000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
    trial.session=await call('session.new',{capabilities:{alwaysMatch:{}}});const {context}=await call('browsingContext.create',{type:'tab'});await call('browsingContext.navigate',{context,url,wait:'complete'});const r=await call('script.evaluate',{expression,target:{context},awaitPromise:true});if(r.type!=='success')throw Error(JSON.stringify(r));captured=JSON.parse(r.result.value);await call('session.end',{});
   }
   const {png,...metadata}=captured;trial.metadata=metadata;const encoded=Buffer.from(png,'base64');if(!process.env.NO_IMAGES)await writeFile(`${out}/${family}.png`,encoded);
   const reference=execFileSync('ffmpeg',['-v','error','-ss',String(Math.max(0,captured.referenceTime-.06)),'-i',source,'-frames:v','4','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:16*1024*1024});const pixels=execFileSync('ffmpeg',['-v','error','-i','pipe:0','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-'],{input:encoded,maxBuffer:16*1024*1024});if(reference.length%pixels.length)throw Error('Dimensions differ');const errors=[];for(let start=0;start<reference.length;start+=pixels.length){let error=0;for(let i=0;i<pixels.length;i++)error+=Math.abs(reference[start+i]-pixels[i]);errors.push(error/pixels.length);}trial.referenceErrors=errors;trial.meanAbsoluteRGBError=Math.min(...errors);trial.passed=trial.meanAbsoluteRGBError<5&&trial.metadata.progress>2.5&&trial.metadata.frames>=60;
  }catch(e){trial.error=String(e.stack);}finally{socket?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(resolve,5000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}await browser?.close();await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(family,JSON.stringify({version:trial.version??trial.session?.capabilities.browserVersion,error:trial.error,meanAbsoluteRGBError:trial.meanAbsoluteRGBError,passed:trial.passed,progress:trial.metadata?.progress,frames:trial.metadata?.frames,webCodecs:trial.metadata?.webCodecs}));}
 }
}finally{await server.close();console.log(out);}
