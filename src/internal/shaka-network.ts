// SPDX-License-Identifier: Apache-2.0
import type Shaka from 'shaka-player';
import type {RemoteSource} from '../types.js';
import {PlayerError,isPlayerError} from './errors.js';
import {initialShakaNetwork,shakaNetworkRequest,shakaNetworkCurrent,beginShakaNetworkRequest,setShakaNetworkResource,cancelShakaNetworkRequest,expireShakaNetworkRequest,cleanupShakaNetworkRequest,finishShakaNetworkRequest,failShakaNetwork,retireShakaNetwork,shakaNetworkAdmission,receiveShakaNetworkStatus,finishShakaNetworkRefresh,observeShakaNetworkValidator,beginShakaNetworkBody,appendShakaNetworkBody,completeShakaNetworkBody,shakaNetworkResourceIDs,type ShakaNetworkState,type ShakaNetworkFailure,type ShakaNetworkDecision} from './machine/shaka-network.js';

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
/** Per-session Shaka transport. The immutable owner admits requests and evidence;
 * this shell owns browser handles and private URL/header identity registries.
 * Shaka retains retries, connection/stall deadlines and bandwidth scheduling. */
export class ShakaNetworkPolicy {
  private control:ShakaNetworkState;
  private terminal?:{id:number;error:PlayerError};
  private controllers=new Map<number,AbortController>();
  private requests=new Map<Shaka.extern.Request,Set<number>>();
  private resources=new Map<string,number>();
  private resourceSerial=0;
  private allowed:Set<string>;
  private headers:Record<string,string>;
  private ownedBlobs=new Set<string>();
  constructor(private source:RemoteSource,private runtime:typeof Shaka,private fetcher:typeof fetch=globalThis.fetch.bind(globalThis),private preview=false){
    this.control=initialShakaNetwork(!!source.immutable,preview);
    const root=new URL(source.url,globalThis.location?.href);this.allowed=new Set(source.allowedOrigins??[root.origin]);
    this.headers={...source.headers};this.checkHeaders(this.headers);this.authorize(root.href);installTransport(runtime);
  }
  get terminalError(){return this.terminal?.id===this.control.terminal?this.terminal.error:undefined;}
  private checkActive(){if(!this.control.active)throw new PlayerError('ABORTED','Streaming source was retired');}
  private checkRequest(id:number){this.checkActive();if(!shakaNetworkCurrent(this.control,id))throw new DOMException('Streaming request cancelled','AbortError');}
  private fail(error:PlayerError){this.control=failShakaNetwork(this.control);this.terminal={id:this.control.terminal,error};return error;}
  private failure(value:ShakaNetworkFailure){throw this.fail(new PlayerError(value.code,value.message));}
  private accept(decision:ShakaNetworkDecision){this.control=decision.state;if(decision.failure)this.failure(decision.failure);return decision.accepted;}
  private admission(facts:Partial<Parameters<typeof shakaNetworkAdmission>[0]>){const failed=shakaNetworkAdmission({license:false,drm:false,rangeOverride:false,ownedBlob:false,http:true,userinfo:false,allowed:true,...facts});if(failed)this.failure(failed);}
  private checkHeaders(headers:Record<string,string>){this.admission({rangeOverride:Object.keys(headers).some(name=>name.toLowerCase()==='range')});}
  authorize(uri:string):string {
    this.checkActive();const url=new URL(uri,this.source.url);
    this.admission({ownedBlob:this.ownedBlobs.has(url.href),http:['https:','http:'].includes(url.protocol),userinfo:!!(url.username||url.password),allowed:this.allowed.has(url.origin)});
    return url.href;
  }
  ownBlob(uri:string){this.checkActive();this.ownedBlobs.add(uri);}
  disownBlob(uri:string){this.ownedBlobs.delete(uri);}
  private resource(uri:string){let id=this.resources.get(uri);if(id===undefined){id=++this.resourceSerial;this.resources.set(uri,id);}return id;}
  private pruneResources(){const retained=new Set(shakaNetworkResourceIDs(this.control));for(const [uri,id] of this.resources)if(!retained.has(id))this.resources.delete(uri);}
  readonly filter:Shaka.extern.RequestFilter=(type,request)=>{
    this.checkActive();this.admission({license:type===this.runtime.net.NetworkingEngine.RequestType.LICENSE,drm:!!request.drmInfo});
    const uris=request.uris.map(uri=>this.authorize(uri));this.checkActive();request.uris=uris;this.checkActive();
    owners.set(request,this);
  };
  readonly plugin:Shaka.extern.SchemePlugin=(resource,request,type,progress,received)=>{
    const timeout=request.retryParameters.timeout,started=performance.now(),kind=type===this.runtime.net.NetworkingEngine.RequestType.MANIFEST?'manifest':type===this.runtime.net.NetworkingEngine.RequestType.SEGMENT?'segment':'other';
    const admitted=beginShakaNetworkRequest(this.control,kind,timeout,started);this.control=admitted.state;const id=admitted.id;
    let controller:AbortController|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,timer:{handle?:ReturnType<typeof setTimeout>}|undefined;
    const E=this.runtime.util.Error;
    const check=()=>{if(id===undefined){this.checkActive();throw new DOMException('Streaming request cancelled','AbortError');}this.checkRequest(id);};
    const arm=(delay:number)=>{
      const registration:{handle?:ReturnType<typeof setTimeout>}={};timer=registration;
      const acquired=setTimeout(()=>{
        if(timer!==registration)return;timer=undefined;
        if(id===undefined)return;
        const now=performance.now(),decision=expireShakaNetworkRequest(this.control,id,now);this.control=decision.state;
        if(!decision.accepted)return;
        if(decision.remaining!==undefined){try{arm(decision.remaining);}catch{this.accept(cancelShakaNetworkRequest(this.control,id));controller?.abort();}}else controller?.abort();
      },delay);
      registration.handle=acquired;
      if(timer!==registration||id===undefined||!shakaNetworkCurrent(this.control,id)){clearTimeout(acquired);check();}
    };
    const promise=(async()=>{
      if(admitted.failure)this.failure(admitted.failure);check();const acquired=new AbortController();controller=acquired;
      if(id===undefined||!shakaNetworkCurrent(this.control,id)){acquired.abort();check();}
      this.controllers.set(id!,acquired);const pending=this.requests.get(request)??new Set<number>();pending.add(id!);this.requests.set(request,pending);
      if(timeout)arm(timeout);
      let uri=this.authorize(resource),response:Response|undefined;
      for(;;){
        check();this.control=setShakaNetworkResource(this.control,id!,this.resource(uri));
        const headers=new Headers(request.headers);for(const [name,value] of Object.entries(this.headers))headers.set(name,value);
        check();const fetched=await this.fetcher(uri,{method:request.method,headers,body:request.body as BodyInit|null,signal:acquired.signal,credentials:this.source.credentials??'same-origin',redirect:'error',priority:this.preview?'low':'auto'});
        if(!shakaNetworkCurrent(this.control,id!)){try{await fetched.body?.cancel();}catch{}check();}response=fetched;
        if(response.status!==401&&response.status!==403)break;
        await response.body?.cancel();check();
        const status=receiveShakaNetworkStatus(this.control,id!,response.status,!!this.source.refreshAuthorization);this.accept(status);check();
        if(!status.refresh)break;
        let update:Awaited<ReturnType<NonNullable<RemoteSource['refreshAuthorization']>>>,cancel:()=>void=()=>{};
        try{
          const source=this.source,refresh=source.refreshAuthorization;check();
          update=await Promise.race([refresh!.call(source,{url:uri}),new Promise<never>((_,reject)=>{cancel=()=>reject(new PlayerError('ABORTED','Streaming authorization refresh cancelled'));if(acquired.signal.aborted)cancel();else acquired.signal.addEventListener('abort',cancel,{once:true});})]);
        }catch(error){this.checkActive();throw this.fail(isPlayerError(error)?error:new PlayerError('SOURCE_PERMISSION','Streaming authorization refresh failed'));}
        finally{acquired.signal.removeEventListener('abort',cancel);}
        check();
        if(update.headers){const headers={...update.headers};check();this.checkHeaders(headers);this.headers={...this.headers,...headers};}
        if(update.url)uri=this.authorize(update.url);check();if(!this.accept(finishShakaNetworkRefresh(this.control,id!)))check();
      }
      reader=response!.body?.getReader();check();
      if(!response!.ok)throw new E(E.Severity.RECOVERABLE,E.Category.NETWORK,E.Code.BAD_HTTP_STATUS,uri,response!.status,'',{},type);
      if(response!.url)this.authorize(response!.url);check();
      this.accept(observeShakaNetworkValidator(this.control,id!,response!.headers.get('etag'),this.ownedBlobs.has(uri)));this.pruneResources();
      const headers:Record<string,string>={};response!.headers.forEach((value,key)=>headers[key]=value);check();received(headers);check();
      const range=new Headers(request.headers).get('range');
      const bodyFacts={range,status:response!.status,encoding:headers['content-encoding'],contentRange:headers['content-range'],contentLength:headers['content-length'],now:performance.now()};check();
      this.accept(beginShakaNetworkBody(this.control,id!,bodyFacts));check();
      const chunks:Uint8Array[]=[];
      if(reader)while(true){
        const value=await reader.read();check();if(value.done)break;
        const chunk=value.value,size=chunk.byteLength,now=performance.now();check();
        const decision=appendShakaNetworkBody(this.control,id!,size,now);this.accept(decision);check();chunks.push(chunk);
        const observed=decision.progress!;progress(observed.elapsed,observed.bytes,observed.remaining);check();
        if(request.streamDataCallback&&!range){const callback=request.streamDataCallback;check();await callback.call(request,chunk);check();}
      }
      const bytes=shakaNetworkRequest(this.control,id!)!.bytes,data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
      const decision=completeShakaNetworkBody(this.control,id!);this.accept(decision);check();this.pruneResources();
      const result=decision.slice?data.slice(decision.slice.start,decision.slice.end).buffer:data.buffer;
      if(decision.streamRange&&request.streamDataCallback){const callback=request.streamDataCallback;check();await callback.call(request,result);check();}
      return {uri,originalUri:uri,data:result,headers,status:response!.status,timeMs:performance.now()-started,originalRequest:request};
    })().catch(error=>{
      if(!this.control.active)throw new E(E.Severity.CRITICAL,E.Category.NETWORK,E.Code.HTTP_ERROR,'Demuxe streaming source retired');
      if(isPlayerError(error)){if(error.code!=='ABORTED')this.fail(error);throw new E(E.Severity.CRITICAL,E.Category.NETWORK,E.Code.HTTP_ERROR,'[authorized resource]',error);}
      if(controller?.signal.aborted){const timedOut=id!==undefined&&shakaNetworkRequest(this.control,id)?.cancelled==='timeout';throw new E(E.Severity.RECOVERABLE,E.Category.NETWORK,timedOut?E.Code.TIMEOUT:E.Code.OPERATION_ABORTED);}
      if(error instanceof E)throw error;
      throw new E(E.Severity.RECOVERABLE,E.Category.NETWORK,E.Code.HTTP_ERROR,'[authorized resource]',error);
    }).finally(async()=>{
      // Retire forward authority before cleanup effects, but keep the request
      // counted until the captured physical reader has released its resources.
      if(id!==undefined)this.control=cleanupShakaNetworkRequest(this.control,id);
      const pending=timer;timer=undefined;try{clearTimeout(pending?.handle);}catch{}
      try{await reader?.cancel();}catch{}finally{
        try{reader?.releaseLock();}catch{}
        if(id!==undefined){this.control=finishShakaNetworkRequest(this.control,id);this.controllers.delete(id);const owned=this.requests.get(request);owned?.delete(id);if(owned&&!owned.size){if(owners.get(request)===this)owners.delete(request);this.requests.delete(request);}this.pruneResources();}
      }
    });
    return new this.runtime.util.AbortableOperation(promise,async()=>{if(id!==undefined&&this.accept(cancelShakaNetworkRequest(this.control,id)))controller?.abort();});
  };
  /** Preview copies current credentials; it cannot renew playback authorization. */
  forkForPreview(){this.checkActive();const policy=new ShakaNetworkPolicy({...this.source,headers:{...this.headers},refreshAuthorization:undefined},this.runtime,this.fetcher,true);for(const uri of this.ownedBlobs)policy.ownBlob(uri);return policy;}
  destroy(){
    if(!this.control.active)return;this.control=retireShakaNetwork(this.control);
    const controllers=[...this.controllers.values()];this.controllers.clear();this.requests.clear();this.resources.clear();this.headers={};this.ownedBlobs.clear();this.allowed.clear();this.source={url:''};
    // Keep weak request associations after retirement: a retry whose scheme was
    // selected before its filter must never fall through to unowned fetch.
    for(const controller of controllers)try{controller.abort();}catch{}
  }
  get diagnostics(){return {active:this.control.active,pendingRequests:this.control.requests.length,redirects:'rejected',credentials:this.source.credentials??'same-origin',allowedOriginCount:this.allowed.size};}
}
