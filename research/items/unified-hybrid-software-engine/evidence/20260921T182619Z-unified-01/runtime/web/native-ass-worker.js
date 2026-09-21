// SPDX-License-Identifier: GPL-3.0-or-later
// Owns one pinned libass instance. No transport, media decoder or independent clock.
let engine;
function bytesCall(name,bytes,extra=[]){
 const p=engine._malloc(bytes.byteLength+1);if(!p)throw Error('Subtitle allocation failed');
 try{engine.HEAPU8.set(bytes,p);engine.HEAPU8[p+bytes.byteLength]=0;return engine.ccall(name,'number',[...extra.map(()=> 'string'),'number','number'],[...extra,p,bytes.byteLength]);}finally{engine._free(p);}
}
let chain=Promise.resolve();
onmessage=({data})=>{chain=chain.then(async()=>{
 try{
  if(data.type==='init'){
   if(engine)throw Error('Subtitle worker already initialized');
   const {default:create}=await import('./engine-ass/subtitles.mjs');engine=await create();
   if(engine._subtitle_api_version?.()!==2)throw Error('Subtitle runtime interface mismatch; use matching worker and Wasm assets');
   if(engine._subtitle_init()<0)throw Error('libass initialization failed');
   if(data.fonts.length>17)throw Error('Font count exceeded');
   for(const f of data.fonts)if(bytesCall('subtitle_font',new Uint8Array(f.bytes),[f.name])<0)throw Error('Font budget exceeded');
  }else if(data.type==='load'){
   if(bytesCall('subtitle_load',new Uint8Array(data.bytes))<0)throw Error('Invalid ASS or subtitle budget exceeded');
  }else if(data.type==='render'){
   const size=engine._subtitle_render(data.seconds,data.width,data.height,+data.force,data.sourceWidth,data.sourceHeight);if(size===-2){postMessage({id:data.id,unchanged:true,tiles:[],size:0});return;}if(size<0)throw Error('Subtitle render budget exceeded');
   const tiles=engine.tiles;engine.tiles=[];
   postMessage({id:data.id,tiles,size},tiles.map(t=>t.bytes.buffer));return;
  }else throw Error('Unknown subtitle operation');
  postMessage({id:data.id});
 }catch(error){postMessage({id:data.id,error:String(error)});}
});};
