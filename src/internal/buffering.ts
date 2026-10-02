// SPDX-License-Identifier: Apache-2.0
import type {BufferingOptions, BufferingPolicy} from '../types.js';
import {PlayerError} from './errors.js';
const MiB=1024*1024;
export function bufferingPolicy(input:BufferingOptions={}):BufferingPolicy {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new PlayerError('INVALID_ARGUMENT','Invalid buffering policy');
  for(const key of Object.keys(input))if(!['preload','profile','memoryBudget','aheadSeconds','behindSeconds'].includes(key))throw new PlayerError('INVALID_ARGUMENT','Unknown buffering option: '+key);
  const preload=input.preload??'auto',profile=input.profile??'balanced',memoryBudget=input.memoryBudget;
  if(!['none','metadata','auto'].includes(preload)||!['low-latency','balanced','resilient'].includes(profile))throw new PlayerError('INVALID_ARGUMENT','Invalid buffering intent');
  if(memoryBudget!==undefined&&(!Number.isSafeInteger(memoryBudget)||memoryBudget<8*MiB||memoryBudget>64*MiB))throw new PlayerError('INVALID_ARGUMENT','Buffering memoryBudget must be 8–64 MiB in bytes');
  for(const key of ['aheadSeconds','behindSeconds'] as const){const value=input[key];if(value!==undefined&&(!Number.isFinite(value)||value<0||value>120||(key==='aheadSeconds'&&value===0)))throw new PlayerError('INVALID_ARGUMENT','Buffering time targets must be at most 120 seconds; aheadSeconds must be positive');}
  return Object.freeze({preload,profile,...(input.aheadSeconds===undefined?{}:{aheadSeconds:input.aheadSeconds}),...(input.behindSeconds===undefined?{}:{behindSeconds:input.behindSeconds}),...(memoryBudget===undefined?{}:{memoryBudget})});
}
export {resolveBuffering,mpvBufferingOptions,shakaBufferingOptions} from './machine/buffering-policy.js';
