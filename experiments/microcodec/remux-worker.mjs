import {vp9RemuxConfig} from '../../web/video-codec-config.js';
self.onmessage=async({data:{url,bytes,io,adapt}})=>{try{
 const wasm=await (await fetch(url.replace(/\.mjs$/,'.wasm'))).arrayBuffer();let t=performance.now();const compiled=await WebAssembly.compile(wasm),compileMs=performance.now()-t;
 let instantiateMs;t=performance.now();const factory=(await import(url)).default;const m=await factory({instantiateWasm(imports,done){const s=performance.now();const i=new WebAssembly.Instance(compiled,imports);instantiateMs=performance.now()-s;done(i,compiled);return i.exports;}});const factoryMs=performance.now()-t;
 m.parseVP9=vp9RemuxConfig;m.io=io;m.raps=[];m.tracks=[];const chunks=[];m.emit=b=>chunks.push(b);const initialMemory=m.HEAPU8.length;let peakMemory=initialMemory;
 if(adapt){const r=m._rm_adapt_audio(3);if(r<0)throw Error('adapt '+r);}
 t=performance.now();let r=m._rm_open(bytes,-1,-1);if(r<0)throw Error('open '+r+' '+m.UTF8ToString(m._rm_error()));const openMs=performance.now()-t;
 t=performance.now();r=m._rm_start(0);if(r<0)throw Error('start '+r+' '+m.UTF8ToString(m._rm_error()));const startMs=performance.now()-t;
 t=performance.now();let steps=0;do{r=m._rm_step();peakMemory=Math.max(peakMemory,m.HEAPU8.length);if(++steps>100000)throw Error('step budget');}while(r>0);const processMs=performance.now()-t;if(r<0)throw Error('step '+r+' '+m.UTF8ToString(m._rm_error()));
 const adaptation=m.adaptation;const tracks=m.tracks; m._rm_close();
 const output=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let at=0;for(const b of chunks){output.set(b,at);at+=b.length;}
 postMessage({compileMs,instantiateMs,factoryMs,openMs,startMs,processMs,initialMemory,peakMemory,adaptation,tracks,steps,output},[output.buffer]);
}catch(e){postMessage({error:e.stack});}};
