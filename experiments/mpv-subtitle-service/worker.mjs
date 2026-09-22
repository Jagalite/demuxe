// SPDX-License-Identifier: GPL-3.0-or-later
import create from '/lab-build/service.mjs';
import {SubtitleOverlay} from '/web/subtitle-overlay.js';
let engine,overlay=new SubtitleOverlay(),epoch=0;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let chain=Promise.resolve();
onmessage=({data:d})=>{chain=chain.then(async()=>{try{
 let result={};
 if(d.type==='open'){
 engine=await create({print:()=>{},printErr:()=>{}});engine.FS.mkdir('/fonts');engine.FS.writeFile('/fonts/DejaVuSans.ttf',new Uint8Array(await(await fetch('/fixtures/DejaVuSans.ttf')).arrayBuffer()));
 const response=await fetch(d.url);if(!response.ok||Number(response.headers.get('content-length'))>16*1024*1024)throw Error('16 MiB prototype source limit');const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>16*1024*1024)throw Error('16 MiB prototype source limit');engine.FS.writeFile('/media.mkv',bytes);
 if(engine._lab_create()<0||engine._lab_open()<0)throw Error('mpv init/open failed');let loaded=0;for(let i=0;i<1000&&!loaded;i++){loaded=engine._lab_loaded();if(loaded<0)throw Error('mpv load error');if(!loaded)await delay(10);}if(!loaded)throw Error('load timeout');if(engine._lab_select(1)<0)throw Error('subtitle selection');result={sourceBytes:bytes.length};
 }else if(d.type==='seek'){epoch=d.epoch;if(engine._lab_seek(d.time)<0)throw Error('seek failed');overlay.clear();await delay(30);
 }else if(d.type==='render'){
 const r=engine._lab_render(d.time,d.width,d.height);if(r<0)throw Error('no active subtitle decoder');const previous=overlay.serial,snapshot=overlay.read(engine);let bitmap;if(overlay.serial!==previous&&!d.noBitmap){const canvas=new OffscreenCanvas(d.width,d.height);overlay.draw(canvas.getContext('2d'),snapshot);bitmap=canvas.transferToImageBitmap();}postMessage({id:d.id,result:{ready:r,epoch,avChains:engine._lab_av_chains(),heapBytes:engine.HEAPU8.byteLength,stats:overlay.stats,bitmap}},bitmap?[bitmap]:[]);return;
 }else if(d.type==='delay'){if(engine._lab_delay(d.value)<0)throw Error('delay failed');}
 else if(d.type==='close'){engine._lab_close();engine.PThread.terminateAllThreads();}
 postMessage({id:d.id,result});
 }catch(e){postMessage({id:d.id,error:String(e.stack)});}});};
