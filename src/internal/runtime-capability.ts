// SPDX-License-Identifier: Apache-2.0
import {PlayerError, playerError,isPlayerError} from './errors.js';

import {createCapabilities,transitionCapabilities,selectCapabilities,capabilityUpdateEligible,type CapabilityEvidence,type CapabilityRecord} from './machine/routing.js';
export type {CapabilityEvidence,CapabilityRecord} from './machine/routing.js';

/** Player-local object identities are shell resources; retained evidence and
 * admission transitions belong to the immutable routing authority. */
export class RuntimeCapabilities {
  private identities=new WeakMap<object,string>();
  private serial=0;
  private state=createCapabilities();
  begin(source:object,plans:ReadonlyArray<{id:string;eligible:boolean;reason?:string}>){
    let id=this.identities.get(source);
    if(!id){id=`source-${++this.serial}`;this.identities.set(source,id);}
    this.state=transitionCapabilities(this.state,{kind:'begin',sourceIdentity:id,plans:plans.map(plan=>({id:plan.id,eligible:plan.eligible,reason:plan.reason}))});
  }
  update(planId:string,state:CapabilityRecord['state'],evidence?:CapabilityEvidence,reason?:string,failureKind?:CapabilityRecord['failureKind']){
    const previous=this.state;if(!capabilityUpdateEligible(previous,planId))return;
    const captured=evidence?captureEvidence(evidence):undefined;
    if(this.state!==previous)return;
    this.state=transitionCapabilities(previous,{kind:'update',planId,state,evidence:captured,reason,failureKind});
  }
  admission(plans:ReadonlyArray<{id:string;eligible:boolean;reason?:string}>){this.state=transitionCapabilities(this.state,{kind:'admission',plans:plans.map(plan=>({id:plan.id,eligible:plan.eligible,reason:plan.reason}))});}
  clear(){this.state=createCapabilities();this.identities=new WeakMap();}
  snapshot():CapabilityRecord[]{return selectCapabilities(this.state);}
}

/** The supported evidence schema contains only scalar observations and two
 * scalar maps. Normalize the boundary so custom backends cannot retain handles
 * or callbacks in routing state through undeclared diagnostic properties. */
function captureEvidence(value:CapabilityEvidence):CapabilityEvidence {
  const strings=new Set(['audioEvidenceStrength','apiHint','audioEvidence']);
  const booleans=new Set(['prepared','completedAtEOF','outputVerified','metadata','sourceBufferCreated','initAccepted','mediaAccepted','decoderOutput','videoPresented','audioProgress','audioDecoded','audioDecoderConfigured','playbackReady']);
  const result:Record<string,unknown>={};
  for(const [key,item] of Object.entries(value)){
    if((strings.has(key)&&(typeof item==='string'||item===undefined))||(booleans.has(key)&&(typeof item==='boolean'||item===undefined)))result[key]=item;
    else if(key==='timing')result[key]=item&&typeof item==='object'?Object.fromEntries(Object.entries(item).filter(([,number])=>typeof number==='number')):undefined;
    else if(key==='audioObservation')result[key]=item&&typeof item==='object'?Object.fromEntries(Object.entries(item).filter(([name,datum])=>['initialBytes','decodedBytes','delta'].includes(name)?typeof datum==='number'||datum===undefined:['present','enabledTrack','clockAdvanced'].includes(name)&&(typeof datum==='boolean'||datum===undefined))):undefined;
  }
  return result as CapabilityEvidence;
}

/** Only positive compatibility failures permit another pipeline. Unknown errors,
 * missing assets, authorization, identity, network and cancellation stay terminal. */
