// SPDX-License-Identifier: Apache-2.0
// Matched full-file baseline using the existing pinned adaptation engine.
import {createFFmpegBridge} from '/repository/web/private-ffmpeg/bridge.js';
self.onmessage=async({data})=>{
 let bridge;
 try{
  const began=performance.now(),runtime=data.runtime??'asyncify';
  const create=(await import(data.engineURL??('/repository/web/engine-adaptation-'+runtime+'/remux.mjs'))).default;
  const engine=await create({printErr(){}});bridge=createFFmpegBridge(engine,{timeoutMs:45000});bridge.setSource(data.file);
  engine.tracks=[];engine.raps=[];engine.videoFrames=[];const chunks=[];let bytes=0;
  engine.emit=b=>{bytes+=b.length;if(bytes>96*1024*1024)throw Error('Baseline output budget');chunks.push(b.slice());};
  const checked=async(name,args=[])=>{const r=await bridge.call(name,'number',args.map(()=> 'number'),args);if(r<0)throw Error('Baseline '+name+': '+await bridge.call('rm_error','string',[],[]));return r;};
  await checked('rm_adapt_audio',[3]);await checked('rm_open',[data.file.size,-1,-1]);await checked('rm_set_container',[0]);await checked('rm_start',[0]);
  let more=1,count=0;while(more){if(++count>10000)throw Error('Baseline drain budget');more=await checked('rm_step');}
  const output=new Uint8Array(bytes);let offset=0;for(const c of chunks){output.set(c,offset);offset+=c.length;}
  const preparationMs=performance.now()-began,wasmResidentBytes=engine.HEAPU8.byteLength;
  await bridge.destroy();bridge=undefined;
  postMessage({passed:true,preparationMs,wasmResidentBytes,output:output.buffer},[output.buffer]);
 }catch(error){await bridge?.destroy().catch(()=>{});postMessage({passed:false,error:String(error.stack)});}
};
