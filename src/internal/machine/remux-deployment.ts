// SPDX-License-Identifier: Apache-2.0
import {compareProviderPreferences,type ProviderPreferencesData} from './provider-runtime.js';
import type {RemuxRuntimePolicy} from '../../types.js';
export type RemuxRuntime='pthread'|'jspi'|'asyncify';
export type RemuxSelection=Readonly<{policy:RemuxRuntimePolicy;runtime:RemuxRuntime;isolated:boolean;jspi:boolean;providerPreferences?:ProviderPreferencesData}>;
export type RemuxDeployment=Readonly<{revision:number;selection:RemuxSelection|null}>;
export type RemuxDeploymentChange=Readonly<{kind:'configure';selection:RemuxSelection}>|Readonly<{kind:'resolved';revision:number;available:Readonly<Partial<Record<RemuxRuntime,boolean>>>;providers?:readonly string[]}>;
export function initialRemuxDeployment(selection:RemuxSelection|null=null):RemuxDeployment{return Object.freeze({revision:0,selection:selection?captureSelection(selection):null});}
/** Explicit policies are pinned and do not invoke deployment probes. */
export function remuxDeploymentCandidates(selection:RemuxSelection,providers?:readonly string[]):readonly RemuxRuntime[]{return Object.freeze(!['auto','on'].includes(selection.policy)?[]:((selection.policy==='auto'&&selection.isolated?['pthread','jspi','asyncify']:['jspi','asyncify']) as RemuxRuntime[]).filter(runtime=>runtime!=='jspi'||selection.jspi).sort((a,b)=>compareProviderPreferences(runtimeAssignments(a,selection.providerPreferences??[],providers),runtimeAssignments(b,selection.providerPreferences??[],providers),selection.providerPreferences??[])));}
export function resolveRemuxDeployment(selection:RemuxSelection,available:Readonly<Partial<Record<RemuxRuntime,boolean>>>,providers?:readonly string[]):RemuxSelection{
 const runtime=remuxDeploymentCandidates(selection,providers).find(runtime=>available[runtime])??selection.runtime;
 return Object.freeze({...selection,runtime});
}
export function transitionRemuxDeployment(state:RemuxDeployment,change:RemuxDeploymentChange):RemuxDeployment{
 if(state.revision>=Number.MAX_SAFE_INTEGER)return state;
 if(change.kind==='configure')return state.selection?state:Object.freeze({revision:state.revision+1,selection:captureSelection(change.selection)});
 if(!state.selection||change.revision!==state.revision)return state;
 return Object.freeze({revision:state.revision+1,selection:resolveRemuxDeployment(state.selection,change.available,change.providers)});
}

function runtimeAssignments(runtime:RemuxRuntime,preferences:ProviderPreferencesData,providers?:readonly string[]){
 const suffix=runtime==='pthread'?'':'-'+runtime;
 const choices=[
  {capability:'media.prepare.file',ids:['ffmpeg-file-preparation'+suffix,...(runtime==='pthread'?[]:['truehd-mlp','dts-hd','ac3-eac3'].map(profile=>'ffmpeg-'+profile+suffix))]},
  {capability:'media.play.complete',ids:runtime==='pthread'?['mpv-hybrid','mpv-software']:['mpv-playback-'+runtime]},
 ];
 return choices.flatMap(({capability,ids})=>{
  const preferred=preferences.find(rule=>rule.capability===capability)?.providers??[];
  const eligible=ids.filter(id=>!providers||providers.includes(id));
  const rank=(id:string)=>{const index=preferred.indexOf(id);return index<0?preferred.length:index;};
  const providerId=eligible.sort((a,b)=>rank(a)-rank(b))[0];
  return providerId?[{providerId,requirements:[{capability}]}]:[];
 });
}

function captureSelection(selection:RemuxSelection):RemuxSelection{
 return Object.freeze({...selection,...(selection.providerPreferences?{providerPreferences:Object.freeze(selection.providerPreferences.map(rule=>Object.freeze({capability:rule.capability,providers:Object.freeze([...rule.providers])})))}:{})});
}
