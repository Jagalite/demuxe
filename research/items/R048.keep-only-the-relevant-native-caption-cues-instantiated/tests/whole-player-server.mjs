// SPDX-License-Identifier: Apache-2.0
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function serve(mode,prepared) {
  if(!['baseline','eager','window'].includes(mode))throw Error('Unknown arm');
  const base=path.resolve('build/head-to-head/assets-component-isolation-01'),cache=new Map(),hashes={},requests=[];
  const html=`<!doctype html><style>body{margin:0;background:black}#host{width:960px;height:540px}video{width:960px;height:540px}</style><div id="host"></div><script type="module">import{Player}from'/web/generated/index.js';import{plainSRTtoVTT}from'/srt.mjs';window.Player=Player;window.convert=plainSRTtoVTT;window.errors=[];window.ready=true;</script>`;
  const server=createServer(async(req,res)=>{try{for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'}))res.setHeader(k,v);const name=new URL(req.url,'http://local').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(name.includes('..'))throw Error('path');let file=path.join(base,'demuxe',name);
    if(name==='/media.mp4')file=path.join(base,'fixtures/h264-fmp4/index.mp4');
    if(name==='/captions.srt')file=path.join(prepared,'captions.srt');
    if(name==='/srt.mjs')file=path.join(import.meta.dirname,'whole-player-srt.mjs');
    if(mode!=='baseline'&&name==='/web/generated/internal/native-player.js')file=path.join(prepared,mode,'native-player.js');
    if(name==='/web/generated/internal/r048-cue-owner.mjs')file=path.join(prepared,mode,'r048-cue-owner.mjs');
    if(!cache.has(file)){const b=await readFile(file);cache.set(file,b);hashes[file]=createHash('sha256').update(b).digest('hex');}const bytes=cache.get(file);res.setHeader('ETag','"'+hashes[file]+'"');res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type',/\.(js|mjs)$/.test(name)?'text/javascript':name==='/media.mp4'?'video/mp4':'application/octet-stream');const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range??'');const lo=m?+m[1]:0,hi=m?.[2]?Math.min(+m[2],bytes.length-1):bytes.length-1;if(lo>hi)throw Error('range');requests.push({name,lo,hi,bytes:hi-lo+1});if(m)res.writeHead(206,{'Content-Range':`bytes ${lo}-${hi}/${bytes.length}`,'Content-Length':hi-lo+1});else res.setHeader('Content-Length',bytes.length);res.end(req.method==='HEAD'?undefined:bytes.subarray(lo,hi+1));
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));return {origin:'http://127.0.0.1:'+server.address().port,hashes,requests,async close(){server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
