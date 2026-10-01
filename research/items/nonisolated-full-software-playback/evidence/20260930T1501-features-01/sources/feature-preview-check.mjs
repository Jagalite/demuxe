// SPDX-License-Identifier: MIT
import {PrivateSoftwarePlayer} from '/web/generated/internal/private-software-player.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ass=`[Script Info]
ScriptType: v4.00+
PlayResX: 320
PlayResY: 180
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,20,&H000000FF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:02.00,Default,,0,0,0,,{\\an7\\pos(0,0)\\p1}m 30 30 l 130 30 130 80 30 80{\\p0}
`;
function worklet(backend,type){return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{backend.node.port.removeEventListener('message',listener);reject(Error('Worklet inspection deadline'));},3000);function listener({data}){if(data.id===id){clearTimeout(timer);backend.node.port.removeEventListener('message',listener);resolve(data);}}backend.node.port.addEventListener('message',listener);backend.node.port.postMessage({type,id});});}
function red(image){let n=0;for(let y=31;y<79;y++)for(let x=31;x<129;x++){const i=(y*320+x)*4;if(image[i]>230&&image[i+1]<30&&image[i+2]<30)n++;}return n;}
window.featureCheck=async(runtime='jspi',mode='software')=>{
 const key='h264-ac3',profile=(await(await fetch('/profiles')).json()).find(p=>p.key===key);
 const result={key,runtime,mode,scope:'Direct maintained Backend feature and continuous output qualification',isolated:crossOriginIsolated,userAgent:navigator.userAgent,passed:false};
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;document.querySelector('main').replaceChildren(canvas);
 const backend=new PrivateSoftwarePlayer(canvas,{runtime,mode,assetBase:new URL('/',location.href),duration:profile.duration});window.backend=backend;
 const pixels=()=>canvas.getContext('2d').getImageData(0,0,320,180).data;
 try{
  const file=new File([await(await fetch('/fixture/'+key)).blob()],key);await backend.open(file);
  const bytes=new TextEncoder().encode(ass).buffer;await backend.addSubtitle({attachmentId:'rectangle',format:'ass',label:'Rectangle oracle',bytes,select:true});
  await backend.seek(1);result.cue=red(pixels());
  await backend.subtitleVisible(false);await sleep(200);result.hidden=red(pixels());
  await backend.subtitleVisible(true);await sleep(200);result.shown=red(pixels());
  await backend.command('set','sub-delay','1');await backend.seek(1);result.delayed=red(pixels());
  await backend.seek(2);result.shiftedCue=red(pixels());
  await backend.command('set','sub-delay','0');await backend.seek(2.5);result.cleared=red(pixels());
  if(result.cue<4500||result.shown<4500||result.shiftedCue<4500||result.hidden>3500||result.delayed>3500||result.cleared>3500)throw Error('Subtitle cue/visibility/delay/clear mismatch');
  await backend.open(file);await backend.seek(1);result.replacementClear=red(pixels());if(result.replacementClear>3500)throw Error('Subtitle survived source replacement');
  const snapshot=await backend.previewSnapshot();const image=await createImageBitmap(snapshot.blob);result.snapshot={width:image.width,height:image.height,time:snapshot.time};image.close();if(snapshot.time<.9||snapshot.width!==320||snapshot.height!==180)throw Error('Snapshot mismatch');
  if(mode==='software'){
   const before=new Uint8ClampedArray(pixels());await backend.command('set','vf','hflip');await backend.seek(1);const after=pixels();let error=0;for(let y=0;y<180;y++)for(let x=0;x<320;x++)for(let c=0;c<3;c++)error+=Math.abs(after[(y*320+x)*4+c]-before[(y*320+319-x)*4+c]);result.hflipMAE=error/(320*180*3);if(result.hflipMAE>5)throw Error('Software hflip mismatch');await backend.command('set','vf','');
  }
  await backend.seek(0);await worklet(backend,'record');const start=performance.now(),draws=backend.diagnostics.rendered;await backend.play();
  const samples=[];while(performance.now()-start<8500&&!backend.properties.get('eof-reached')){await sleep(100);samples.push({wallMs:performance.now()-start,position:backend.properties.get('time-pos'),rendered:backend.diagnostics.rendered});}
  await backend.pause();const capture=await worklet(backend,'inspect'),pcm=new Float32Array(capture.pcm);result.continuous={samples,frames:pcm.length/2,rms:Math.sqrt(pcm.reduce((sum,x)=>sum+x*x,0)/pcm.length),underruns:capture.underruns,underrunEvents:capture.underrunEvents,rendered:backend.diagnostics.rendered-draws,eof:backend.properties.get('eof-reached'),elapsedMs:performance.now()-start,diagnostics:backend.diagnostics};
  if(!result.continuous.eof||result.continuous.frames<270000||result.continuous.rms<.01||result.continuous.rendered<150||result.continuous.elapsedMs>7500)throw Error('Continuous output/EOF/cadence mismatch');
  await backend.seek(.5);await backend.play();await sleep(400);await backend.pause();result.replay=backend.properties.get('time-pos');if(result.replay<.75)throw Error('EOF replay did not advance');
  await backend.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24||backend.audioDiagnostics().state!=='closed')throw Error('Feature cleanup mismatch');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=backend.diagnostics;await backend.destroy().catch(e=>{result.cleanupError=String(e);});}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
