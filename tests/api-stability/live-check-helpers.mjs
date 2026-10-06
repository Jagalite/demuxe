// SPDX-License-Identifier: Apache-2.0
export async function deadline(work,ms){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Live scenario deadline exceeded')),ms);})]);}finally{clearTimeout(timer);}}

export async function collectFailureDiagnostics(page,path,timeout=2000){
 const diagnostics={trace:null,diagnosticErrors:[]};
 try{diagnostics.trace=await deadline(page.evaluate(()=>globalThis.__liveBoundaryTrace),timeout);}catch(error){diagnostics.diagnosticErrors.push(String(error));}
 try{await deadline(page.screenshot({path,timeout}),timeout);}catch(error){diagnostics.diagnosticErrors.push(String(error));}
 return diagnostics;
}

export function assertExactBytes(actual,expected,length,message){
 if(actual.length!==length||!actual.every((value,index)=>value===expected[index]))throw Error(message);
}

export const liveEvidenceInputs=[
 'tests/api-stability/live-runtime.mjs','scripts/serve.mjs',
 'fixtures/example.mp4','tests/api-stability/live-boundaries.mjs',
 'tests/api-stability/live-check-helpers.mjs','tests/api-stability/live-network-scenarios.mjs',
 'tests/api-stability/live-fault-server.mjs','web/range-reader.js','web/generated/sources.js',
 'tests/api-stability/live-boundary-scenarios.mjs','web/generated/preview/providers.js',
 'web/generated/internal/machine/async-policy.js','web/generated/internal/machine/preview.js'
];

export function validLiveReceipt(data){
 const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 return !!data&&data.passed===true&&data.negativeControl===false
  &&['chromium','firefox','webkit'].includes(data.family)
  &&typeof data.browser==='string'&&data.browser.length>0
  &&typeof data.revision==='string'&&/^[a-f0-9]{40}$/.test(data.revision)
  &&Array.isArray(data.checks)&&data.checks.length>0
  &&data.checks.every(row=>row&&typeof row.scenario==='string'&&row.passed===true&&Array.isArray(row.errors)&&row.errors.length===0)
  &&new Set(data.checks.map(row=>row.scenario)).size===data.checks.length
  &&!!data.hashes&&liveEvidenceInputs.every(path=>digest(data.hashes[path]))
  &&Object.values(data.hashes).every(digest)
  &&liveEvidenceInputs.filter(path=>path.startsWith('web/')).every(path=>data.servedHashes?.[path]===data.hashes[path]);
}
