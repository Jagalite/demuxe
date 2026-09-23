// SPDX-License-Identifier: Apache-2.0
import type Shaka from 'shaka-player';
import type {RemoteSource} from '../types.js';
import {PlayerError} from './errors.js';

const owners=new WeakMap<Shaka.extern.Request,ShakaNetworkPolicy>();
const installed=new WeakSet<typeof Shaka>();
function installTransport(runtime:typeof Shaka){
  if(installed.has(runtime))return;
  const delegate=runtime.net.HttpFetchPlugin.parse;
  const plugin:Shaka.extern.SchemePlugin=(uri,request,...args)=>{
    const owner=owners.get(request);
    return owner?owner.plugin(uri,request,...args):delegate(uri,request,...args);
  };
  // Shaka selects its scheme plugin before awaiting request filters. Register
  // one delegating plugin and associate requests in the per-player filter.
  // Unowned requests keep Shaka's built-in fetch behavior. No session is captured.
  for(const scheme of ['http','https','blob'])runtime.net.NetworkingEngine.registerScheme(scheme,plugin,undefined,true);
  installed.add(runtime);
}
/** Per-session Shaka transport. Scheduling, retries and bandwidth estimation stay
 * in NetworkingEngine. A WeakMap associates only this player's requests.
 * Fetch redirect:error is intentional: filters cannot authorize a redirect before
 * the browser sends it. Applications must supply final authorized resource URLs. */
