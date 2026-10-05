// SPDX-License-Identifier: Apache-2.0
// Audit probes: execute current source methods with synthetic physical boundaries.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source=ts.createSourceFile('shaka-backend.ts',fs.readFileSync('src/internal/shaka-backend.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='ShakaBackend');
const method=cls.members.find(n=>n.name?.getText(source)==='previewFrame').getText(source);
const emitted=ts.transpileModule(`class Probe {${method}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const Probe=new Function('shakaPreviewChoice','rasterizePreview',emitted+';return Probe;')(
  ()=>({id:1,stream:0,createIndex:false}),
  async()=>({blob:new Blob(['image']),width:1,height:1})
);
async function run(uris){
  const calls=[];let disposed=0;
  const policy={filter(){},destroy(){disposed++;},plugin(uri){calls.push(uri);return {promise:uri==='b'?Promise.resolve({data:new ArrayBuffer(1)}):Promise.reject(Error('a failed')),abort:async()=>{}};}};
  const p=new Probe();Object.assign(p,{
    stopped:false,control:{epoch:1,source:{format:'dash'}},
    player:{getManifest:()=>({imageStreams:[{id:1,segmentIndex:{},mimeType:'image/jpeg'}]}),isDynamic:()=>false,getImageTracks:()=>[{id:1,width:1}],getThumbnails:async()=>({uris,startByte:0,endByte:null})},
    policy:{forkForPreview:()=>policy},runtime:{net:{NetworkingEngine:{RequestType:{SEGMENT:1},defaultRetryParameters:()=>({}),makeRequest:()=>({headers:{}})}}}
  });
  let outcome;try{await p.previewFrame({signal:new AbortController().signal,width:1,time:0});outcome='success';}catch(e){outcome=e.message;}
  assert.equal(disposed,1);return {uris,calls,outcome};
}
const control=await run(['a','b']);
const duplicate=await run(['a','b','a']);
assert.deepEqual(control.calls,['a','b']);assert.equal(control.outcome,'success');
assert.deepEqual(duplicate.calls,['a']);assert.equal(duplicate.outcome,'a failed');
console.log(JSON.stringify({scope:'Current TS method; synthetic Shaka/network/rasterizer; no browser',control,duplicate,confirmed:'A URI equal to the last URI ends fallback early even when intermediate candidates remain.'},null,2));
