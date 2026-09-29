// Experimental complete-packet protocol, deliberately independent of Player.
let m,d;
self.onmessage=async({data:q})=>{try{
 if(q.type==='open'){
  const bytes=await(await fetch(q.url.replace(/\.mjs$/,'.wasm'))).arrayBuffer();let t=performance.now();const compiled=await WebAssembly.compile(bytes),compileMs=performance.now()-t;
  let instantiateMs;t=performance.now();m=await(await import(q.url)).default({instantiateWasm(imports,done){const t=performance.now(),i=new WebAssembly.Instance(compiled,imports);instantiateMs=performance.now()-t;done(i,compiled);return i.exports;}});const factoryMs=performance.now()-t;
  t=performance.now();d=m._mc_create(q.kind);if(!d)throw Error('decoder unavailable');m._mc_configure(d,q.rate??48000);postMessage({type:'open',compileMs,instantiateMs,factoryMs,initMs:performance.now()-t,memory:m.HEAPU8.length});return;
 }
 if(q.type==='destroy'){m._mc_destroy(d);d=0;postMessage({type:q.type});return;}
 if(!d)throw Error('not open');
 if(q.type==='reset'){const status=m._mc_reset(d,1);postMessage({type:q.type,status});return;}
 let status,t=performance.now();if(q.type==='flush')status=m._mc_flush(d);else{const b=new Uint8Array(q.packet),p=m._malloc(b.length);if(!p)throw Error('allocation');try{m.HEAPU8.set(b,p);status=m._mc_decode(d,p,b.length,q.pts);}finally{m._free(p);}}
 const frames=[];if(status>=0)while(m._mc_frame(d)===0){const info=Array.from({length:9},(_,i)=>m._mc_info(d,i));if(info[3]!==8)throw Error('expected float planar PCM');const planes=Array.from({length:info[2]},(_,c)=>{const p=m._mc_plane(d,c);return m.HEAPU8.slice(p,p+info[0]*4).buffer;});frames.push({info,planes});}
 postMessage({type:q.type,status,frames,ms:performance.now()-t,memory:m.HEAPU8.length},frames.flatMap(f=>f.planes));
}catch(e){postMessage({error:String(e.stack)});}};
