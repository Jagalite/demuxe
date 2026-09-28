// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './runtime-worker.js';
import {PlayerError,playerError} from './errors.js';
import type {RemoteSource,WatchdogPolicy} from '../types.js';

/** Restricted stereo PCM service: private memory, acknowledged consumption and lifecycle. */
export class NativePrivateMpvAudio extends EventTarget {
  private worker:Worker;
  private context?:AudioContext;
  private node?:AudioWorkletNode;
  private gain?:GainNode;
  private sequence=0;
  private pending=new Map<number,{resolve:(value:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private source?:File|RemoteSource;
  private stopped=false;
  private failed=false;
  private running=false;
  private polling=false;
  private timer?:ReturnType<typeof setInterval>;
  private destroyPromise?:Promise<void>;
  private rateValue=1;
  private volumeValue=100;
  private gainValueStored=1;
  private streamIndex?:number;
  private status:any;
  private facts:any;
  private errors:number[]=[];
  private contextTransition=Promise.resolve();
  private resumeAfterContext=false;
  private eof=false;
  private eofController?:AbortController;
  private lastCleanup:any;
  private watchAudio=true;
  private badClock=0;
  private clockOutside=0;
  private clockInside=0;
  private clockTrim=false;
  private clockRateWrites=0;
  constructor(private video:HTMLVideoElement,private time:()=>number,private base:URL,private runtime:'jspi'|'asyncify',private onFailure:(error:Error)=>void){
    super();this.worker=runtimeWorker(new URL('web/private-mpv/audio-worker.js',base),{type:'module'});
    this.worker.onmessage=({data:d})=>{
      if(d.type==='refresh'){
        const refresh=this.source instanceof File?undefined:this.source?.refreshAuthorization;
        void Promise.resolve().then(()=>{if(!refresh)throw Error('Authorization refresh unavailable');return refresh(d.resource);}).then(update=>{if(!this.stopped)this.worker.postMessage({op:'refreshed',refreshId:d.refreshId,update});},error=>{if(!this.stopped)this.worker.postMessage({op:'refreshed',refreshId:d.refreshId,error:String(error)});});return;
      }
      if(d.type==='transportError'){this.fail(Error(d.error));return;}
      const p=this.pending.get(d.id);if(!p)return;this.pending.delete(d.id);clearTimeout(p.timer);d.error?p.reject(Error(d.error)):p.resolve(d.result);
    };
    this.worker.onerror=e=>{e.preventDefault();this.fail(Error(e.message||'Private mpv worker failed'));};
    this.worker.onmessageerror=()=>this.fail(Error('Private mpv message failure'));
    video.addEventListener('ended',this.onEnded);
  }
  get selectedStreamIndex(){return this.streamIndex;}
  get selectedTrackId(){return this.streamIndex===undefined?undefined:String(this.streamIndex+1);}
  setWatchdogs(policy:WatchdogPolicy){this.watchAudio=policy.selectiveAudio;this.badClock=0;}
  private fail(error:unknown){if(this.failed||this.stopped)return;this.failed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(playerError(error));}this.pending.clear();this.onFailure(playerError(error));void this.destroy();}
  private rpc(op:string,data:Record<string,unknown>={},transfer:Transferable[]=[]):Promise<any>{
    if((this.stopped||this.failed)&&op!=='close')return Promise.reject(Error('Private mpv audio closed'));
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);const error=Error('Private mpv audio deadline: '+op);reject(error);this.fail(error);},op==='close'?1500:15000);
      this.pending.set(id,{resolve,reject,timer});try{this.worker.postMessage({id,op,...data},transfer);}catch(e){clearTimeout(timer);this.pending.delete(id);reject(playerError(e));}
    });
  }
  private latency(){const context=this.context!;const stamp=context.getOutputTimestamp?.();return Math.round(Math.max(0,stamp?.contextTime?context.currentTime-stamp.contextTime:context.baseLatency+(context.outputLatency||0))*1e6);}
  private contextChanged=()=>{
    const active=this.context!.state==='running';
    if(!active&&this.running&&!this.video.paused){this.resumeAfterContext=true;this.video.pause();}
    this.contextTransition=this.contextTransition.then(async()=>{if(this.stopped)return;await this.rpc('context',{value:active});if(active&&this.resumeAfterContext&&this.running){this.resumeAfterContext=false;await this.video.play();}}).catch(e=>this.fail(e));
  };
  async open(source:File|RemoteSource,audioStream?:number){
    if(audioStream===undefined)throw Error('Private mpv selected source stream is missing');
    this.source=source;this.streamIndex=audioStream;
    const context=this.context=new AudioContext({sampleRate:48000});
    if(context.sampleRate!==48000)throw new PlayerError('UNSUPPORTED_FEATURE','Private mpv audio requires 48 kHz output');
    await context.audioWorklet.addModule(new URL('web/private-mpv/audio-worklet.js',this.base));
    if(this.stopped)throw Error('Private mpv audio closed');
    const node=this.node=new AudioWorkletNode(context,'demuxe-private-pcm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    const gain=this.gain=context.createGain();gain.gain.value=this.volumeValue/100*this.gainValueStored;node.connect(gain).connect(context.destination);
    node.port.onmessage=({data})=>{if(data.type==='error')this.fail(Error(data.error));};
    const channel=new MessageChannel();node.port.postMessage({type:'connect',port:channel.port2},[channel.port2]);
    this.facts=await this.rpc('init',{backend:this.runtime,rate:context.sampleRate,contextRunning:context.state==='running',latencyUs:this.latency(),port:channel.port1},[channel.port1]);
    context.addEventListener('statechange',this.contextChanged);
    const transport=source instanceof File?{file:source}:(()=>{const {refreshAuthorization,...options}=source;return {options,canRefresh:!!refreshAuthorization};})();
    if(await this.rpc('load',transport)!==1)throw Error('Private mpv audio allocated a video chain');
    this.status=await this.rpc('status');
    this.timer=setInterval(()=>{void this.observe();},100);
  }
  private async observe(){
    if(this.polling||this.stopped)return;this.polling=true;
    try{
      this.status=await this.rpc('status');
      if(this.running&&this.context?.state==='running'&&!this.video.paused&&!this.video.seeking){
        const error=(this.status.time-this.time())*1000;
        if(this.watchAudio&&!document.hidden&&(!Number.isFinite(error)||Math.abs(error)>250)){if(++this.badClock>=8)throw new PlayerError('PLAYBACK_STALLED','Private mpv audio presentation clock did not converge');}else this.badClock=0;
        if(Number.isFinite(error)){this.errors.push(Math.abs(error));if(this.errors.length>1200)this.errors.shift();
          // Keep browser presentation on the consumed PCM clock; never advance mpv from an element event.
          this.clockOutside=Math.abs(error)>50?this.clockOutside+1:0;
          this.clockInside=Math.abs(error)<30?this.clockInside+1:0;
          if(this.clockOutside>=3)this.clockTrim=true;
          if(this.clockInside>=3)this.clockTrim=false;
          const target=this.rateValue*(1+(this.clockTrim?Math.max(-.005,Math.min(.005,error/1000*.1)):0));
          // A media-element rate assignment resets its presentation scheduling.
          // Ignore clock-sample noise and change rate only for sustained drift.
          if(Math.abs(target-this.video.playbackRate)>.001||!this.clockTrim&&this.video.playbackRate!==this.rateValue){this.video.playbackRate=target;this.clockRateWrites++;}
        }
        await this.rpc('latency',{value:this.latency()});
      }
    }catch(e){this.fail(e);}finally{this.polling=false;}
  }
  private async waitFor(predicate:(status:any)=>boolean,timeout=5000,signal?:AbortSignal){
    const until=performance.now()+timeout;
    while(performance.now()<until){signal?.throwIfAborted();const s=this.status=await this.rpc('status');signal?.throwIfAborted();if(predicate(s))return s;await new Promise(r=>setTimeout(r,10));}
    throw Error('Private mpv PCM convergence timed out');
  }
  async play(startVideo:()=>Promise<void>){
    if(this.running)return;
    await this.context!.resume();await this.contextTransition;await this.rpc('context',{value:true});
    await this.rpc('pause',{value:false});
    // Consuming one worklet block does not mean that audio at the selected
    // video position has reached presentation. After a seek/rate reset mpv's
    // clock still includes the output delay; at 2x this can leave video ahead.
    // Start video when the consumed-PCM clock reaches its held position, or
    // when the audio tail is fully drained and only video remains.
    const target=this.time();
    await this.waitFor(s=>s.eof&&s.header[0]===s.header[1]||s.header[1]>0&&Number.isFinite(s.time)&&s.time>=target);
    try{await startVideo();this.running=true;}catch(e){await this.rpc('pause',{value:true});throw e;}
  }
  private resetClock(){this.clockOutside=this.clockInside=0;this.clockTrim=false;if(this.video.playbackRate!==this.rateValue)this.video.playbackRate=this.rateValue;}
  async pause(stopVideo:()=>void){this.resumeAfterContext=false;this.running=false;await this.rpc('pause',{value:true});stopVideo();this.resetClock();}
  async seek(seconds:number,seekVideo:()=>Promise<void>){
    this.eofController?.abort();this.eofController=undefined;
    const playing=this.running;this.running=false;this.eof=false;this.video.pause();this.resetClock();await this.rpc('pause',{value:true});
    const before=await this.rpc('status');
    await Promise.all([seekVideo(),this.rpc('seek',{value:seconds})]);
    await this.waitFor(s=>s.epoch!==before.epoch&&s.ack&&s.header[3]===s.header[7]);
    if(playing)await this.play(()=>this.video.play());
  }
  async rate(value:number){
    if(!Number.isFinite(value)||value<.5||value>2)throw Error('Playback rate must be 0.5 to 2');
    if(value===this.rateValue)return;
    const playing=this.running,at=this.time();if(this.context){await this.pause(()=>this.video.pause());const before=await this.rpc('status');await this.rpc('speed',{value});await this.rpc('seek',{value:at});await this.waitFor(s=>s.epoch!==before.epoch&&s.ack&&s.header[3]===s.header[7]);}
    this.rateValue=value;this.video.defaultPlaybackRate=value;this.video.playbackRate=value;
    if(playing)await this.play(()=>this.video.play());
  }
  async volume(value:number){this.volumeValue=value;if(this.gain)this.gain.gain.value=value/100*this.gainValueStored;}
  async gainValue(value:number){this.gainValueStored=value;if(this.gain)this.gain.gain.value=this.volumeValue/100*value;}
  async setAudioOutputDevice(id:string){const context=this.context as AudioContext&{setSinkId?:(id:string)=>Promise<void>};if(!context?.setSinkId)throw new PlayerError('UNSUPPORTED_FEATURE','Audio output selection unavailable');await context.setSinkId(id);}
  async verifyOutput(signal?:AbortSignal){await this.waitFor(s=>s.header[1]>0&&s.feedbackCount>0&&s.chains===1,10000,signal);}
  private onEnded=()=>{
    if(this.eof||this.stopped)return;this.eof=true;
    const controller=this.eofController=new AbortController();
    void (async()=>{
      await this.waitFor(s=>s.eof&&s.header[0]===s.header[1],2500,controller.signal);
      controller.signal.throwIfAborted();await this.pause(()=>{});
      controller.signal.throwIfAborted();await this.context!.suspend();
    })().catch(e=>{if(!controller.signal.aborted)this.fail(e);}).finally(()=>{if(this.eofController===controller)this.eofController=undefined;});
  };
  get diagnostics(){const sorted=[...this.errors].sort((a,b)=>a-b);return {plan:'native-video-mpv-audio',cleanup:this.lastCleanup,privateRuntime:this.status?.runtime??this.facts,clockRateWrites:this.clockRateWrites,contextState:this.context?.state,requestedRate:this.rateValue,effectiveRate:this.video.playbackRate,estimatedAudioPresentationTime:this.status?.time,errorMs:this.status?(this.status.time-this.time())*1000:null,absErrorP95Ms:sorted[Math.floor((sorted.length-1)*.95)]??null,maxAbsErrorMs:sorted.at(-1)??null,queuedFrames:this.status?this.status.header[0]-this.status.header[1]:0,nativeEpoch:this.status?.epoch,ackEpoch:this.status?.header[7],feedbackCount:this.status?.feedbackCount,mpvVideoTracks:this.status?this.status.chains>>1:null,worker:this.status};}
  destroy(){
    if(this.destroyPromise)return this.destroyPromise;
    this.eofController?.abort();this.eofController=undefined;
    this.stopped=true;this.running=false;clearInterval(this.timer);this.video.removeEventListener('ended',this.onEnded);this.context?.removeEventListener('statechange',this.contextChanged);
    return this.destroyPromise=(async()=>{
      try{this.lastCleanup=await this.rpc('close');}catch(error){this.lastCleanup={error:String(error)};}finally{
        this.worker.terminate();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Private mpv audio destroyed'));}this.pending.clear();this.node?.disconnect();this.node?.port.close();this.gain?.disconnect();if(this.context?.state!=='closed')await this.context?.close();
      }
    })();
  }
}
