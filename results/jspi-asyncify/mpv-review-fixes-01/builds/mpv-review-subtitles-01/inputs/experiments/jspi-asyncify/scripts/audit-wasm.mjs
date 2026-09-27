// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function audit(bytes,{asyncify=false,raw=true,backend=null,profile='remux'}={}) {
 if(!WebAssembly.validate(bytes))throw Error('Invalid Wasm');
 const module=new WebAssembly.Module(bytes),imports=WebAssembly.Module.imports(module),exports=WebAssembly.Module.exports(module);
 if(imports.some(x=>x.kind==='memory'||/pthread|futex|proxy_to|emscripten_thread/i.test(x.name)))
  throw Error('Imported/shared/threaded memory profile rejected');
 let at=8,memories=0;
 const read=()=>{
  let n=0,shift=0;
  for(let i=0;i<5;i++){
   if(at>=bytes.length)throw Error('Truncated unsigned LEB');
   const b=bytes[at++];n+=(b&127)*2**shift;
   if(!(b&128)){if(n>0xffffffff)throw Error('LEB overflow');return n;}shift+=7;
  }throw Error('Oversized unsigned LEB');
 };
 while(at<bytes.length){
  const section=bytes[at++],length=read(),end=at+length;
  if(end>bytes.length)throw Error('Truncated section');
  if(section===5){
   memories=read();
   if(memories!==1)throw Error('Expected one private memory');
   const flags=read();
   if(flags&6||flags>1)throw Error('Shared or memory64 profile rejected');
   read();if(flags&1)read();
   if(at!==end)throw Error('Unexpected memory layout');
  }
  at=end;
 }
 if(memories!==1)throw Error('No private defined memory');
 const names=new Set(exports.filter(x=>x.kind==='function').map(x=>x.name));
 const controls=['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'];
 const observedControls=[...names].filter(x=>x.startsWith('asyncify_'));
 if(raw){
  for(const name of ['demuxe_coop_get_sp','demuxe_coop_set_sp','demuxe_coop_invoke'])
   if(!names.has(name))throw Error('Missing raw scheduler export '+name);
  if(asyncify&&![...controls,'asyncify_get_state'].every(x=>names.has(x)))throw Error('Uninstrumented Asyncify artifact');
  if(!asyncify&&observedControls.length)throw Error('Unexpected Asyncify instrumentation');
 } else {
  if(!['jspi','asyncify'].includes(backend))throw Error('Explicit Emscripten backend required');
  if(!['remux','transcode'].includes(profile))throw Error('Unknown FFmpeg profile');
  const required=['rm_error','rm_probe','rm_open','rm_start','rm_set_container','rm_step','rm_close',
    'rm_duration','rm_video_codec','rm_audio_codec','malloc','free'];
  if(profile==='transcode')required.push('rm_adapt_audio');
  for(const name of required)if(!names.has(name))throw Error('Missing FFmpeg export '+name);
  if(!imports.some(x=>x.kind==='function'&&x.name==='__asyncjs__source_read'))
   throw Error('Missing asynchronous source-read import');
  if(backend==='asyncify'&&!controls.every(x=>names.has(x)))throw Error('Uninstrumented Asyncify artifact');
  if(backend==='jspi'&&observedControls.length)throw Error('Unexpected Asyncify instrumentation');
 }
 return {bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
   privateMemory:true,memory64:false,asyncifyControls:controls.every(x=>names.has(x)),
   observedControls,backend:raw?(asyncify?'asyncify':'jspi'):backend,
   scope:'Static memory and ABI checks only; JSPI glue and suspension require runtime qualification',imports,exports};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node audit-wasm.mjs file.wasm [--asyncify] [--emscripten --backend=jspi|asyncify --profile=remux|transcode]');
 const option=name=>process.argv.find(x=>x.startsWith('--'+name+'='))?.split('=')[1];
 console.log(JSON.stringify(audit(fs.readFileSync(file),{asyncify:process.argv.includes('--asyncify'),raw:!process.argv.includes('--emscripten'),backend:option('backend'),profile:option('profile')??'remux'}),null,2));
}
