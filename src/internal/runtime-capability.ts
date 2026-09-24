// SPDX-License-Identifier: Apache-2.0
import {PlayerError, playerError} from './errors.js';

export type CapabilityEvidence = {
  apiHint?: string; prepared?:boolean; completedAtEOF?:boolean; outputVerified?:boolean; audioEvidence?:string; timing?:Record<string,number>; metadata?: boolean; sourceBufferCreated?: boolean;
  initAccepted?: boolean; mediaAccepted?: boolean; decoderOutput?: boolean;
  videoPresented?: boolean; audioProgress?: boolean; audioDecoded?:boolean; audioDecoderConfigured?:boolean; playbackReady?: boolean;
};
export type CapabilityRecord = {
  planId: string; sourceIdentity: string; eligible: boolean;
  state: 'untested' | 'probing' | 'prepared' | 'verified' | 'failed'; reason?: string;
  failureKind?: 'compatibility' | 'terminal'; evidence?: CapabilityEvidence;
  previouslyVerified?: boolean;
};

/** Player-local, bounded evidence. No URL/credentials, persistent fingerprint or
 * cross-source acceptance shortcut. Every candidate must validate startup again. */
export class RuntimeCapabilities {
  private identities = new WeakMap<object,string>();
  private serial = 0;
  private records: CapabilityRecord[] = [];
  private verified = new Map<string,CapabilityEvidence>();
  begin(source: object, plans: Array<{id:string;eligible:boolean;reason?:string}>) {
    let id=this.identities.get(source);
    if(!id){id=`source-${++this.serial}`;this.identities.set(source,id);}
    this.records=plans.map(p=>({planId:p.id,sourceIdentity:id!,eligible:p.eligible,state:'untested',reason:p.reason,
      previouslyVerified:this.verified.has(`${id}:${p.id}`)}));
  }
  update(planId:string, state:CapabilityRecord['state'], evidence?:CapabilityEvidence, reason?:string, failureKind?:CapabilityRecord['failureKind']) {
    const record=this.records.find(r=>r.planId===planId);
    if(!record?.eligible)return;
    Object.assign(record,{state,evidence:evidence?{...evidence}:record.evidence,reason,failureKind});
    const key=`${record.sourceIdentity}:${planId}`;
    if(state==='verified'){
      this.verified.delete(key);this.verified.set(key,{...evidence});
      if(this.verified.size>32)this.verified.delete(this.verified.keys().next().value!);
    }else if(state==='failed')this.verified.delete(key);
  }
  admission(plans:Array<{id:string;eligible:boolean;reason?:string}>) {
    for(const plan of plans){const r=this.records.find(r=>r.planId===plan.id);if(r&&r.state==='untested'){r.eligible=plan.eligible;r.reason=plan.reason;}}
  }
  clear(){this.records=[];this.verified.clear();this.identities=new WeakMap();}
  snapshot():CapabilityRecord[] {return this.records.map(r=>({...r,evidence:r.evidence?{...r.evidence}:undefined}));}
}

/** Only positive compatibility failures permit another pipeline. Unknown errors,
 * missing assets, authorization, identity, network and cancellation stay terminal. */
export function compatibilityFailure(error:unknown):boolean {
  // Legacy decoder-worker diagnostics contain the words "initialization data".
  // That source configuration report is not an asset initialization failure.
  // Match only this existing worker boundary; explicit typed terminal errors win.
  if(!(error instanceof PlayerError)&&error instanceof Error&&/^Hybrid browser decoder: Error: Unsupported browser configuration \([^\n]+\)\.\nCodec string:/.test(error.message)&&error.message.includes('WebCodecs reported supported=false')&&!/Source transport:|integrity|identity|HTTP |received \d{3}/i.test(error.message))return true;
  // The device-local service owns only reconstruction. A diagnosed failure in
  // that service permits the existing route policy to reopen in Software.
  if(!(error instanceof PlayerError)&&error instanceof Error&&/^Hybrid WebGPU decoder: /.test(error.message)&&!/Source transport:|integrity|identity|HTTP |received \d{3}/i.test(error.message))return true;
  const code=playerError(error).code;
  if(['ABORTED','AUTOPLAY_BLOCKED','SOURCE_CHANGED','SOURCE_PERMISSION','NETWORK_TIMEOUT','ASSET_LOAD_FAILED','INVALID_ARGUMENT','ISOLATION_REQUIRED'].includes(code))return false;
  if(/Source transport:|integrity|identity|network|HTTP |received \d{3}/i.test(String(error)))return false;
  if(code==='UNSUPPORTED_TIMELINE')return true;
  if(error instanceof PlayerError)return ['UNSUPPORTED_MEDIA','DECODE_FAILED','UNSUPPORTED_FEATURE'].includes(code);
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

export class StartupEvidenceTimeout extends Error { readonly evidenceTimeout=true; constructor(stage:string){super(`Native ${stage} evidence timed out`);this.name='StartupEvidenceTimeout';} }
/** Missing readiness is inconclusive, not proof of codec incompatibility. */
export class NativeLoadTimeout extends StartupEvidenceTimeout {
  constructor(event:'loadeddata'|'loadedmetadata',readonly budgetMs=25000) {super(event);this.name='NativeLoadTimeout';this.message=`Native ${event} timed out`;}
}
export function evidenceInterrupted(error:unknown):boolean {return error instanceof StartupEvidenceTimeout||['ABORTED','AUTOPLAY_BLOCKED','NETWORK_TIMEOUT'].includes(playerError(error).code);}
