// SPDX-License-Identifier: Apache-2.0
// Exact Wasm packet remux characterization with a synthetic local byte provider.
import {Worker} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [modulePath,fixture]=process.argv.slice(2).map(x=>path.resolve(x));
const {default:createRemux}=await import(pathToFileURL(modulePath));
const source=await readFile(fixture),mailbox=new SharedArrayBuffer(64+262144);
const worker=new Worker(`const {workerData,parentPort}=require('node:worker_threads');const {mailbox,source}=workerData;const h=new Int32Array(mailbox,0,16),v=new DataView(mailbox),buffer=new Uint8Array(mailbox,64);parentPort.postMessage('ready');for(;;){let state=Atomics.load(h,0);if(state!==1){Atomics.wait(h,0,state,100);continue;}const at=v.getFloat64(32,true),n=Atomics.load(h,2);const bytes=source.subarray(at,at+n);buffer.set(bytes);Atomics.store(h,3,bytes.length);Atomics.store(h,0,2);Atomics.notify(h,0);}`,{eval:true,workerData:{mailbox,source}});
await new Promise(r=>worker.once('message',r));
try{
 const engine=await createRemux({wasmBinary:await readFile(modulePath.replace(/\.mjs$/,'.wasm')),printErr:console.error});engine.io=mailbox;engine.tracks=[];engine.raps=[];engine.emit=()=>{};
 for(const[operation,args]of[['_rm_open',[source.length,-1,-1]],['_rm_set_container',[0]],['_rm_start',[0]],...Array.from({length:20},()=>['_rm_step',[]])]){
  const value=engine[operation](...args);console.log(JSON.stringify({operation,value,error:engine.UTF8ToString(engine._rm_error())}));if(value<0){process.exitCode=1;break;}if(operation==='_rm_step'&&!value)break;
 }
 engine._rm_close();
}finally{await worker.terminate();}
