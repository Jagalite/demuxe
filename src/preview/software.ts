// SPDX-License-Identifier: Apache-2.0
import {WasmPlayer, type RemoteSource} from '../internal/wasm-player.js';
import {bufferingPolicy} from '../internal/buffering.js';
import type {MediaInputOptions, ResourceLimits} from '../types.js';
import type {PreviewContext,PreviewProvider,PreviewResult} from './controller.js';
export type SoftwarePreviewSource={file:Blob;input?:MediaInputOptions}|{remote:RemoteSource};
/** Disposable, paused software engine. Never receives the playback backend. */
export class SoftwarePreviewProvider implements PreviewProvider {
  readonly id='software';readonly priority=50;
  constructor(private source:()=>SoftwarePreviewSource|undefined,private document:Document,private assetBase:URL,private limits:ResourceLimits={}){}
  canHandle(){return globalThis.crossOriginIsolated&&!!this.source();}
  async getFrame(request:PreviewContext):Promise<PreviewResult|null>{
    const source=this.source();if(!source)return null;request.signal.throwIfAborted();
    const start=performance.now(),canvas=this.document.createElement('canvas');canvas.width=request.width;canvas.height=request.height??Math.max(1,Math.round(request.width*9/16));
    const player=new WasmPlayer(canvas,{assetBase:this.assetBase,resourceLimits:this.limits,buffering:bufferingPolicy({preload:'metadata',profile:'low-latency',memoryBudget:8*1024*1024})});
    let released!:()=>void;
    const cleanup=new Promise<void>(resolve=>{released=resolve;});
    request.trackCleanup?.(cleanup);
    const dispose=()=>player.destroy().catch(()=>{}).finally(released);
    const abort=()=>{void dispose();};request.signal.addEventListener('abort',abort,{once:true});
    try{
      await player.ready;request.signal.throwIfAborted();const decoderInitializationMs=performance.now()-start;
      await player.command('set','pause','yes');
      await player.command('set','aid','no');await player.command('set','sid','no');
      await player.command('set','vd-lavc-threads','1');
      // Start demux/decode at the requested region, not the beginning of the movie.
      await player.command('set','start',String(request.time));
      const decodeStart=performance.now();
      const presented=player.waitForPreviewPresentation();void presented.catch(()=>{});
      if('file' in source)await player.open(source.file instanceof File?source.file:new File([source.file],'preview-media'),source.input);
      else {
        // Independent bounded range cache; never renew playback credentials here.
        const {refreshAuthorization,...remote}=source.remote;
        const options={...remote,priority:'low',cacheBytes:262144,blockBytes:262144};
        await player.openRemote(options);
      }
      await presented;request.signal.throwIfAborted();
      const tracks=player.properties.get('track-list') as {type:string}[]|undefined;
      if(!tracks?.some(t=>t.type==='video'))return null;
      const params=player.properties.get('video-params') as {w?:number;h?:number;dw?:number;dh?:number}|undefined;
      const w=params?.dw??params?.w,h=params?.dh??params?.h;
      if(w&&h){const scale=Math.min(request.width/w,(request.height??1080)/h,1);player.resize(Math.max(1,Math.min(1920,Math.round(w*scale))),Math.max(1,Math.min(1080,Math.round(h*scale))));}
      const frame=await player.previewSnapshot();request.signal.throwIfAborted();
      return {image:{blob:new Blob([frame.blob],{type:frame.blob.type})},width:frame.width,height:frame.height,time:frame.time,actualTime:null,path:this.id,temporalAccuracy:'approximate',timestampKind:'media-time',fidelity:'full',metrics:{decoderInitializationMs,frameDecodeMs:performance.now()-decodeStart,bytesFetched:'file' in source?0:null,decodedFrames:null}};
    }finally{request.signal.removeEventListener('abort',abort);await dispose();}
  }
}
