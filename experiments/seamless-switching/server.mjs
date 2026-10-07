// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const base=path.resolve(process.argv[2]??'build/seamless-switching');
const out=path.resolve(process.argv[3]??`results/seamless-switching/${Date.now()}`);
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.mkdir(out);
const lab=path.join(out,'harness');await fs.cp(import.meta.dirname,lab,{recursive:true});
const harnessHashes={};for(const name of await fs.readdir(lab)){const stat=await fs.stat(path.join(lab,name));if(stat.isFile())harnessHashes[name]=createHash('sha256').update(await fs.readFile(path.join(lab,name))).digest('hex');}
await fs.writeFile(path.join(out,'harness-hashes.json'),JSON.stringify(harnessHashes,null,2)+'\n');
await fs.copyFile(path.join(base,'manifest.json'),path.join(out,'manifest.json'));
await fs.writeFile(path.join(out,'server-config.json'),JSON.stringify({segmentDelayMs:Number(process.env.SEGMENT_DELAY_MS??0),segmentBytesPerSecond:Number(process.env.SEGMENT_BYTES_PER_SECOND??0)},null,2)+'\n');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.m3u8':'application/vnd.apple.mpegurl','.mp4':'video/mp4','.m4s':'video/mp4','.m4a':'audio/mp4','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&/^\/result\/[a-z0-9-]+\.(json|f32)$/.test(u.pathname)){
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024)throw Error('Result too large');chunks.push(chunk);}
   await fs.writeFile(path.join(out,path.basename(u.pathname)),Buffer.concat(chunks));res.end('saved');return;
  }
  const root=u.pathname.startsWith('/lab/')?lab:base;
  const relative=u.pathname.startsWith('/lab/')?u.pathname.slice(5):u.pathname.slice(1);
  const file=path.resolve(root,relative||'media/master.m3u8');
  if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  const bytes=await fs.readFile(file); const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
  if(root===base)await fs.appendFile(path.join(out,'requests.jsonl'),JSON.stringify({at:Date.now(),path:u.pathname,query:u.search,range:req.headers.range??null,bytes:bytes.length})+'\n');
  let start=0,end=bytes.length-1;if(range){start=+range[1];end=range[2]?Math.min(+range[2],end):end;}
  if(start>end){res.writeHead(416);res.end();return;}
  // Deterministic latency injection on media requests, not a bandwidth model.
  const delay=Number(u.searchParams.get('delay')??(path.extname(file)==='.m4s'?process.env.SEGMENT_DELAY_MS??0:0));if(delay>0)await new Promise(r=>setTimeout(r,Math.min(delay,2000)));
  res.writeHead(range?206:200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});
  const rate=path.extname(file)==='.m4s'?Number(process.env.SEGMENT_BYTES_PER_SECOND??0):0;
  if(rate>0){
   res.flushHeaders();const chunkSize=16384;
   for(let offset=start;offset<=end&&!res.destroyed;offset+=chunkSize){await new Promise(r=>setTimeout(r,chunkSize/rate*1000));if(!res.destroyed)res.write(bytes.subarray(offset,Math.min(offset+chunkSize,end+1)));}
   res.end();
  }else res.end(bytes.subarray(start,end+1));
 }catch(error){res.writeHead(500);res.end(String(error));}
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}/lab/index.html`,out})));