export function compatibilityFailure(error:unknown):boolean {
  // Legacy decoder-worker diagnostics contain the words "initialization data".
  // That source configuration report is not an asset initialization failure.
  // Match only this existing worker boundary; explicit typed terminal errors win.
  if(!isPlayerError(error)&&error instanceof Error&&/^Hybrid browser decoder: Error: Unsupported browser configuration \([^\n]+\)\.\nCodec string:/.test(error.message)&&error.message.includes('WebCodecs reported supported=false')&&!/Source transport:|integrity|identity|HTTP |received \d{3}/i.test(error.message))return true;
  // The device-local service owns only reconstruction. A diagnosed failure in
  // that service permits the existing route policy to reopen in Software.
  if(!isPlayerError(error)&&error instanceof Error&&/^Hybrid WebGPU decoder: /.test(error.message)&&!/Source transport:|integrity|identity|HTTP |received \d{3}/i.test(error.message))return true;
  // The remux worker uses "initialization" for an in-band AVC parameter-set
  // change. Recognize only this exact media rejection before the generic asset
  // classifier, which uses that word for module and Wasm startup failures.
  if(!isPlayerError(error)&&error instanceof Error&&/^(?:Error: )*FFmpeg error -1094995529: Selected AVC configuration changed; new initialization required$/.test(error.message.split('\n')[0]))return true;
  const code=playerError(error).code;
  if(['DEPLOYMENT_UNAVAILABLE','ABORTED','AUTOPLAY_BLOCKED','SOURCE_CHANGED','SOURCE_PERMISSION','NETWORK_TIMEOUT','ASSET_LOAD_FAILED','INVALID_ARGUMENT','ISOLATION_REQUIRED'].includes(code))return false;
  if(/Source transport:|integrity|identity|network|HTTP |received \d{3}/i.test(String(error)))return false;
  if(code==='UNSUPPORTED_TIMELINE')return true;
  if(isPlayerError(error))return ['UNSUPPORTED_MEDIA','DECODE_FAILED','UNSUPPORTED_FEATURE'].includes(code);
  // Existing preparation guards reject this pipeline, not the source. Keep the
  // allowlist exact so unrelated resource, transport and unknown errors stay terminal.
  const message=(error instanceof Error?error.message:String(error)).split('\n')[0].replace(/^(?:Error: )+/,'');
  // Some HEVC files carry parameter sets in-band. The remux construction
  // guard cannot package them, but mpv can still decode the original source.
  if(/^FFmpeg error -1094995529: Missing HEVC parameter sets$/.test(message))return true;
  // The retained renderer keys frames by PTS. Repeated timestamps are a
  // limitation of that renderer, not proof the software decoder cannot play.
  if(message==='Duplicate retained frame timestamp')return true;
  if(/^FFmpeg error -\d+: TS timestamp repair requires AVC with optional AAC audio$/.test(message))return true;
  if(/^(?:Error: )*Subtitle (?:bitmap budget exceeded|composition failed)$/.test(message))return true;
  if(['Remux random-access interval exceeds fragment production budget',
    'Remux timeline gap exceeds forward buffer budget',
    'Adapted track timelines cannot progress within the preparation budget; use Hybrid'].includes(message))return true;
  return /unsupported|no browser bridge|no .*packet contract|no common .*packaging|MSE SourceBuffer|decoder.*(?:fail|inactive)|decode failure|did not present|Cannot preserve.*track|audio track selection is not supported|unrecognized file format|failed to recognize file format/i.test(String(error));
}

export function nativeMediaError(error:MediaError|null):Error {
  const message=`Native media operation failed (${error?.code??'unknown'}): ${error?.message??'No media error details'}`;
  if(error?.code===3||error?.code===4)return new PlayerError('UNSUPPORTED_MEDIA',message);
  if(error?.code===1)return new PlayerError('ABORTED',message);
  // MediaError cannot distinguish HTTP authorization from other network failures.
  // Retain it as terminal transport uncertainty rather than guessing a codec.
  return new Error(`Source transport: ${message}`);
}

export class StartupEvidenceTimeout extends Error { readonly evidenceTimeout=true; constructor(readonly stage:string){super(`Native ${stage} evidence timed out`);this.name='StartupEvidenceTimeout';} }
/** Missing readiness is inconclusive, not proof of codec incompatibility. */
export class NativeLoadTimeout extends StartupEvidenceTimeout {
  constructor(event:'loadeddata'|'loadedmetadata',readonly budgetMs=25000) {super(event);this.name='NativeLoadTimeout';this.message=`Native ${event} timed out`;}
}
export function evidenceInterrupted(error:unknown):boolean {return error instanceof StartupEvidenceTimeout||['ABORTED','AUTOPLAY_BLOCKED','NETWORK_TIMEOUT'].includes(playerError(error).code);}
