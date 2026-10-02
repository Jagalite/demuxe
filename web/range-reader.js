// SPDX-License-Identifier: Apache-2.0
import {initialRangeReader,transitionRangeReader,rangePeek,rangeURLAllowed} from './generated/internal/machine/range-reader.js';
// Bounded, single-flight VOD range transport. Buffers and browser effects stay here;
// admission, identity, deadlines, retries and cache ownership live in the core.
export class RangeReader {
  constructor(options, refresh) {
    this.options={readDeadlineMs:15000,credentials:'omit',cacheBytes:16*1024*1024,blockBytes:256*1024,immutable:false,...options};
    this.control=initialRangeReader({readDeadlineMs:this.options.readDeadlineMs,blockBytes:this.options.blockBytes,cacheBytes:this.options.cacheBytes,immutable:this.options.immutable},options.identity);
    this.allow=new Set(options.allowedOrigins || [new URL(options.url).origin]);
    this.refresh=refresh;this.cache=new Map();this.checkURL(this.options.url);
  }
  get epoch(){return this.control.epoch;}
  get closed(){return this.control.closed;}
  get busy(){return this.control.active!==null;}
  get total(){return this.control.total;}
  get etag(){return this.control.etag;}
  get stats(){return this.control.stats;}
  transition(command){const decision=transitionRangeReader(this.control,command);this.control=decision.state;return decision;}
  checkResult(decision){if(decision.aborted)throw new DOMException('Superseded','AbortError');if(decision.error)throw Object.assign(Error(decision.error),{retry:!!decision.retry});return decision;}
  checkURL(value){const u=new URL(value);if(!rangeURLAllowed({protocol:u.protocol,credentials:!!(u.username||u.password),allowedOrigin:this.allow.has(u.origin)}))throw Error('Media origin is not allowed');}
  async open(){await this.read(0n,1);return {size:String(this.total),etag:this.etag};}
  retirePreview(decision){if(decision.retirePreview!==undefined&&this.previewResource?.id===decision.retirePreview)this.previewResource.reader.close();}
  beginEpoch(){this.retirePreview(this.transition({type:'epoch'}));this.operation?.abort(new DOMException('Superseded','AbortError'));this.controller?.abort();this.retryWake?.();}
  close(){this.retirePreview(this.transition({type:'close'}));this.operation?.abort(new DOMException('Superseded','AbortError'));this.controller?.abort();this.retryWake?.();this.cache.clear();}
  /** Copy resident bytes without touching playback LRU, epoch, or scheduling. */
  peek(offset,capacity){
    const selected=rangePeek(this.control,offset,capacity);if(selected.error)throw Error(selected.error);
    return selected.key===undefined?null:this.cache.get(selected.key).slice(selected.at,selected.at+capacity);
  }
  /** Independent preview resource; playback preempts it without taking its lane. */
  async readPreview(offset,capacity,{signal,allowFetch=false}={}){
    if(signal?.aborted||this.closed)throw new DOMException('Preview cancelled','AbortError');
    const cached=this.peek(offset,capacity);if(cached)return {bytes:cached,path:'cached-bytes'};
    const decision=this.transition({type:'preview-begin',allowFetch});if(decision.previewId===undefined)return null;
    const id=decision.previewId;let reader;
    try{
      // Preview must not occupy playback's auth-refresh mailbox.
      reader=new RangeReader({...this.options,priority:'low',blockBytes:this.control.config.blockBytes,cacheBytes:this.control.config.blockBytes,identity:{size:String(this.total),etag:this.etag}});
      this.previewResource={id,reader};const abort=()=>reader.close();signal?.addEventListener('abort',abort,{once:true});
      try{const bytes=await reader.read(offset,capacity);if(signal?.aborted||reader.closed||this.control.preview?.id!==id||this.control.preview.retired)throw new DOMException('Preview cancelled','AbortError');return {bytes:bytes.slice(),path:'fetched-bytes'};}
      finally{signal?.removeEventListener('abort',abort);}
    }finally{reader?.close();this.transition({type:'preview-finish',id});if(this.previewResource?.id===id)this.previewResource=undefined;}
  }
  async read(offset,capacity){
    this.retirePreview(this.transition({type:'preview-retire'}));
    const decision=this.checkResult(this.transition({type:'begin',offset,capacity}));if(decision.empty)return new Uint8Array();
    const {id,start,key}=decision.request;
    try{
      let bytes=decision.hit?this.cache.get(decision.hit.key):undefined;
      if(!bytes){
        bytes=await this.fetchBlock(start,id);
        const admission=this.checkResult(this.transition({type:'cache',id,length:bytes.length,owned:bytes.buffer.byteLength}));
        for(const old of admission.evict??[])this.cache.delete(old);this.cache.set(key,bytes);
      }
      this.checkResult(this.transition({type:'check',id,now:performance.now()}));
      const at=Number(offset-start);return bytes.subarray(at,Math.min(bytes.length,at+capacity));
    }finally{this.transition({type:'finish',id});}
  }
  async fetchBlock(start,id){
    const buffer=new Uint8Array(this.control.config.blockBytes);
    this.checkResult(this.transition({type:'fetch-begin',id,now:performance.now()}));
    const operation=this.operation=new AbortController();let attemptController,retryWake;
    const timeout=()=>{const decision=this.transition({type:'timeout',id});operation.abort(decision.aborted?new DOMException('Superseded','AbortError'):Error(decision.error));};
    // The absolute deadline spans headers, successful body progress, backoff and
    // refresh; every awaited response is observed even after logical retirement.
    const deadlineTimer=setTimeout(timeout,this.control.config.readDeadlineMs);
    operation.signal.addEventListener('abort',()=>{attemptController?.abort();retryWake?.();},{once:true});
    const check=()=>{
      const decision=this.transition({type:'check',id,now:performance.now()});
      if(decision.aborted)operation.abort(new DOMException('Superseded','AbortError'));else if(decision.error)operation.abort(Error(decision.error));
      if(operation.signal.aborted)throw operation.signal.reason;
    };
    const waitFor=promise=>new Promise((resolve,reject)=>{
      const signal=operation.signal,cleanup=()=>signal.removeEventListener('abort',onAbort),onAbort=()=>{cleanup();reject(signal.reason);};
      signal.addEventListener('abort',onAbort,{once:true});
      Promise.resolve(promise).then(value=>{cleanup();try{check();resolve(value);}catch(error){reject(error);}},error=>{cleanup();reject(error);});
      if(signal.aborted)onAbort();
    });
    try{
      for(;;){
        check();
        const request=this.checkResult(this.transition({type:'request',id,now:performance.now()}));
        const controller=this.controller=attemptController=new AbortController();let timer,reader,response;
        const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),1200);};
        try{
          const headers=new Headers(this.options.headers);headers.set('Range',`bytes=${request.offset}-${request.end}`);if(this.etag)headers.set('If-Range',this.etag);
          this.checkURL(this.options.url);touch();
          this.checkResult(this.transition({type:'fetch-started',id}));
          response=await waitFor(fetch(this.options.url,{headers,credentials:this.options.credentials,redirect:'error',cache:'no-store',priority:this.options.priority??'auto',signal:controller.signal}));
          const received=this.checkResult(this.transition({type:'headers',id,status:response.status,range:response.headers.get('Content-Range'),encoding:response.headers.get('Content-Encoding'),etag:response.headers.get('ETag'),length:response.headers.get('Content-Length'),refreshAvailable:!!this.refresh}));
          if(received.refresh){
            await waitFor(response.body?.cancel());clearTimeout(timer);const update=await waitFor(this.refresh());
            const options={...this.options,...update};this.checkURL(options.url);check();this.options=options;continue;
          }
          if(received.complete){await waitFor(response.body?.cancel());return buffer.subarray(0,this.control.active.received);}
          reader=response.body.getReader();
          while(true){
            touch();const {done,value}=await waitFor(reader.read());if(done)break;
            const chunk=this.checkResult(this.transition({type:'chunk',id,bytes:value.length}));buffer.set(value,chunk.copyAt);
          }
          this.checkResult(this.transition({type:'body-complete',id}));check();return buffer.subarray(0,this.control.active.received);
        }catch(error){
          controller.abort();void reader?.cancel().catch(()=>{});void response?.body?.cancel().catch(()=>{});check();
          const retryAfter=response?.headers.get('Retry-After'),serverWait=retryAfter?(/^\d+$/.test(retryAfter)?Number(retryAfter)*1000:Math.max(0,Date.parse(retryAfter)-Date.now())):0;
          const retry=this.checkResult(this.transition({type:'retry',id,retryable:!!error.retry||error.name==='AbortError'||error instanceof TypeError,now:performance.now(),serverWait,random:Math.random()}));
          if(!retry.retry)throw Error(error.message);
          await waitFor(new Promise(resolve=>{const timer=setTimeout(done,retry.wait),self=this;function done(){clearTimeout(timer);if(self.retryWake===done)self.retryWake=null;retryWake=null;resolve();}this.retryWake=retryWake=done;}));
        }finally{clearTimeout(timer);if(this.controller===controller)this.controller=null;if(attemptController===controller)attemptController=null;}
      }
    }finally{clearTimeout(deadlineTimer);if(this.operation===operation)this.operation=null;}
  }
}
