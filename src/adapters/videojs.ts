// SPDX-License-Identifier: Apache-2.0
import {MediaView,MEDIA_VIEW_EVENTS} from '../integration/media-view.js';
import type {PlaybackRuntime} from '../contracts.js';
import {PlayerError} from '../internal/errors.js';
import {initialVideojsHostLease,transitionVideojsHost,initialVideojsState,transitionVideojs,videojsSourceCurrent,type VideojsHostLease,type VideojsCommand} from '../internal/machine/videojs.js';
const hosted=new WeakMap<HTMLElement,VideojsHostLease>();
function hostCommand(host:HTMLElement,command:Parameters<typeof transitionVideojsHost>[1]){const decision=transitionVideojsHost(hosted.get(host)??initialVideojsHostLease(),command);hosted.set(host,decision.state);return decision;}
/** Optional, explicitly registered Video.js 8.24.1 Tech. No runtime dependency import. */
export function registerVideojsTech(videojs:any,name='Demuxe'):void {
  if(videojs.getTech(name))throw new PlayerError('INVALID_ARGUMENT','Tech name is already registered');
  const Tech=videojs.getTech('Tech');
  class DemuxeTech extends Tech {
    private view!:MediaView;
    private control=initialVideojsState();
    private owner:any;
    private adapterError:unknown=null;
    private restore?:()=>void;
    private retireHost?:()=>void;
    private releaseHost?:()=>void;
    private stops:(()=>void)[]=[];
    private cleanupFailure?:unknown;
    private transition(command:VideojsCommand){const decision=transitionVideojs(this.control,command);this.control=decision.state;return decision;}
    private reflectSource(){
      const id=this.view.state.sourceId,decision=this.transition({type:'source',sourceId:id});if(!decision.accepted)return;
      if(decision.clearError){this.adapterError=null;this.owner?.error(null);}
      if(videojsSourceCurrent(this.control,id)&&this.view.state.sourceId===id)this.trigger({type:'sourceset',src:id===null?'':`demuxe-session:${id}`});
    }
    constructor(options:any,ready:any){
      if(!options.demuxePlayer||options.source)throw new PlayerError('INVALID_ARGUMENT','Supply demuxePlayer with application-owned sources');
      const runtime:PlaybackRuntime=options.demuxePlayer,host=runtime.host;
      if(runtime.isDestroyed)throw new PlayerError('ABORTED','Cannot bind a destroyed runtime');
      if(host.ownerDocument!==document)throw new PlayerError('UNSUPPORTED_FEATURE','Cross-document hosting is not supported');
      if(!host.parentNode)throw new PlayerError('INVALID_ARGUMENT','Presentation host must have a restoration parent');
      const reservation=hostCommand(host,{type:'reserve'});if(!reservation.accepted)throw new PlayerError('UNSUPPORTED_FEATURE','Another Tech owns this presentation host');
      const owner=reservation.owner!;let cleanupAfterConstruction:(()=>void)|undefined;
      try{
        super({...options,nativeControlsForTouch:false},ready);
        cleanupAfterConstruction=()=>{this.transition({type:'dispose'});this.cleanupResources();try{super.dispose();}catch{}};
        this.retireHost=()=>{hostCommand(host,{type:'retire',owner});};
        this.releaseHost=()=>{hostCommand(host,{type:'release',owner});};
        this.owner=videojs.getPlayer(options.playerId);
        this.view=new MediaView(runtime);
        if(runtime.isDestroyed)throw new PlayerError('ABORTED','Runtime was destroyed during binding');
        const parent=host.parentNode!;
        const marker=host.ownerDocument.createComment('demuxe-videojs-host');
        this.restore=()=>{if(!runtime.isDestroyed&&host.parentNode===this.el()){if(marker.parentNode)marker.replaceWith(host);else parent.appendChild(host);}marker.remove();};
        host.before(marker);this.el().append(host);hostCommand(host,{type:'attach',owner});
        for(const event of MEDIA_VIEW_EVENTS){const listener=(value:Event)=>{
          if(this.control.retired)return;const detail=(value as CustomEvent).detail,snapshot=this.view.state;
          if(event==='operationerror')videojs.getPlayer(options.playerId)?.trigger({type:'demuxeoperationerror',detail});
          else {if(event==='loadedmetadata'||event==='emptied')this.reflectSource();if(!this.control.retired&&this.view.state===snapshot)this.trigger({type:event,detail});}
        };this.stops.push(()=>this.view.removeEventListener(event,listener));this.view.addEventListener(event,listener);}
        this.ready(()=>{if(!this.transition({type:'ready'}).accepted)return;if(this.view.state.sourceId!==null)this.reflectSource();});
        this.triggerReady();
      }catch(error){
        hostCommand(host,{type:'retire',owner});
        cleanupAfterConstruction?.();
        hostCommand(host,{type:'release',owner});throw error;
      }
    }
    private cleanupResources(){
      const errors:unknown[]=[];
      for(const stop of this.stops.splice(0))try{stop();}catch(error){errors.push(error);}
      if(this.view)try{void this.view.dispose().catch(error=>{this.cleanupFailure=error;});}catch(error){errors.push(error);void this.view.binding.dispose().catch(failure=>{this.cleanupFailure=failure;});}
      try{this.restore?.();}catch(error){errors.push(error);}this.restore=undefined;
      if(errors.length)this.cleanupFailure=new AggregateError(errors,'Video.js binding cleanup failed');
    }
    createEl(){const element=document.createElement('div');element.className='vjs-tech';return element;}
    static isSupported(){return true;}
    static canPlayType(){return '';}
    static canPlaySource(){return '';}
    play(){return this.view.play();} pause(){this.view.pause();}
    paused(){return this.view.paused;} ended(){return this.view.ended;}
    currentTime(){return this.view.currentTime;} setCurrentTime(v:number){this.view.currentTime=v;return v;}
    duration(){return this.view.duration;} seeking(){return this.view.seeking;}
    volume(){return this.view.volume;} setVolume(v:number){if(this.control?.controlsReady&&!this.control.retired)this.view.volume=v;}
    muted(){return this.view.muted;} setMuted(v:boolean){this.view.muted=v;}
    playbackRate(){return this.view.playbackRate;} setPlaybackRate(v:number){this.view.playbackRate=v;}
    buffered(){return this.view.buffered;} seekable(){return this.view.seekable;}
    error(value?:unknown){if(value!==undefined&&(!this.control||this.transition({type:'error'}).accepted)){this.adapterError=value;this.trigger('error');}const error=this.view?.error;return error?{code:3,message:error.message}:!this.control||this.control.errorId!==null?this.adapterError:null;}
    controls(){return false;}
    poster(){return '';}
    videoWidth(){return this.view.state.mediaInfo.displayWidth??0;}
    videoHeight(){return this.view.state.mediaInfo.displayHeight??0;}
    currentSrc(){return this.view.state.sourceId===null?'':`demuxe-session:${this.view.state.sourceId}`;}
    src(){throw new PlayerError('UNSUPPORTED_FEATURE','Sources are application-owned');}
    load(){throw new PlayerError('UNSUPPORTED_FEATURE','Loading belongs to the application');}
    supportsFullScreen(){return false;}
    dispose(){if(!this.transition({type:'dispose'}).accepted)return;this.retireHost?.();try{this.cleanupResources();super.dispose();}finally{this.releaseHost?.();this.releaseHost=undefined;}}
  }
  // Prevent Tech's fallback polling and native text-track renderer installation.
  Object.assign(DemuxeTech.prototype,{featuresTimeupdateEvents:true,featuresProgressEvents:true,featuresNativeTextTracks:true,featuresPlaybackRate:true,featuresVolumeControl:true});
  videojs.registerTech(name,DemuxeTech);
}
