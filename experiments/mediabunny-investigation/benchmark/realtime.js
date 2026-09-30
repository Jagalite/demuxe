// SPDX-License-Identifier: Apache-2.0
// Narrow A/V timing PoC for H.264/AAC only. It reuses Demuxe's presenter and PCM AudioWorklet.
import {Input,UrlSource,ALL_FORMATS,EncodedPacketSink} from './vendor/mediabunny.min.mjs';
import {WebCodecsPresenter} from '../../../web/video-presenter.js';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function startMediaBunnyPlayback(url,{workerPresenter=false}={}){
  const errors=[],started=performance.now();
  const input=new Input({source:new UrlSource(url),formats:ALL_FORMATS});
  const [videoTrack,audioTrack]=await Promise.all([input.getPrimaryVideoTrack(),input.getPrimaryAudioTrack()]);
  if(!videoTrack||!audioTrack||await videoTrack.getCodec()!=='avc'||await audioTrack.getCodec()!=='aac')throw Error('Real-time PoC admits H.264/AAC only');
  const [videoConfig,audioConfig]=await Promise.all([videoTrack.getDecoderConfig(),audioTrack.getDecoderConfig()]);
  if(!(await VideoDecoder.isConfigSupported(videoConfig)).supported||!(await AudioDecoder.isConfigSupported(audioConfig)).supported)throw Error('Browser decoder configuration rejected');
  const canvas=document.querySelector('#screen');canvas.width=960;canvas.height=540;
  let presenter,drawWorker;
  if(workerPresenter){
    drawWorker=new Worker(new URL('./presenter-worker.js',import.meta.url),{type:'module'});
    const offscreen=canvas.transferControlToOffscreen();
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Presenter worker startup timeout')),5000);drawWorker.onmessage=({data})=>{if(data.ready){clearTimeout(timer);resolve();}};drawWorker.postMessage({canvas:offscreen},[offscreen]);});
  }else presenter=new WebCodecsPresenter(canvas,canvas.getContext('2d',{alpha:false}));
  const context=new AudioContext({sampleRate:audioConfig.sampleRate});
  if(context.sampleRate!==audioConfig.sampleRate)throw Error('AudioContext rate differs from source');
  await context.audioWorklet.addModule('/web/audio-worklet.js');
  const capacity=8192,audioBuffer=new SharedArrayBuffer(64+capacity*2*4);
  const header=new Int32Array(audioBuffer,0,16),pcm=new Float32Array(audioBuffer,64);
  const node=new AudioWorkletNode(context,'demuxe-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',processorOptions:{buffer:audioBuffer,capacity,channels:2}});
  node.connect(context.destination);await context.resume();
  const videoSink=new EncodedPacketSink(videoTrack),audioSink=new EncodedPacketSink(audioTrack);
  let firstVideo=await videoSink.getFirstPacket(),firstAudio=await audioSink.getFirstPacket();
  let videoPacket=firstVideo,audioPacket=firstAudio,stop=false,running=false,endedVideo=false,endedAudio=false;
  let videoSubmitted=0,audioSubmitted=0,videoDecoded=0,audioDecoded=0,presented=0,dropped=0;
  let firstPresentedAt=null,lastFrameTimestamp=null,maxAbsDriftMs=0,lateMs=[];
  let drawSubmit=0;
  if(drawWorker)drawWorker.onmessage=({data})=>{if(data.drawn){presented++;firstPresentedAt??=performance.now()-started;}else if(data.error)errors.push(data.error);};
  const frames=[],blocks=[];
  const audioDecoder=new AudioDecoder({error:e=>errors.push(String(e)),output:data=>{
    try{
      const n=data.numberOfFrames,channels=data.numberOfChannels;
      if(channels<1||channels>2)throw Error('PoC admits mono/stereo audio only');
      const planes=[];for(let c=0;c<channels;c++){const plane=new Float32Array(n);data.copyTo(plane,{planeIndex:c,format:'f32-planar'});planes.push(plane);}
      blocks.push({planes,n,offset:0});audioDecoded++;
    }catch(e){errors.push(String(e));}finally{data.close();}
  }});
  const videoDecoder=new VideoDecoder({error:e=>errors.push(String(e)),output:frame=>{
    if(stop){frame.close();return;}
    frames.push(frame);frames.sort((a,b)=>a.timestamp-b.timestamp);videoDecoded++;
    while(frames.length>100){frames.shift().close();dropped++;}
  }});
  audioDecoder.configure(audioConfig);videoDecoder.configure(videoConfig);
  const clock=()=>Atomics.load(header,1)/context.sampleRate;
  function pumpAudio(){
    if(stop)return;
    let read=Atomics.load(header,1)>>>0,write=Atomics.load(header,0)>>>0;
    while(blocks.length&&write-read<capacity-1){const block=blocks[0],available=Math.min(block.n-block.offset,capacity-(write-read)-1);
      for(let i=0;i<available;i++){const at=((write+i)%capacity)*2;pcm[at]=block.planes[0][block.offset+i];pcm[at+1]=(block.planes[1]??block.planes[0])[block.offset+i];}
      write+=available;block.offset+=available;if(block.offset===block.n)blocks.shift();
      Atomics.store(header,0,write|0);read=Atomics.load(header,1)>>>0;
    }
    if(!running&&write-read>=4096&&frames.length){running=true;Atomics.store(header,2,1);}
  }
  const audioTimer=setInterval(pumpAudio,5);
  const feedVideo=(async()=>{try{while(!stop&&videoPacket){
    if(videoDecoder.decodeQueueSize>=8||frames.length>70||running&&videoPacket.timestamp>clock()+2){await sleep(4);continue;}
    const packet=videoPacket;videoPacket=await videoSink.getNextPacket(packet);videoDecoder.decode(packet.toEncodedVideoChunk());videoSubmitted++;
  }endedVideo=true;}catch(e){errors.push(String(e));}})();
  const feedAudio=(async()=>{try{while(!stop&&audioPacket){
    if(audioDecoder.decodeQueueSize>=8||blocks.length>40||running&&audioPacket.timestamp>clock()+.7){await sleep(4);continue;}
    const packet=audioPacket;audioPacket=await audioSink.getNextPacket(packet);audioDecoder.decode(packet.toEncodedAudioChunk());audioSubmitted++;
  }endedAudio=true;}catch(e){errors.push(String(e));}})();
  let animation;
  function draw(){
    if(stop)return;
    if(running){const due=clock();let latest=null;
      while(frames.length&&frames[0].timestamp/1e6<=due+.015){if(latest){latest.close();dropped++;}latest=frames.shift();}
      if(latest){try{lastFrameTimestamp=latest.timestamp/1e6;if(drawWorker){drawWorker.postMessage({frame:latest},[latest]);drawSubmit++;}else{presenter.draw(latest);presented++;firstPresentedAt??=performance.now()-started;}
        const drift=(lastFrameTimestamp-due)*1000;maxAbsDriftMs=Math.max(maxAbsDriftMs,Math.abs(drift));lateMs.push(drift);if(lateMs.length>300)lateMs.shift();}
        catch(e){errors.push(String(e));try{latest.close();}catch{}}finally{if(!drawWorker)latest.close();}}
    }
    animation=requestAnimationFrame(draw);
  }
  animation=requestAnimationFrame(draw);
  const api={
    stats:()=>({elapsedMs:performance.now()-started,running,clock:clock(),videoSubmitted,audioSubmitted,videoDecoded,audioDecoded,presented,drawSubmit,dropped,queuedFrames:frames.length,queuedAudioBlocks:blocks.length,audioReadFrames:Atomics.load(header,1)>>>0,audioWriteFrames:Atomics.load(header,0)>>>0,audioUnderruns:Atomics.load(header,6),lastFrameTimestamp,maxAbsDriftMs,lateMs:lateMs.slice(),firstPresentedAt,endedVideo,endedAudio,errors:errors.slice()}),
    stop:async()=>{stop=true;clearInterval(audioTimer);cancelAnimationFrame(animation);Atomics.store(header,2,0);node.port.postMessage('close');node.disconnect();await Promise.allSettled([feedVideo,feedAudio]);for(const frame of frames)frame.close();videoDecoder.close();audioDecoder.close();await context.close();input.dispose();presenter?.destroy();drawWorker?.postMessage({close:true});drawWorker?.terminate();}
  };
  return api;
}
globalThis.startMediaBunnyPlayback=startMediaBunnyPlayback;
