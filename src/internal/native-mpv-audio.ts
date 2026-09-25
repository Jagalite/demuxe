// SPDX-License-Identifier: Apache-2.0
import {WasmPlayer} from './wasm-player.js';
import {PlayerError} from './errors.js';

type Timeline={kind:string;wallTime:number|null;mediaTime:number;rate:number;generation:number;epoch:number;audioFrame:number};
type PendingRate={rate:number;generation:number;resolve:()=>void;reject:(error:Error)=>void;timer?:ReturnType<typeof setTimeout>;deadline:ReturnType<typeof setTimeout>};
const wait=async(predicate:()=>boolean|Promise<boolean>,timeout=5000,signal?:AbortSignal)=>{
  const end=performance.now()+timeout;
  while(performance.now()<end){signal?.throwIfAborted();if(await predicate()){signal?.throwIfAborted();return;}await new Promise(resolve=>setTimeout(resolve,20));}
  throw Error('Selective audio convergence timed out');
};

/** Browser presentation clock with isolated mpv demux/decode and timestamped PCM. */
export class NativeMpvAudio extends EventTarget {
  readonly engine:WasmPlayer;
  private readonly hidden:HTMLCanvasElement;
  private header!:Int32Array;
  private context!:AudioContext;
  private gain!:GainNode;
  private points:Timeline[]=[];
  private firstPoint?:{generation:number;resolve:(point:Timeline)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  private pendingRate?:PendingRate;
  private running=false;
  private stopped=false;
  private generation=0;
  private requestedRate=1;
  private effectiveRate=1;
  private resumeRate?:number;
  private driftTimer?:ReturnType<typeof setInterval>;
  private sustained=0;
  private release=0;
  private soft=false;
  private softCount=0;
  private missingTimeline=0;
  private largeError=0;
  private failedOnce=false;
  private hardCount=0;
  private rateCount=0;
  private errors:number[]=[];
  private maxAbsError=0;
  private drain?:Promise<void>;
  private frameCallback?:number;
  get selectedTrackId(){return (this.engine.properties.get('track-list') as Array<{id:string;type:string;selected?:boolean}>|undefined)?.find(t=>t.type==='audio'&&t.selected)?.id;}
  get selectedStreamIndex(){return (this.engine.properties.get('track-list') as Array<{type:string;selected?:boolean;'ff-index'?:number}>|undefined)?.find(t=>t.type==='audio'&&t.selected)?.['ff-index'];}
  private readonly ended=()=>{void this.finishEOF().catch(error=>this.fail(error));};
  constructor(private video:HTMLVideoElement,private time:()=>number,private assetBase:URL,private failed:(error:Error)=>void){
    super();
    this.hidden=video.ownerDocument.createElement('canvas');this.hidden.width=1;this.hidden.height=1;this.hidden.hidden=true;
    video.ownerDocument.body.append(this.hidden);
    this.engine=new WasmPlayer(this.hidden,{assetBase,mode:'selective-audio',audioOutput:'stereo'});
    this.engine.addEventListener('output',event=>this.onOutput((event as CustomEvent<Timeline>).detail));
    this.engine.addEventListener('error',event=>this.fail(new Error(String((event as CustomEvent).detail))));
    video.addEventListener('ended',this.ended);
    const frame=(_:number,metadata:VideoFrameCallbackMetadata)=>{
      if(this.stopped)return;
      if(this.header&&this.running&&Number.isFinite(video.duration)&&metadata.mediaTime>=video.duration-.2)this.set(7,1);
      this.frameCallback=video.requestVideoFrameCallback(frame);
    };
    this.frameCallback=video.requestVideoFrameCallback(frame);
  }
  private fail(error:unknown){if(!this.stopped&&!this.failedOnce){this.failedOnce=true;this.failed(error instanceof PlayerError?error:new PlayerError('DECODE_FAILED','Selective audio service failed: '+String(error)));}}
  private h(index:number){return Atomics.load(this.header,index);}
  private set(index:number,value:number){Atomics.store(this.header,index,value);}
  private cancelRate(reason:string){
    const pending=this.pendingRate;if(!pending)return;this.pendingRate=undefined;
    clearTimeout(pending.timer);clearTimeout(pending.deadline);pending.reject(new DOMException(reason,'AbortError'));
  }
  private onOutput(point:Timeline){
    if(point.kind!=='timeline'&&point.kind!=='rate-boundary'||point.wallTime===null||point.generation!==this.generation)return;
    this.points.push(point);if(this.points.length>300)this.points.shift();
    if(point.kind==='timeline'&&this.firstPoint?.generation===this.generation){const waiter=this.firstPoint;this.firstPoint=undefined;clearTimeout(waiter.timer);waiter.resolve(point);}
    const pending=this.pendingRate;
    if(point.kind==='rate-boundary'&&pending&&!pending.timer&&pending.generation===this.generation&&Math.abs(point.rate-pending.rate)<1e-5){
      const due=point.wallTime!-performance.timeOrigin;
      pending.timer=setTimeout(()=>{
        if(this.pendingRate!==pending||this.stopped)return;
        this.pendingRate=undefined;clearTimeout(pending.deadline);
        this.video.defaultPlaybackRate=pending.rate;this.video.playbackRate=pending.rate;this.effectiveRate=pending.rate;this.rateCount++;
        pending.resolve();
      },Math.max(0,due-performance.now()));
    }
  }
  estimatedAudioPresentationTime(at=performance.now()):number|null {
    let latest:Timeline|undefined;
    for(const point of this.points)if(point.generation===this.generation&&point.wallTime!==null&&point.wallTime-performance.timeOrigin<=at&&(!latest||point.wallTime>latest.wallTime!))latest=point;
    if(!latest)return null;
    const age=at-(latest.wallTime!-performance.timeOrigin);
    if(age>250)return null;
    return latest.mediaTime+(this.running?age*latest.rate/1000:0);
  }
  private observe(){
    if(!this.running||this.pendingRate||this.video.seeking||this.video.ended)return;
    const position=this.estimatedAudioPresentationTime();
    if(position===null){if(++this.missingTimeline>=8)this.fail(new PlayerError('DECODE_FAILED','Selective audio timeline stopped during playback'));return;}
    this.missingTimeline=0;
    const error=(position-this.time())*1000;
    if(Math.abs(error)>250){if(++this.largeError>=8)this.fail(new PlayerError('DECODE_FAILED','Selective A/V sync error remained above 250 ms'));}else this.largeError=0;
    this.errors.push(Math.abs(error));if(this.errors.length>1200)this.errors.shift();
    this.maxAbsError=Math.max(this.maxAbsError,Math.abs(error));
    this.sustained=Math.abs(error)>50?this.sustained+1:0;
    this.release=Math.abs(error)<30?this.release+1:0;
    if(this.sustained>=3)this.soft=true;
    if(this.release>=3)this.soft=false;
    const trim=this.soft?Math.max(-.005,Math.min(.005,-error/1000*.1)):0;
    const target=this.requestedRate*(1+trim);
    if(Math.abs(target-this.effectiveRate)>.001){this.effectiveRate=target;this.softCount++;void this.engine.rate(target).catch(error=>this.fail(error));}
  }
  private fadeOut=async()=>{
    const at=this.context.currentTime;this.gain.gain.cancelScheduledValues(at);
    this.gain.gain.setValueAtTime(this.gain.gain.value,at);this.gain.gain.linearRampToValueAtTime(0,at+.008);
    await new Promise(resolve=>setTimeout(resolve,12));
  };
  private fadeIn(){const at=this.context.currentTime;this.gain.gain.cancelScheduledValues(at);this.gain.gain.setValueAtTime(0,at);this.gain.gain.linearRampToValueAtTime(1,at+.008);}
  async open(file:File,audioStream?:number){
    await this.engine.ready;
    const state=this.engine.selectiveAudioState();this.header=state.header;this.context=state.context;this.gain=state.gain;
    await this.engine.command('set','vid','no');await this.engine.command('set','sid','no');
    if(audioStream!==undefined)await this.engine.command('set','aid',String(audioStream+1));
    await this.engine.open(file);
    await this.engine.inspectMetadata();
    let tracks=this.engine.properties.get('track-list') as Array<{id:string;type:string;selected?:boolean;'ff-index'?:number}>|undefined;
    if(audioStream!==undefined){
      const requested=tracks?.find(t=>t.type==='audio'&&t['ff-index']===audioStream);
      if(!requested)throw Error('Selective requested audio stream is absent');
      if(!requested.selected){await this.engine.selectTrack('audio',requested.id);await wait(()=>this.selectedStreamIndex===audioStream);}
      tracks=this.engine.properties.get('track-list') as typeof tracks;
    }
    if(tracks?.some(t=>t.type==='video'&&t.selected)||!tracks?.some(t=>t.type==='audio'&&t.selected))throw Error('Selective mpv track ownership failed');
    this.driftTimer=setInterval(()=>this.observe(),250);
  }
  private async publish(startVideo:()=>Promise<void>){
    const point=new Promise<Timeline>((resolve,reject)=>{
      const timer=setTimeout(()=>{if(this.firstPoint?.resolve===resolve){this.firstPoint=undefined;reject(Error('Selective PCM timestamp timeout'));}},3000);
      this.firstPoint={generation:this.generation,resolve,reject,timer};
    });
    this.set(12,1);this.fadeIn();
    const first=await point;
    const due=first.wallTime!-performance.timeOrigin+(this.time()-first.mediaTime)/this.video.playbackRate*1000;
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,due-performance.now())));
    if(this.stopped)throw Error('Selective audio destroyed during publication');
    await startVideo();this.running=true;
  }
  async play(startVideo:()=>Promise<void>){
    if(this.running)return;
    if(this.context?.state==='suspended')await this.context.resume();
    let deferred:Promise<void>|undefined;
    if(this.resumeRate!==undefined){deferred=this.waitRate(this.resumeRate);this.resumeRate=undefined;}
    await this.engine.play();
    this.set(14,this.h(3));await this.publish(startVideo);
    await deferred;
  }
  async pause(stopVideo:()=>void){
    if(this.pendingRate){this.resumeRate=this.requestedRate;this.cancelRate('Paused during rate transition');}
    this.running=false;await this.fadeOut();this.set(12,0);stopVideo();await this.engine.pause();
  }
  async seek(seconds:number,seekVideo:()=>Promise<void>){
    this.cancelRate('Seek superseded pending rate');this.resumeRate=undefined;
    if(this.firstPoint){const pending=this.firstPoint;this.firstPoint=undefined;clearTimeout(pending.timer);pending.reject(Error('Selective PCM publication superseded by seek'));}
    this.video.defaultPlaybackRate=this.requestedRate;this.video.playbackRate=this.requestedRate;
    const wasRunning=this.running,oldEpoch=this.h(3);
    this.drain=undefined;
    this.running=false;await this.fadeOut();this.generation++;this.points=[];this.sustained=0;this.release=0;this.soft=false;this.missingTimeline=0;this.largeError=0;
    this.set(7,0);this.set(12,0);this.set(10,this.generation);this.video.pause();await this.engine.pause();
    if(this.context.state==='suspended')await this.context.resume();
    await Promise.all([seekVideo(),this.engine.seek(seconds)]);this.hardCount++;
    await wait(()=>this.h(3)!==oldEpoch&&this.h(3)===this.h(4));
    await this.engine.play();
    await wait(()=>this.engine.confirmSeek(seconds));
    this.set(14,this.h(3));
    if(wasRunning)await this.publish(async()=>{await this.video.play();});
    else {await this.engine.pause();this.set(12,0);}
    this.running=wasRunning;
  }
  private waitRate(value:number){
    this.cancelRate('Superseded by another rate request');
    return new Promise<void>((resolve,reject)=>{
      const pending:PendingRate={rate:value,generation:this.generation,resolve,reject,deadline:setTimeout(()=>{
        if(this.pendingRate===pending){this.pendingRate=undefined;const error=new PlayerError('DECODE_FAILED','Selective rate boundary timed out');this.fail(error);reject(error);}
      },3000)};
      this.pendingRate=pending;
    });
  }
  async rate(value:number){
    if(!Number.isFinite(value)||value<.5||value>2)throw Error('Playback rate must be 0.5 to 2');
    if(value===this.requestedRate&&value===this.effectiveRate&&!this.pendingRate)return;
    this.requestedRate=value;this.sustained=0;this.release=0;this.soft=false;
    if(!this.running){await this.engine.rate(value);this.resumeRate=value;return;}
    const boundary=this.waitRate(value);
    await this.engine.rate(value);await boundary;
  }
  async selectAudio(id:string){
    if(id==='auto'||id==='no')throw Error('Selective audio track change requires a new admitted plan');
    const tracks=this.engine.properties.get('track-list') as Array<{id:string;type:string}>|undefined;
    if(!tracks?.some(t=>t.type==='audio'&&t.id===id))throw Error('Unknown mpv audio track');
    await this.engine.selectTrack('audio',id);
  }
  volume(percent:number){return this.engine.volume(percent);}
  gainValue(value:number){return this.engine.gain(value);}
  async verifyOutput(signal?:AbortSignal){
    await wait(()=>this.h(5)>0&&this.points.some(p=>p.kind==='timeline'&&p.generation===this.generation),10000,signal);
    const tracks=this.engine.properties.get('track-list') as Array<{type:string;selected?:boolean}>|undefined;
    if(tracks?.some(t=>t.type==='video'&&t.selected)||!tracks?.some(t=>t.type==='audio'&&t.selected))throw Error('Selective audio output ownership changed');
  }
  private async finishEOF(){
    if(this.drain||this.stopped)return this.drain;
    this.running=false;this.set(7,2);
    this.drain=(async()=>{
      await wait(()=>this.h(0)===this.h(1),2000);
      this.set(12,0);this.set(2,0);await this.engine.pause();
      await wait(()=>this.h(0)===this.h(1)&&this.h(3)===this.h(4),2000);
      await this.context.suspend();
    })();
    return this.drain;
  }
  get diagnostics(){
    if(!this.header)return {plan:'native-video-mpv-audio',state:'initializing'};
    const ordered=[...this.errors].sort((a,b)=>a-b),p=(q:number)=>ordered[Math.floor((ordered.length-1)*q)]??null;
    return {plan:'native-video-mpv-audio',requestedRate:this.requestedRate,effectiveRate:this.video.playbackRate,pendingRate:this.pendingRate?.rate,
      generation:this.generation,estimatedAudioPresentationTime:this.estimatedAudioPresentationTime(),errorMs:this.estimatedAudioPresentationTime()===null?null:(this.estimatedAudioPresentationTime()!-this.time())*1000,
      absErrorP50Ms:p(.5),absErrorP95Ms:p(.95),absErrorP99Ms:p(.99),maxAbsErrorMs:this.maxAbsError,
      rateTransitions:this.rateCount,userSeeks:this.hardCount,softCorrections:this.softCount,preEofUnderruns:this.h(8),postEofDrainCallbacks:this.h(9),staleEpochRejects:this.h(15),
      nativeEpoch:this.h(3),ackEpoch:this.h(4),queuedFrames:Math.max(0,this.h(0)-this.h(1)),contextState:this.context.state,mpvVideoTracks:(this.engine.properties.get('track-list') as Array<{type:string;selected?:boolean}>|undefined)?.filter(t=>t.type==='video'&&t.selected).length??null,
      worker:this.engine.diagnostics};
  }
  async destroy(){
    if(this.stopped)return;this.stopped=true;this.cancelRate('Selective service destroyed');
    if(this.firstPoint){const pending=this.firstPoint;this.firstPoint=undefined;clearTimeout(pending.timer);pending.reject(Error('Selective PCM publication destroyed'));}
    clearInterval(this.driftTimer);this.video.removeEventListener('ended',this.ended);
    if(this.frameCallback)this.video.cancelVideoFrameCallback(this.frameCallback);
    if(this.header)this.set(12,0);
    await this.engine.destroy();this.hidden.remove();
  }
}
