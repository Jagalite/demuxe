// SPDX-License-Identifier: Apache-2.0
// Range semantics reuse Demuxe's controlled head-to-head server. Throttle media
// through one shared byte budget, including concurrent and open-ended requests.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {byteRange} from '../../../../tests/head-to-head/server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function serve(home,out){
 const requests=[],changes=[];let active=0,rate=100e6/8,stall=false,tokens=0,last=performance.now();
 const log=fs.createWriteStream(path.join(out,'requests.jsonl'),{flags:'wx'});
 const control=(bytesPerSecond,blocked=false)=>{rate=bytesPerSecond;stall=blocked;tokens=0;last=performance.now();changes.push({at:Date.now(),bytesPerSecond,stall});};
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  for(const [k,v] of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}))res.setHeader(k,v);
  let stream;
  try{
   const media=url.pathname.startsWith('/media/');
   const root=path.join(home,media?'fixtures':url.pathname.startsWith('/tests/')?'tests':'runtime');
   const rel=media?url.pathname.slice(7):url.pathname.startsWith('/tests/')?url.pathname.slice(7):url.pathname.slice(1);
   const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw Error('path');
   const stat=fs.statSync(file),range=byteRange(req.headers.range,stat.size);if(!range){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
   const {start,end,status}=range;
   const rec={id:requests.length,url:req.url,method:req.method,range:req.headers.range??null,start,end,status,started:Date.now(),bytesWritten:0,writes:[]};
   if(media){requests.push(rec);active++;res.once('close',()=>{active--;rec.closed=Date.now();rec.complete=rec.bytesWritten===end-start+1;log.write(JSON.stringify(rec)+'\n');});}
   res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag','"'+path.basename(file)+'-'+stat.size+'"');
   if(status===206)res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
   res.writeHead(status,{'Content-Type':({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm','.mp4':'video/mp4'})[path.extname(file)]??'application/octet-stream','Content-Length':end-start+1});
   if(req.method==='HEAD'){res.end();return;}
   stream=fs.createReadStream(file,{start,end,highWaterMark:16384});res.once('close',()=>stream.destroy());
   for await(const chunk of stream){
    if(media)while(!res.destroyed){
     const now=performance.now();tokens=Math.min(32768,tokens+(now-last)*rate/1000);last=now;
     if(!stall&&tokens>=chunk.length){tokens-=chunk.length;break;}
     await sleep(stall?20:Math.max(1,Math.min(20,(chunk.length-tokens)*1000/rate)));
    }
    if(res.destroyed)break;
    const ok=res.write(chunk);if(media){rec.writes.push([Date.now(),start+rec.bytesWritten,chunk.length]);rec.bytesWritten+=chunk.length;}
    if(!ok)await new Promise(resolve=>{
     const done=()=>{res.off('drain',done);res.off('close',done);res.off('error',done);resolve();};
     res.once('drain',done);res.once('close',done);res.once('error',done);
    });
   }
   if(!res.destroyed)res.end();
  }catch(e){if(!res.headersSent)res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {origin:'http://127.0.0.1:'+server.address().port,requests,changes,control,get active(){return active;},close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await new Promise(r=>log.end(r));}};
}
