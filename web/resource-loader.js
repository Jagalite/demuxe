// SPDX-License-Identifier: Apache-2.0
import {validateFallbackOptions,validateFallbackManifest} from './fallback-stream-policy.js';
import {initialResourceLoader,transitionResourceLoader,resourceCurrent,resourceOpenError,resourceRead,resourceURLAllowed} from './generated/internal/machine/resource-loader.js';
// Bounded HTTP bridge used only by the FFmpeg/mpv fallback. Shaka owns adaptive
// streaming; this bridge never rewrites manifests, chooses variants or schedules segments.
const MiB=1024*1024;
const abort=()=>new DOMException('Resource request cancelled','AbortError');
export class ResourceLoader {
  constructor(options,refresh){
    validateFallbackOptions(options.streaming);
    this.options={credentials:'omit',...options};this.refresh=refresh;
    this.allow=new Set(options.allowedOrigins??[new URL(options.url).origin]);
    this.handles=new Map();this.control=initialResourceLoader(!!options.streaming?.live);
    this.resolve(options.url);
  }
  get epoch(){return this.control.epoch;}
  get closed(){return this.control.closed;}
  get busy(){return this.control.active!==null;}
  get stats(){return this.control.stats;}
  transition(command){const result=transitionResourceLoader(this.control,command);this.control=result.state;return result;}
  check(result){if(result.aborted)throw abort();if(result.error)throw Object.assign(Error(result.error),{retryable:!!result.retry});return result;}
  current(id){if(!resourceCurrent(this.control,id))throw abort();}
  resolve(value,base=this.options.url){
    const u=new URL(value,base);
    if(!resourceURLAllowed({length:u.href.length,protocol:u.protocol,credentials:!!(u.username||u.password),allowedOrigin:this.allow.has(u.origin)}))throw Error('Resource URL is not allowed');
    u.hash='';return u.href;
  }
  beginEpoch(){this.transition({type:'epoch'});this.controller?.abort();this.retryWake?.();}
  closeHandle(id){for(const released of this.transition({type:'close-handle',id}).release??[])this.handles.delete(released);}
  close(){const decision=this.transition({type:'close'});this.controller?.abort();this.retryWake?.();for(const id of decision.release)this.handles.delete(id);}
  read(id,offset,capacity){
    const selected=resourceRead(this.control.handles.find(item=>item.id===id),this.closed,offset,capacity);if(selected.error)throw Error(selected.error);
    if(selected.empty)return new Uint8Array();
    return this.handles.get(id).bytes.subarray(selected.at,selected.end);
  }
  async open(value,{start,end,manifest=false,base}={}){
    const invalid=resourceOpenError(this.control,start,end);if(invalid)throw Error(invalid);
    let url=this.resolve(value,base);manifest=manifest||/\.(m3u8?|mpd)$/i.test(new URL(url).pathname);
    const {request}=this.check(this.transition({type:'open',start,end,manifest})),id=request.id;
    const controller=this.controller=new AbortController();
    const timeout=setTimeout(()=>{if(resourceCurrent(this.control,id)){this.transition({type:'cancel',id});controller.abort();}},15000);
    try{
      for(;;){
        this.check(this.transition({type:'request',id}));
        let response;
        try{
          const headers=new Headers(this.options.headers);
          // Transport owns range semantics, never inherit an unrelated caller range.
          headers.delete('Range');headers.delete('If-Range');
          if(start!==undefined)headers.set('Range',`bytes=${start}-${end-1n}`);
          this.check(this.transition({type:'fetch-started',id}));
          response=await fetch(url,{headers,credentials:this.options.credentials,redirect:'error',cache:'no-store',priority:this.options.priority??'auto',signal:controller.signal});
          const received=this.check(this.transition({type:'headers',id,status:response.status,encoding:response.headers.get('Content-Encoding'),range:response.headers.get('Content-Range'),length:response.headers.get('Content-Length'),refreshAvailable:!!this.refresh}));
          if(received.refresh){
            await response.body?.cancel();
            const update=await new Promise((resolve,reject)=>{
              const cancel=()=>reject(abort());controller.signal.addEventListener('abort',cancel,{once:true});
              Promise.resolve().then(()=>{this.current(id);return this.refresh({url});}).then(resolve,reject).finally(()=>controller.signal.removeEventListener('abort',cancel));
              if(controller.signal.aborted)cancel();
            });
            this.current(id);
            if(update?.url)url=this.resolve(update.url);
            if(update?.headers)this.options.headers={...this.options.headers,...update.headers};
            continue;
          }
          if(!response.body)throw Error('Missing resource body');
          const chunks=[],body=response.body.getReader();
          try{
            for(;;){
              const {value,done}=await body.read();if(done)break;
              this.check(this.transition({type:'chunk',id,bytes:value.byteLength}));chunks.push(value);
            }
          }finally{await body.cancel().catch(()=>{});}
          this.check(this.transition({type:'body-complete',id}));
          const count=this.control.active.count,bytes=new Uint8Array(count);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
          const prefix=new TextDecoder().decode(bytes.subarray(0,512)).trimStart();
          const looksManifest=prefix.startsWith('#EXTM3U')||/^<\?xml\b|^<MPD\b/.test(prefix);
          if(manifest||looksManifest){
            if(count>MiB)throw Error('Manifest size limit exceeded');
            const format=prefix.startsWith('#EXTM3U')?'hls':'dash';
            validateFallbackManifest(bytes,format,this.options.streaming);
          }
          const {handle}=this.check(this.transition({type:'accept',id}));
          this.handles.set(handle.id,{url,bytes});
          return {id:handle.id,url,size:String(handle.total),start:String(handle.start),length:handle.length};
        }catch(error){
          // Abort response consumption even when validation fails before getReader().
          await response?.body?.cancel().catch(()=>{});
          const retry=this.check(this.transition({type:'retry',id,retryable:!!error.retryable||error instanceof TypeError}));
          if(!retry.retry)throw error;
          await new Promise(resolve=>{const timer=setTimeout(done,retry.wait);const self=this;function done(){clearTimeout(timer);self.retryWake=null;resolve();}this.retryWake=done;});
        }
      }
    }finally{clearTimeout(timeout);this.transition({type:'finish',id});if(this.controller===controller)this.controller=null;}
  }
}
