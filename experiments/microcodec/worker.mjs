// Research-only Node benchmark Worker. No production resource loader.
import {performance} from 'node:perf_hooks';
import {parentPort,workerData} from 'node:worker_threads';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const t=()=>performance.now();
const {dir,fixture,output}=workerData;
try {
 const importCalls={};const bytes=await readFile(dir+'/module.wasm');let start=t();const compiled=await WebAssembly.compile(bytes),compileMs=t()-start;
 const factory=(await import(pathToFileURL(dir+'/module.mjs'))).default;
 let instantiateMs;start=t();const m=await factory({instantiateWasm(imports,done){for(const [ns,values] of Object.entries(imports))for(const [name,fn] of Object.entries(values))if(typeof fn==='function'){values[name]=(...args)=>{const key=ns+'.'+name;importCalls[key]=(importCalls[key]??0)+1;return fn(...args);};}let s=t();const i=new WebAssembly.Instance(compiled,imports);instantiateMs=t()-s;done(i,compiled);return i.exports;}});const factoryMs=t()-start;
 const initialMemory=m.HEAPU8.length;start=t();const d=m._mc_create(fixture.kind);if(!d)throw Error('create failed');const initMs=t()-start;
 const data=await readFile(fixture.file);const ptr=m._malloc(Math.max(...fixture.packets.map(p=>p.size))+64);let peakMemory=m.HEAPU8.length;
 const frameMeta=[],chunks=[];
 function receive(collect){let r;while((r=m._mc_frame(d))===0){const info=Array.from({length:9},(_,i)=>m._mc_info(d,i));const [n,rate,ch,fmt]=info;if(fmt!==8)throw Error('Expected FLTP, got '+fmt);if(collect){frameMeta.push(info);const pcm=new Float32Array(n*ch);for(let c=0;c<ch;c++){let p=m._mc_plane(d,c)/4;for(let i=0;i<n;i++)pcm[i*ch+c]=m.HEAPF32[p+i];}chunks.push(Buffer.from(pcm.buffer));}peakMemory=Math.max(peakMemory,m.HEAPU8.length);}return r;}
 function send(packet,pts){m.HEAPU8.set(packet,ptr);return m._mc_decode(d,ptr,packet.length,pts);}
 function decode(collect=true,offset=0){for(const p of fixture.packets){let r=send(data.subarray(p.pos,p.pos+p.size),p.pts+offset);if(r<0)throw Error('send '+r);receive(collect);}const before=frameMeta.length;const flush=m._mc_flush(d),eof=receive(collect);return {flush,eof,flushFrames:frameMeta.length-before};}
 const cpu=process.cpuUsage();start=t();const flush=decode();const decodeMs=t()-start,cpuUs=process.cpuUsage(cpu);const pcm=Buffer.concat(chunks);await writeFile(output,pcm);
 const resetResults=[];
 for(const recreate of [0,1]){m._mc_reset(d,recreate);chunks.length=0;frameMeta.length=0;decode();const replay=Buffer.concat(chunks);resetResults.push({recreate,exact:pcm.equals(replay)});}
 m._mc_reset(d,1);chunks.length=0;frameMeta.length=0;decode(true,480000);const discontinuity={exact:pcm.equals(Buffer.concat(chunks)),firstPts:frameMeta[0][4]};
 const bad=[];for(const kind of ['truncated','corrupt']){m._mc_reset(d,1);const p=fixture.packets[0];const packet=kind==='truncated'?data.subarray(p.pos,p.pos+7):Buffer.alloc(p.size,255);const sendResult=send(packet,0),receiveResult=receive(false);m._mc_reset(d,1);chunks.length=0;frameMeta.length=0;decode();bad.push({kind,sendResult,receiveResult,recoveryExact:pcm.equals(Buffer.concat(chunks))});}
 const times=[];const cpuStart=process.cpuUsage();for(let i=0;i<12;i++){m._mc_reset(d,1);start=t();decode(false);times.push(t()-start);}const benchCpu=process.cpuUsage(cpuStart);
 const meta=frameMeta.slice();m._free(ptr);m._mc_destroy(d);
 parentPort.postMessage({importCalls,compileMs,instantiateMs,factoryMs,initMs,initialMemory,peakMemory,decodeMs,cpuUs,benchCpu,times,flush,resetResults,discontinuity,bad,frames:meta,pcmBytes:pcm.length,imports:WebAssembly.Module.imports(compiled),exports:WebAssembly.Module.exports(compiled)});
} catch(e){parentPort.postMessage({error:e.stack});}
