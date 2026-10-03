// SPDX-License-Identifier: Apache-2.0
import type {PlayerOptions,RemuxRuntimePolicy} from '../types.js';
import {PlayerError} from './errors.js';
import {remuxDeploymentCandidates,resolveRemuxDeployment,type RemuxSelection,type RemuxRuntime} from './machine/remux-deployment.js';

export function selectRemuxRuntime(options:Pick<PlayerOptions,'remuxRuntime'|'experimentalRemuxRuntime'>,
  capabilities={isolated:globalThis.crossOriginIsolated===true,jspi:typeof WebAssembly!=='undefined'&&
    typeof (WebAssembly as unknown as {Suspending?:unknown}).Suspending==='function'&&
    typeof (WebAssembly as unknown as {promising?:unknown}).promising==='function'}):RemuxSelection {
  const legacy=options.experimentalRemuxRuntime;
  if(legacy!==undefined&&!['pthread','jspi','asyncify'].includes(legacy))throw new PlayerError('INVALID_ARGUMENT','Invalid experimental remux runtime');
  if(legacy!==undefined&&options.remuxRuntime!==undefined)throw new PlayerError('INVALID_ARGUMENT','Use remuxRuntime or experimentalRemuxRuntime, not both');
  if(options.remuxRuntime!==undefined&&!['on','off','auto','jspi','asyncify'].includes(options.remuxRuntime))throw new PlayerError('INVALID_ARGUMENT','remuxRuntime must be on, off, auto, jspi or asyncify');
  const policy:RemuxRuntimePolicy=options.remuxRuntime??(legacy==='pthread'?'off':legacy)??'auto';
  if(policy==='jspi'&&!capabilities.jspi)throw new PlayerError('UNSUPPORTED_FEATURE','Requested JSPI runtime is unavailable in this browser');
  const runtime:'pthread'|'jspi'|'asyncify'=policy==='off'||(policy==='auto'&&capabilities.isolated)?'pthread':
    policy==='jspi'||policy==='asyncify'?policy:capabilities.jspi?'jspi':'asyncify';
  return Object.freeze({policy,runtime,...capabilities});
}

/** Deployment filters runtime implementations, never playback-plan order.
 * Explicit policies remain pinned. Absence preserves the original choice so
 * normal plan rejection can report the missing provider requirement. */
export function deployedRemuxRuntime(selection:ReturnType<typeof selectRemuxRuntime>,available:(runtime:'pthread'|'jspi'|'asyncify')=>boolean){
 const facts:Partial<Record<RemuxRuntime,boolean>>={};
 for(const runtime of remuxDeploymentCandidates(selection)){facts[runtime]=available(runtime);if(facts[runtime])break;}
 return resolveRemuxDeployment(selection,facts);
}
