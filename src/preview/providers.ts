// SPDX-License-Identifier: Apache-2.0
import {beginWait,observeWait} from '../internal/machine/async-policy.js';
import {previewMediaPlan} from '../internal/machine/preview.js';
import type {PreviewContext,PreviewProvider,PreviewResult} from './controller.js';
/** Host-authored storyboards can return encoded tiles or references without a decoder. */
export class AuthoredPreviewProvider implements PreviewProvider {
  readonly id='authored';readonly priority=10;
  constructor(private lookup:(request:PreviewContext)=>Promise<PreviewResult|null>,private sourceId?:string){}
  canHandle(request:PreviewContext){return this.sourceId===undefined||request.sourceId===this.sourceId;}
  getFrame(request:PreviewContext){return this.lookup(request);}
}
/** Uses a separate muted media element and the browser's existing demux/decoder.
 * Local Blob inputs only: no uncontrolled second remote buffering stack. */
export class LocalVideoPreviewProvider implements PreviewProvider {
  readonly id='local-browser';readonly priority=40;readonly requiresDecoder=true;readonly allowDuringPlayback=true;
  constructor(private source:()=>Blob|undefined,private document:Document,private maxDecodePixels=8294400){}
  canHandle(){return !!this.source();}
  async getFrame(request:PreviewContext):Promise<PreviewResult|null>{
    const source=this.source();if(!source)return null;
    const start=performance.now();let mediaReadyMs=0,seekMs=0;const actualTime=null;
    const video=this.document.createElement('video');video.muted=true;video.preload='metadata';video.playsInline=true;
    const url=URL.createObjectURL(source);
    let released!:()=>void;
    const wait=(event:string,action:()=>void)=>new Promise<void>((resolve,reject)=>{
      let state=beginWait(1,performance.now(),'preview-media');let timer:ReturnType<typeof setTimeout>|undefined;
      const cleanup=()=>{
        const errors:unknown[]=[];
        for(const release of [()=>clearTimeout(timer),()=>video.removeEventListener(event,done),()=>video.removeEventListener('error',fail),()=>request.signal.removeEventListener('abort',abort)]){
          try{release();}catch(error){errors.push(error);}
        }
        return errors;
      };
      const settle=(kind:'ready'|'failed'|'retire'|'deadline')=>{
        const next=observeWait(state,{id:1,kind,now:performance.now()});if(next===state)return;
        state=next;const errors=cleanup();if(state.phase==='ready'){if(errors.length)reject(errors[0]);else resolve();}else reject(state.phase==='retired'?new DOMException('Preview cancelled','AbortError'):new Error('Preview media decode failed'));
      };
      const done=()=>settle('ready'),fail=()=>settle('failed'),abort=()=>settle('retire');
      const expire=()=>{settle('deadline');if(state.phase==='waiting')timer=setTimeout(expire,Math.max(0,state.deadline-performance.now()));};
      try{
        const acquired=setTimeout(expire,Math.max(0,state.deadline-performance.now()));
        if(state.phase!=='waiting'){clearTimeout(acquired);return;}timer=acquired;
        for(const [target,name,listener] of [[video,event,done],[video,'error',fail],[request.signal,'abort',abort]] as const){
          if(request.signal.aborted)abort();if(state.phase!=='waiting')return;
          try{target.addEventListener(name,listener,{once:true});}
          finally{if(state.phase!=='waiting')target.removeEventListener(name,listener);}
        }
        if(request.signal.aborted)abort();if(state.phase!=='waiting')return;action();
      }catch(error){if(state.phase==='waiting'){state=observeWait(state,{id:1,kind:'failed',now:performance.now()});cleanup();reject(error);}}

    });
    try{
      request.trackCleanup?.(new Promise<void>(resolve=>{released=resolve;}));
      await wait('loadedmetadata',()=>{video.src=url;});
      const plan=previewMediaPlan({width:video.videoWidth,height:video.videoHeight,duration:video.duration,position:video.currentTime,readyState:video.readyState},request.time,this.maxDecodePixels);if(!plan)return null;
      mediaReadyMs=performance.now()-start;const seekStart=performance.now();
      if(plan.event==='seeked')await wait(plan.event,()=>{video.currentTime=plan.target;});
      else if(plan.event==='loadeddata')await wait(plan.event,()=>{video.preload='auto';});
      seekMs=performance.now()-seekStart;request.signal.throwIfAborted();const conversionStart=performance.now();
      const scale=Math.min(request.width/video.videoWidth,(request.height??2048)/video.videoHeight,1);
      const width=Math.max(1,Math.round(video.videoWidth*scale)),height=Math.max(1,Math.round(video.videoHeight*scale));
      const canvas=this.document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context)return null;
      context.drawImage(video,0,0,width,height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));request.signal.throwIfAborted();
      return blob?{time:video.currentTime,width,height,image:{blob},path:this.id,actualTime,temporalAccuracy:'approximate',fidelity:'full',timestampKind:'media-time',metrics:{mediaReadyMs,seekMs,resizeConversionMs:performance.now()-conversionStart,bytesFetched:0,decodedFrames:null}}:null;
    }finally{
      try{
        const errors:unknown[]=[];
        for(const release of [()=>video.pause(),()=>video.removeAttribute('src'),()=>video.load(),()=>URL.revokeObjectURL(url)]){
          try{release();}catch(error){errors.push(error);}
        }
        if(errors.length)throw errors[0];
      }finally{released?.();}
    }
  }
}

