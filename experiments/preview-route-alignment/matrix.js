// SPDX-License-Identifier: Apache-2.0
import {runCase} from './experiment.js';
export const matrix=[
 ...['direct','remux','hybrid','software'].flatMap(path=>[false,true].map(remote=>({id:`${path}-${remote?'remote':'local'}-pthread`,path,remote,runtime:'off',productionBaseline:remote,lifecycle:true}))),
 ...['shaka-authored','shaka-generated'].map(path=>({id:path,path,remote:true,lifecycle:true,productionBaseline:true})),
 ...['jspi','asyncify'].flatMap(runtime=>['remux','hybrid','software'].flatMap(path=>[false,true].map(remote=>({id:`${path}-${remote?'remote':'local'}-${runtime}`,path,remote,runtime,lifecycle:true})))),
 {id:'direct-cross-origin',path:'direct',remote:true,crossOrigin:true,lifecycle:true},
 ...['remux','hybrid','software'].map(path=>({id:path+'-authenticated',path,remote:true,auth:true,lifecycle:true})),
];
export async function runMatrix(configs=matrix){
 window.batch=[];
 for(const config of configs){
  window.running=config.id;
  const result=await runCase(config);
  const response=await fetch('/receipt',{method:'POST',body:JSON.stringify(result)});if(!response.ok)throw Error('Receipt write failed');
  window.batch.push({id:config.id,status:result.status,failure:result.failure?.split('\n')[0],providerError:result.providerError,checks:result.checks,latencies:result.frames.map(f=>Math.round(f.latencyMs))});
 }
 window.running=null;return window.batch;
}
