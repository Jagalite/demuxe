// SPDX-License-Identifier: Apache-2.0
import type {Probe} from './selection.js';
import type {BrowserMediaCapability} from './browser-media-capability.js';

export type DecodingQuery = {track:number;configuration:MediaDecodingConfiguration;container?:string;status:'answered'|'unavailable'|'timeout'|'error';supported?:boolean;smooth?:boolean;powerEfficient?:boolean;reason?:string;late?:boolean};
export type DecodingEvidence = {api:'decodingInfo';queries:DecodingQuery[];unqueriedTracks:number[];scope:'advisory';reason?:string};
type Decode=(configuration:MediaDecodingConfiguration)=>Promise<Pick<MediaCapabilitiesInfo,'supported'|'smooth'|'powerEfficient'>>;
/** Per-player, bounded cache of exact API inputs. No source outcomes are cached.
 * Predictions never prove output, change fidelity, or veto a working file route. */
export class MediaCapabilityQueries {
  private cache=new Map<string,Promise<Omit<DecodingQuery,'track'|'configuration'>>>();
  private tokens=new Map<string,symbol>();
  private lateAnswers=new Map<string,Omit<DecodingQuery,'track'|'configuration'>>();
  private evidence=new Map<string,DecodingEvidence>();
  private key(capability:BrowserMediaCapability,probe:Probe){return JSON.stringify([capability.api,capability.tracks,capability.queries,probe.tracks]);}
  cached(capability:BrowserMediaCapability,probe:Probe){return this.evidence.get(this.key(capability,probe));}
  constructor(private decode?:Decode,private timeoutMs=150,private onLateAnswer?:()=>void){}
  async inspect(capability:BrowserMediaCapability,probe:Probe):Promise<DecodingEvidence>{
    const result:DecodingEvidence={api:'decodingInfo',queries:[],unqueriedTracks:[],scope:'advisory'};
    const type=capability.api==='canPlayType'?'file':'media-source';
    const configurations:Array<{track:number;configuration:MediaDecodingConfiguration;container:string}>=[];
    const prepared=capability.api==='isTypeSupported';
    const rejectedContainers=new Set(capability.queries.filter(q=>q.result===false).map(q=>q.mime.split(';')[0]));
    for(const track of capability.tracks){
      const source=probe.tracks.find(t=>t.index===track.index);
      // Adaptation changes the encoding and may change rate/layout. Source bitrate
      // and codec parameters are not the output configuration.
      if(!source||track.adapted){result.unqueriedTracks.push(track.index);continue;}
      const matches=capability.queries.filter(q=>(track.codecString?q.mime.includes(`codecs="${track.codecString}"`):!q.mime.includes('codecs='))&&(!prepared||!rejectedContainers.has(q.mime.split(';')[0])));
      const alternatives=prepared?matches:matches.slice().sort((a,b)=>Number(b.result==='probably')-Number(a.result==='probably')).slice(0,1);
      let queried=false;
      for(const {mime} of alternatives){
        const configuration:MediaDecodingConfiguration={type};
        if(track.type==='audio'){
          configuration.audio={contentType:mime.replace(/^video\//,'audio/'),...(source.channels?{channels:String(source.channels)}:{}),...(source.sampleRate?{samplerate:source.sampleRate}:{}),...(source.bitrate?{bitrate:source.bitrate}:{})};
        }else if(track.type==='video'&&source.width&&source.height&&source.bitrate&&source.framerate){
          configuration.video={contentType:mime,width:source.width,height:source.height,bitrate:source.bitrate,framerate:source.framerate};
        }else continue;
        configurations.push({track:track.index,configuration,container:mime.split(';')[0]});queried=true;
      }
      if(!queried)result.unqueriedTracks.push(track.index);
    }
    result.queries=await Promise.all(configurations.map(async({track,configuration,container})=>{
      const key=JSON.stringify(configuration);let pending=this.cache.get(key);
      if(!pending){
        const token=Symbol();this.tokens.set(key,token);
        pending=this.query(configuration,answer=>{
          if(this.tokens.get(key)!==token)return;
          this.cache.set(key,Promise.resolve(answer));this.lateAnswers.set(key,answer);
          for(const [evidenceKey,evidence] of this.evidence){
            if(evidence.queries.some(q=>JSON.stringify(q.configuration)===key))this.evidence.set(evidenceKey,{...evidence,queries:evidence.queries.map(q=>JSON.stringify(q.configuration)===key?{...q,...answer}:q)});
          }
          this.onLateAnswer?.();
        });this.cache.set(key,pending);
        if(this.cache.size>128){const oldest=this.cache.keys().next().value!;this.cache.delete(oldest);this.tokens.delete(oldest);this.lateAnswers.delete(oldest);}
      }
      return {track,configuration,container,...await pending};
    }));
    // A track may answer late while another track is still pending. Publish the
    // latest evidence atomically, rather than overwriting it with a raced timeout.
    result.queries=result.queries.map(q=>({...q,...this.lateAnswers.get(JSON.stringify(q.configuration))}));
    if(result.unqueriedTracks.length)result.reason='Exact source/output metadata or viable packaging unavailable for some tracks; no adaptation parameters, frame rate or bitrate are guessed';
    this.evidence.set(this.key(capability,probe),result);
    if(this.evidence.size>128)this.evidence.delete(this.evidence.keys().next().value!);
    return result;
  }
  private async query(configuration:MediaDecodingConfiguration,onLate:(answer:Omit<DecodingQuery,'track'|'configuration'>)=>void):Promise<Omit<DecodingQuery,'track'|'configuration'>>{
    if(!this.decode)return {status:'unavailable',reason:'MediaCapabilities.decodingInfo is unavailable'};
    let timer:ReturnType<typeof setTimeout>|undefined,timedOut=false;
    try{return await Promise.race([
      Promise.resolve().then(()=>this.decode!(configuration)).then(info=>{const answer={status:'answered' as const,supported:info.supported,smooth:info.smooth,powerEfficient:info.powerEfficient,...(timedOut?{late:true}:{})};if(timedOut)onLate(answer);return answer;}),
      new Promise<{status:'timeout';reason:string}>(resolve=>{timer=setTimeout(()=>{timedOut=true;resolve({status:'timeout',reason:'MediaCapabilities query deadline exceeded'});},this.timeoutMs);})
    ]);}catch(error){return {status:'error',reason:String(error)};}
    finally{clearTimeout(timer);}
  }
}
