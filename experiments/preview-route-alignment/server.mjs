// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import {readFile,stat,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
export async function serve(){
 const root=process.cwd(),build=path.join(root,'build/preview-route-alignment'),receipts=new Map(),traffic=[],deniedCases=new Set();let lastReceipt=0;
 const generated=process.env.PREVIEW_GENERATED_ROOT?path.resolve(process.env.PREVIEW_GENERATED_ROOT):path.join(build,'generated');
 const runtimeSnapshot=process.env.PREVIEW_RUNTIME_SNAPSHOT?path.resolve(process.env.PREVIEW_RUNTIME_SNAPSHOT):undefined;
 const experiment=process.env.PREVIEW_EXPERIMENT_ROOT?path.resolve(process.env.PREVIEW_EXPERIMENT_ROOT):path.join(root,'experiments/preview-route-alignment');
 const output=path.join(root,'results/preview-route-alignment',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(output,{recursive:true});
 await writeFile(path.join(output,'source-identity.json'),await readFile(process.env.PREVIEW_SOURCE_IDENTITY??path.join(build,'source-identity.json')));
 // Compute provenance outside measured HTTP requests. Large-file hashing must
 // not consume the player's source-inspection deadline.
 const fixtureHashes=new Map();
 async function prehash(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await prehash(file);else{const info=await stat(file);fixtureHashes.set(file+':'+info.mtimeMs,createHash('sha256').update(await readFile(file)).digest('hex'));}}}
 await prehash(path.join(build,'fixtures'));
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');res.setHeader('Cache-Control','no-store');
  try{
   const u=new URL(req.url,'http://localhost');
   if(u.pathname==='/authorization'&&req.method==='POST'){if(u.searchParams.get('deny')==='yes')deniedCases.add(u.searchParams.get('case'));else deniedCases.delete(u.searchParams.get('case'));res.end('ok');return;}
   if(u.pathname==='/receipt'&&req.method==='POST'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const result=JSON.parse(Buffer.concat(chunks));
    const id=result.config.id;if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid receipt id');
    for(const [i,frame]of result.frames.entries())if(frame.dataURL){await writeFile(path.join(output,`${id}-${i}.png`),Buffer.from(frame.dataURL.split(',')[1],'base64'));frame.image=`${id}-${i}.png`;delete frame.dataURL;}
    result.traffic=traffic.slice(lastReceipt);lastReceipt=traffic.length;
    await writeFile(path.join(output,id+'.json'),JSON.stringify(result,null,2)+'\n');await writeFile(path.join(output,'served-assets.json'),JSON.stringify([...receipts.values()],null,2)+'\n');
    console.log(JSON.stringify({id,status:result.status,failure:result.failure?.split('\n')[0],latencies:result.frames.map(x=>Math.round(x.latencyMs))}));res.end(JSON.stringify({output}));return;
   }
   if(u.searchParams.get('cors')==='allow'){res.setHeader('Access-Control-Allow-Origin',req.headers.origin||'*');res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Range, If-Range, Authorization');res.setHeader('Access-Control-Expose-Headers','Content-Range, ETag, Content-Length');}
   if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
   if(deniedCases.has(u.searchParams.get('case'))){res.writeHead(401).end();return;}
   if(u.searchParams.get('auth')==='required'&&req.headers.authorization!=='Bearer preview-experiment'){res.writeHead(401).end();return;}
   let file;
   if(u.pathname==='/')file=path.join(root,'experiments/preview-route-alignment/page.html');
   else if(u.pathname.startsWith('/experiment/'))file=path.join(experiment,u.pathname.slice(12));
   else if(u.pathname.startsWith('/media/'))file=path.join(build,'fixtures',u.pathname.slice(7));
   else if(u.pathname.startsWith('/web/generated/'))file=path.join(generated,u.pathname.slice(15));
   else if(u.pathname.startsWith('/web/')||u.pathname.startsWith('/fixtures/'))file=path.join(runtimeSnapshot&&u.pathname.startsWith('/web/')&&/\.(?:js|json)$/.test(u.pathname)?runtimeSnapshot:root,u.pathname);
   else{res.writeHead(404).end();return;}
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   const info=await stat(file);
   const receiptKey=file+':'+info.mtimeMs;
   if(!receipts.has(receiptKey))receipts.set(receiptKey,{path:path.relative(root,file),bytes:info.size,sha256:fixtureHashes.get(receiptKey)??createHash('sha256').update(await readFile(file)).digest('hex')});
   let start=0,end=info.size-1,code=200;
   if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416).end();return;}start=Number(m[1]);end=m[2]?Math.min(end,Number(m[2])):end;if(start>end){res.writeHead(416).end();return;}code=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
   const row={url:u.pathname,case:u.searchParams.get('case'),lane:u.searchParams.get('lane'),range:req.headers.range??null,authorized:!!req.headers.authorization,bytes:0,finished:false};if(u.pathname.startsWith('/media/'))traffic.push(row);
   const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.ttf':'font/ttf','.mp4':'video/mp4','.mkv':'video/x-matroska','.mpd':'application/dash+xml','.jpg':'image/jpeg','.m4s':'video/mp4'};
   res.writeHead(code,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','ETag':'"'+receipts.get(receiptKey).sha256+'"'});
   if(req.method==='HEAD'){res.end();return;}
   if(u.searchParams.get('slow')==='yes'){
    const stream=createReadStream(file,{start,end,highWaterMark:65536});res.on('close',()=>stream.destroy());
    await new Promise(r=>setTimeout(r,100));
    try{for await(const chunk of stream){if(res.destroyed)break;row.bytes+=chunk.length;res.write(chunk);await new Promise(r=>setTimeout(r,32));}row.finished=!res.destroyed;if(!res.destroyed)res.end();}catch{res.destroy();}return;
   }
   const stream=createReadStream(file,{start,end});stream.on('data',x=>row.bytes+=x.length);stream.on('end',()=>row.finished=true);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){if(!res.headersSent)res.writeHead(404);res.end(String(error));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {origin:`http://127.0.0.1:${server.address().port}`,output,receipts,traffic,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};
}
if(process.argv[1]===import.meta.filename){const s=await serve();console.log(JSON.stringify({origin:s.origin,output:s.output,pid:process.pid}));}
