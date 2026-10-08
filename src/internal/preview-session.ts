// SPDX-License-Identifier: Apache-2.0
import type {Backend} from './backend.js';
import type {MediaInputOptions,RemoteSource} from '../types.js';
import type {PreviewContext,PreviewResult} from '../preview/controller.js';
import {bufferingPolicy} from './buffering.js';
import {previewSourceDimensions} from './machine/preview-session.js';

export type PreviewSource={file:Blob;input?:MediaInputOptions}|{remote:RemoteSource};
export interface PreviewSession {
  open(source:PreviewSource,signal:AbortSignal):Promise<void>;
  frame(request:PreviewContext):Promise<PreviewResult|null>;
  destroy():Promise<void>;
}
export type PreviewSessionOptions={document:Document;maxDecodePixels:number;sourceDimensions?:{width?:number;height?:number}};
export const previewBuffering=(memoryBudget=8*1024*1024)=>bufferingPolicy({preload:'auto',profile:'low-latency',memoryBudget});
type Decoder=Backend & {
  waitForPreviewPresentation?():Promise<void>;
  waitForPreviewMetadata?():Promise<void>;
  previewSnapshot?():Promise<{blob:Blob;time:number;width:number;height:number}>;
  verifyStartup?(expected:{video:boolean;audio:boolean}):Promise<void>;
};

/** The child owns its transport and decoder; provider assets are borrowed.
 * No method on this adapter is allowed to receive the playback backend. */
export function independentPreviewSession(child:Decoder,surface:HTMLVideoElement|HTMLCanvasElement,path:string,options:PreviewSessionOptions):PreviewSession {
  let destruction:Promise<void>|undefined;
  let dimensions:{width:number;height:number}|undefined;
  const active=(signal:AbortSignal)=>{signal.throwIfAborted();if(destruction)throw new DOMException('Preview retired','AbortError');};
  const video=surface.tagName==='VIDEO'?surface as HTMLVideoElement:undefined;
  const wait=async(signal:AbortSignal)=>{
    const end=performance.now()+5000;
    while(video&&(video.seeking||video.readyState<2)){
      active(signal);if(video.error)throw new Error('Preview media failed');
      if(performance.now()>end)throw new Error('Preview presentation timed out');
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    active(signal);
  };
  return {
    async open(source,signal){
      active(signal);await child.ready;active(signal);
      if(child.previewSnapshot){
        await child.command?.('set','pause','yes');active(signal);
        await child.command?.('set','aid','no');active(signal);
        await child.command?.('set','sid','no');active(signal);
        if(child.waitForPreviewPresentation)await child.command?.('set','vd-lavc-threads','1');
      }
      active(signal);
      const presented=child.waitForPreviewPresentation?.();void presented?.catch(()=>{});
      if('file' in source)await child.open(source.file instanceof File?source.file:new File([source.file],'preview-media'),source.input);
      else {
        // Copy authorization and origin policy. Renewal remains owned by playback;
        // expired preview credentials fail locally and can be retried later.
        const {refreshAuthorization,...remote}=source.remote;
        await child.openRemote({...remote,headers:remote.headers?{...remote.headers}:undefined,allowedOrigins:remote.allowedOrigins?[...remote.allowedOrigins]:undefined,streaming:remote.streaming?{...remote.streaming}:undefined,priority:'low',cacheBytes:262144,blockBytes:262144} as RemoteSource);
      }
      active(signal);await presented;active(signal);
      await child.waitForPreviewMetadata?.();active(signal);await wait(signal);
      const params=child.properties.get('video-params') as {w?:number;h?:number;dw?:number;dh?:number}|undefined;
      // Canvas backends can initially publish coded size before display aspect,
      // and Hybrid later exposes a transport placeholder. Demux geometry
      // remains stable across those observations.
      const tracks=child.properties.get('track-list');
      const track=Array.isArray(tracks)?tracks.find(track=>track?.type==='video'&&track.selected)??tracks.find(track=>track?.type==='video'):undefined;
      dimensions=previewSourceDimensions({width:video?.videoWidth??params?.dw??params?.w,height:video?.videoHeight??params?.dh??params?.h},{width:track?.['demux-w'],height:track?.['demux-h'],pixelAspect:track?.['demux-par'],rotation:track?.['demux-rotation']},options.sourceDimensions,!video);
    },
    async frame(request){
      active(request.signal);
      const w=dimensions?.width,h=dimensions?.height;
      if(!w||!h||w<=0||h<=0||!Number.isFinite(w*h)||w*h>options.maxDecodePixels)return null;
      const scale=Math.min(request.width/w,(request.height??1080)/h,1920/w,1080/h,1),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
      const start=performance.now();
      if(!video)child.resize(width,height);
      await child.seek(request.time);active(request.signal);
      if(child.previewSnapshot){
        const frame=await child.previewSnapshot();active(request.signal);
        return {time:frame.time,width:frame.width,height:frame.height,image:{blob:new Blob([frame.blob],{type:frame.blob.type})},path,actualTime:null,temporalAccuracy:'approximate',timestampKind:'media-time',fidelity:'full',metrics:{frameDecodeMs:performance.now()-start}};
      }
      await child.verifyStartup?.({video:true,audio:false});await wait(request.signal);
      const seekMs=performance.now()-start,conversion=performance.now(),canvas=options.document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context||!video)return null;context.drawImage(video,0,0,width,height);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));active(request.signal);
      return blob?{time:Number(child.properties.get('time-pos')),width,height,image:{blob},path,actualTime:null,temporalAccuracy:'approximate',timestampKind:'media-time',fidelity:'full',metrics:{seekMs,resizeConversionMs:performance.now()-conversion}}:null;
    },
    destroy(){return destruction??(destruction=Promise.resolve().then(()=>child.destroy()).finally(()=>surface.remove()));},
  };
}
