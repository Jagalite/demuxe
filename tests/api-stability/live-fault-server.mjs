// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import {readFile} from 'node:fs/promises';
/** Real HTTP faults with barriers; no fetch monkeypatches or fixed race sleeps. */
export async function startLiveFaultServer(assetOrigin){
 const bytes=await readFile('fixtures/example.mp4'),cases=new Map();
 const helpers=await readFile(new URL('./live-check-helpers.mjs',import.meta.url));
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('case');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  if(url.pathname==='/tests/api-stability/live-check-helpers.mjs'){res.setHeader('Content-Type','text/javascript');res.end(helpers);return;}
  if(url.pathname==='/__live_boundaries__'){res.setHeader('Content-Type','text/html');res.end('<button>Activate</button>');return;}
  if(!['/control','/media.mp4'].includes(url.pathname)){
   try{const upstream=await fetch(assetOrigin+req.url,{headers:req.headers.range?{Range:req.headers.range}:{}});res.writeHead(upstream.status,Object.fromEntries([...upstream.headers].filter(([key])=>!['transfer-encoding','connection','content-encoding'].includes(key))));res.end(Buffer.from(await upstream.arrayBuffer()));}
   catch{res.destroy();}return;
  }
  if(!id){res.writeHead(400).end();return;}
  let state=cases.get(id);if(!state)cases.set(id,state={requests:[],held:[],aborted:0,released:false});
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
  res.setHeader('Access-Control-Allow-Headers','Range, Authorization, If-Range');res.setHeader('Access-Control-Expose-Headers','Content-Range, Content-Length, ETag');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
  if(url.pathname==='/control'){
   if(url.searchParams.get('release')==='1'){state.released=true;for(const send of state.held.splice(0))send();}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({requests:state.requests,aborted:state.aborted,released:state.released,held:state.held.length}));return;
  }
  const fault=url.searchParams.get('fault')??'ok',index=state.requests.length;
  state.requests.push({fault,range:req.headers.range??null,at:Date.now()});
  res.on('close',()=>{if(!res.writableFinished)state.aborted++;});
  if(fault==='auth'){res.writeHead(401).end();return;}
  if(fault==='retry'&&index===0){res.setHeader('Retry-After','0');res.writeHead(503).end();return;}
  const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
  const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
  const send=()=>{if(res.destroyed)return;
   res.setHeader('Content-Type','video/mp4');res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag',fault==='changed'&&index>0?'"second"':'"first"');
   res.setHeader('Content-Length',end-start+1);if(match)res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
   res.writeHead(match?206:200);res.end(bytes.subarray(start,end+1));
  };
  if(fault==='hold'&&!state.released)state.held.push(send);else send();
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {origin:`http://127.0.0.1:${server.address().port}`,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