// Structural boundary: public preview declarations must not pull concrete
// native/provider diagnostics and their transitive implementation types into core.
type RemuxPreviewSession = {
  readonly properties:{get(name:'time-pos'):unknown};
  open(file:File):Promise<void>;
  seek(seconds:number):Promise<void>;
  verifyStartup(expected:{video:boolean;audio:boolean}):Promise<void>;
  destroy():Promise<void>;
};
/** Reuse the accepted packet-copy route for a local container the browser cannot
 * open directly. This is an independent, muted session, never the main player. */
export class LocalRemuxPreviewProvider implements PreviewProvider {
  readonly id='local-remux';readonly priority=35;readonly requiresDecoder=true;readonly allowDuringPlayback=true;
  constructor(private source:()=>Blob|undefined,private document:Document,private create:(video:HTMLVideoElement)=>RemuxPreviewSession,private maxDecodePixels=8294400){}
  canHandle(){return !!this.source();}
  async getFrame(request:PreviewContext):Promise<PreviewResult|null>{
    const source=this.source();if(!source)return null;request.signal.throwIfAborted();
    const start=performance.now(),video=this.document.createElement('video');
    video.muted=true;video.playsInline=true;
    const player=this.create(video);
    let cleanup:Promise<void>|undefined,release!:()=>void;
    request.trackCleanup?.(new Promise<void>(resolve=>{release=resolve;}));
    const dispose=()=>cleanup??(cleanup=player.destroy().catch(()=>{}).finally(()=>release?.()));
    const abort=()=>{void dispose();};request.signal.addEventListener('abort',abort,{once:true});
    try{
      request.signal.throwIfAborted();
      await player.open(source instanceof File?source:new File([source],'preview-media'));
      request.signal.throwIfAborted();
      const plan=previewMediaPlan({width:video.videoWidth,height:video.videoHeight,duration:video.duration,position:video.currentTime,readyState:video.readyState},request.time,this.maxDecodePixels);if(!plan)return null;
      const mediaReadyMs=performance.now()-start,seekStart=performance.now();
      await player.seek(plan.target);
      await player.verifyStartup({video:true,audio:false});request.signal.throwIfAborted();
      const seekMs=performance.now()-seekStart,conversionStart=performance.now();
      const scale=Math.min(request.width/video.videoWidth,(request.height??2048)/video.videoHeight,1);
      const width=Math.max(1,Math.round(video.videoWidth*scale)),height=Math.max(1,Math.round(video.videoHeight*scale));
      const canvas=this.document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context)return null;context.drawImage(video,0,0,width,height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));request.signal.throwIfAborted();
      return blob?{time:Number(player.properties.get('time-pos'))||0,width,height,image:{blob},path:this.id,actualTime:null,temporalAccuracy:'approximate',fidelity:'full',timestampKind:'media-time',metrics:{mediaReadyMs,seekMs,resizeConversionMs:performance.now()-conversionStart,bytesFetched:0,decodedFrames:null}}:null;
    }finally{request.signal.removeEventListener('abort',abort);await dispose();}
  }
}