export class ShakaNetworkPolicy {
  private requests=new Set<Shaka.extern.Request>();
  terminalError?: PlayerError;
  private active = true;
  private controllers = new Set<AbortController>();
  private allowed: Set<string>;
  private headers: Record<string,string>;
  private validators = new Map<string,string>();
  private rangeTotals = new Map<string,bigint>();
  private ownedBlobs = new Set<string>();
  constructor(private source:RemoteSource, private runtime:typeof Shaka, private fetcher:typeof fetch = globalThis.fetch.bind(globalThis), private preview=false) {
    const root=new URL(source.url,globalThis.location?.href);
    this.allowed=new Set(source.allowedOrigins??[root.origin]);
    this.headers={...source.headers};this.checkHeaders(this.headers);this.authorize(root.href);
    installTransport(runtime);
  }
  private checkHeaders(headers:Record<string,string>){if(Object.keys(headers).some(name=>name.toLowerCase()==='range'))throw this.fail(new PlayerError('SOURCE_PERMISSION','Source headers cannot override Shaka byte ranges'));}
  private checkActive(){if(!this.active)throw new PlayerError('ABORTED','Streaming source was retired');}
  authorize(uri:string):string {
    this.checkActive();
    const url=new URL(uri, this.source.url);
    if(this.ownedBlobs.has(url.href))return url.href;
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!this.allowed.has(url.origin)) {
      throw this.fail(new PlayerError('SOURCE_PERMISSION','Streaming resource origin is not allowed'));
    }
    return url.href;
  }
  ownBlob(uri:string){this.ownedBlobs.add(uri);}
  private fail(error:PlayerError){this.terminalError=error;return error;}
  readonly filter:Shaka.extern.RequestFilter=(type,request)=>{
    this.checkActive();
    if(type===this.runtime.net.NetworkingEngine.RequestType.LICENSE||request.drmInfo)throw this.fail(new PlayerError('UNSUPPORTED_FEATURE','Encrypted streaming requires a DRM contract'));
    request.uris=request.uris.map(uri=>this.authorize(uri));
    owners.set(request,this);this.requests.add(request);
  };
  readonly plugin:Shaka.extern.SchemePlugin=(resource,request,type,progress,received)=>{
    const controller=new AbortController();this.controllers.add(controller);
    let timedOut=false;
    // NetworkingEngine owns connection/stall deadlines via progressSupport.
    // Like Shaka HttpFetchPlugin, this transport enforces only the total timeout.
    const timer=request.retryParameters.timeout?setTimeout(()=>{timedOut=true;controller.abort();},request.retryParameters.timeout):undefined;
    let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
    const started=performance.now();
    const E=this.runtime.util.Error;
    const promise=(async()=>{
      let uri=this.authorize(resource), response:Response|undefined;
      for(let attempt=0;attempt<2;attempt++) {
        this.checkActive();
        // Headers from Shaka include Range and content negotiation. Source auth
        // overrides only matching names; refreshing never drops Range.
        const headers=new Headers(request.headers);
        for(const [name,value] of Object.entries(this.headers))headers.set(name,value);
        response=await this.fetcher(uri,{method:request.method,headers,body:request.body as BodyInit|null,signal:controller.signal,credentials:this.source.credentials??'same-origin',redirect:'error',priority:this.preview?'low':'auto'});
        this.checkActive();
        if(response.status!==401&&response.status!==403)break;
        await response.body?.cancel();
        if(attempt||!this.source.refreshAuthorization)throw this.fail(new PlayerError('SOURCE_PERMISSION','Streaming authorization was rejected'));
        let update:Awaited<ReturnType<NonNullable<RemoteSource['refreshAuthorization']>>>;
        let cancel:()=>void=()=>{};
        try{update=await Promise.race([this.source.refreshAuthorization({url:uri}),new Promise<never>((_,reject)=>{cancel=()=>reject(new PlayerError('ABORTED','Streaming authorization refresh cancelled'));if(controller.signal.aborted)cancel();else controller.signal.addEventListener('abort',cancel,{once:true});})]);}
        catch(error){this.checkActive();throw this.fail(error instanceof PlayerError?error:new PlayerError('SOURCE_PERMISSION','Streaming authorization refresh failed'));}
        finally{controller.signal.removeEventListener('abort',cancel);}
        this.checkActive();
        if(controller.signal.aborted)throw new PlayerError('ABORTED','Streaming request cancelled');
        if(update.headers){this.checkHeaders(update.headers);this.headers={...this.headers,...update.headers};}
        if(update.url)uri=this.authorize(update.url);
      }
      reader=response!.body?.getReader();
      if(!response!.ok)throw new E(E.Severity.RECOVERABLE,E.Category.NETWORK,E.Code.BAD_HTTP_STATUS,uri,response!.status,'',{},type);
      if(response!.url)this.authorize(response!.url);
      if(this.source.immutable&&type===this.runtime.net.NetworkingEngine.RequestType.SEGMENT&&!this.ownedBlobs.has(uri)) {
        const etag=response!.headers.get('etag'),validator=etag&&!etag.startsWith('W/')?etag:null;
        // immutable is the caller's stable-byte promise. Available strong ETags
        // can disprove that promise; absent/weak validators are not identity proof.
        if(validator){
          if(this.validators.has(uri)&&this.validators.get(uri)!==validator)throw this.fail(new PlayerError('SOURCE_CHANGED','Streaming resource representation changed'));
          if(this.validators.size>=4096&&!this.validators.has(uri))this.validators.delete(this.validators.keys().next().value!);
          this.validators.set(uri,validator);
        }
      }
      const headers:Record<string,string>={};response!.headers.forEach((value,key)=>headers[key]=value);received(headers);
      const range=new Headers(request.headers).get('range');
      const requested=range?/^bytes=(\d+)-(\d*)$/.exec(range):null;
      if(range&&!requested)throw this.fail(new PlayerError('SOURCE_CHANGED','Unsupported streaming byte range'));
      if(range&&headers['content-encoding']&&headers['content-encoding']!=='identity')throw this.fail(new PlayerError('SOURCE_CHANGED','Encoded response cannot preserve streaming byte ranges'));
      let expectedBytes:bigint|undefined,total:bigint|undefined,start=0n,end=0n;
      if(requested){
        start=BigInt(requested[1]);
        if(response!.status===206){
          const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(headers['content-range']??'');
          if(!match)throw this.fail(new PlayerError('SOURCE_CHANGED','Invalid streaming Content-Range'));
          total=BigInt(match[3]);end=requested[2]?BigInt(requested[2]):total-1n;if(end>=total)end=total-1n;
          if(BigInt(match[1])!==start||BigInt(match[2])!==end||start>end||end>=total)throw this.fail(new PlayerError('SOURCE_CHANGED','Streaming response does not match requested byte range'));
          expectedBytes=end-start+1n;
        }else if(response!.status!==200)throw this.fail(new PlayerError('SOURCE_CHANGED','Streaming range request needs a complete 200 or exact 206 response'));
      }else if(response!.status===206)throw this.fail(new PlayerError('SOURCE_CHANGED','Unexpected partial streaming response'));
      const chunks:Uint8Array[]=[];
      const byteLimit=(this.preview?4:type===this.runtime.net.NetworkingEngine.RequestType.MANIFEST?4:16)*1024*1024;
      if(Number(headers['content-length'])>byteLimit)throw this.fail(new PlayerError('SOURCE_PERMISSION','Streaming resource exceeds the response byte budget'));
      let bytes=0,last=performance.now();const length=Number(headers['content-length'])||0;
      if(reader)while(true){const value=await reader.read();this.checkActive();if(value.done)break;bytes+=value.value.byteLength;if(bytes>byteLimit)throw this.fail(new PlayerError('SOURCE_PERMISSION','Streaming resource exceeds the response byte budget'));chunks.push(value.value);const now=performance.now();progress(now-last,value.value.byteLength,Math.max(0,length-bytes));last=now;if(request.streamDataCallback&&!requested)await request.streamDataCallback(value.value);}
      const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
      let result=data.buffer;
      if(requested){
        if(headers['content-length']&&BigInt(headers['content-length'])!==BigInt(bytes))throw this.fail(new PlayerError('SOURCE_CHANGED','Streaming range body length disagrees with Content-Length'));
        if(expectedBytes!==undefined&&expectedBytes!==BigInt(bytes))throw this.fail(new PlayerError('SOURCE_CHANGED','Streaming range body has the wrong byte count'));
        if(response!.status===200){
          total=BigInt(bytes);end=requested[2]?BigInt(requested[2]):total-1n;if(end>=total)end=total-1n;
          if(start>end||start>=total)throw this.fail(new PlayerError('SOURCE_CHANGED','Complete streaming response does not contain requested range'));
          result=data.slice(Number(start),Number(end+1n)).buffer;
        }
        const known=this.rangeTotals.get(uri);
        if(known!==undefined&&known!==total)throw this.fail(new PlayerError('SOURCE_CHANGED','Streaming range resource changed length'));
        if(this.rangeTotals.size>=4096&&!this.rangeTotals.has(uri))this.rangeTotals.delete(this.rangeTotals.keys().next().value!);
        this.rangeTotals.set(uri,total!);
        // Validate the complete bounded response before incremental parsers see
        // range bytes. A server ignoring Range is safely sliced after validation.
        if(request.streamDataCallback)await request.streamDataCallback(result);
      }
      return {uri,originalUri:uri,data:result,headers,status:response!.status,timeMs:performance.now()-started,originalRequest:request};
    })().catch(error=>{
      // Shaka's preload manager intentionally ignores OPERATION_ABORTED. A
      // transport retired externally must reject its load promise so player
      // destroy can acquire the load mutex; the backend maps retirement to
      // Demuxe ABORTED and suppresses all session events.
      if(!this.active)throw new E(E.Severity.CRITICAL,E.Category.NETWORK,E.Code.HTTP_ERROR,'Demuxe streaming source retired');
      if(error instanceof PlayerError){if(error.code!=='ABORTED')this.terminalError=error;throw new E(E.Severity.CRITICAL,E.Category.NETWORK,E.Code.HTTP_ERROR,'[authorized resource]',error);}
      if(controller.signal.aborted)throw new E(E.Severity.RECOVERABLE,E.Category.NETWORK,timedOut?E.Code.TIMEOUT:E.Code.OPERATION_ABORTED);
      if(error instanceof E)throw error;
      throw new E(E.Severity.RECOVERABLE,E.Category.NETWORK,E.Code.HTTP_ERROR,'[authorized resource]',error);
    }).finally(async()=>{clearTimeout(timer);try{await reader?.cancel();}catch{}finally{reader?.releaseLock();this.controllers.delete(controller);owners.delete(request);this.requests.delete(request);}});
    return new this.runtime.util.AbortableOperation(promise,async()=>{controller.abort();});
  };
  /** Preview has current credentials but never owns playback authorization renewal. */
  forkForPreview(){
    this.checkActive();
    const policy=new ShakaNetworkPolicy({...this.source,headers:{...this.headers},refreshAuthorization:undefined},this.runtime,this.fetcher,true);
    for(const uri of this.ownedBlobs)policy.ownBlob(uri);
    return policy;
  }
  destroy(){if(!this.active)return;this.active=false;for(const controller of this.controllers)controller.abort();this.controllers.clear();this.requests.clear();this.validators.clear();this.rangeTotals.clear();this.headers={};this.ownedBlobs.clear();this.allowed.clear();this.source={url:''};}
  get diagnostics(){return {active:this.active,pendingRequests:this.controllers.size,redirects:'rejected',credentials:this.source.credentials??'same-origin',allowedOriginCount:this.allowed.size};}
}
