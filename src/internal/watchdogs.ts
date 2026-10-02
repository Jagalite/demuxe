// SPDX-License-Identifier: Apache-2.0
import {PlayerError} from './errors.js';
import type {WatchdogOptions,WatchdogPolicy} from '../types.js';
import {createNativeProgress,resetNativeProgress,sampleNativeProgress,type NativeProgressSample} from './machine/telemetry.js';
export type {NativeProgressSample};

export function watchdogPolicy(options:boolean|WatchdogOptions=true):WatchdogPolicy {
  if(typeof options!=='boolean'&&(!options||typeof options!=='object'||Array.isArray(options)))throw new PlayerError('INVALID_ARGUMENT','Invalid watchdog policy');
  const values:Record<string,unknown>=typeof options==='boolean'?{}:options;
  const keys=['nativeProgress','hybridDecoder','decoderOutput','selectiveAudio'] as const;
  for(const key of Object.keys(values))if(![...keys,'nativeProgressTimeoutMs'].includes(key))throw new PlayerError('INVALID_ARGUMENT','Unknown watchdog option: '+key);
  const policy={nativeProgress:options!==false,hybridDecoder:options!==false,decoderOutput:options!==false,selectiveAudio:options!==false,nativeProgressTimeoutMs:10000};
  for(const key of keys)if(values[key]!==undefined){if(typeof values[key]!=='boolean')throw new PlayerError('INVALID_ARGUMENT','Invalid watchdog option: '+key);policy[key]=values[key] as boolean;}
  if(values.nativeProgressTimeoutMs!==undefined){
    const value=values.nativeProgressTimeoutMs;
    if(typeof value!=='number'||!Number.isFinite(value)||value<1000||value>120000)throw new PlayerError('INVALID_ARGUMENT','Native progress timeout must be between 1000 and 120000 ms');
    policy.nativeProgressTimeoutMs=value;
  }
  return Object.freeze(policy);
}

/** Sampled observations, not per-frame callbacks. Ineligible periods never spend
 * a failure budget; timer suspension and media discontinuities start fresh. */
export class NativeProgressWatchdog {
  private state=createNativeProgress();
  reset(){this.state=resetNativeProgress(this.state);}
  sample(now:number,value:NativeProgressSample,timeoutMs:number):'clock'|'video'|undefined {
    const result=sampleNativeProgress(this.state,now,value,timeoutMs);this.state=result.state;return result.stalled;
  }
}
