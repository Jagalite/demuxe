// SPDX-License-Identifier: Apache-2.0
// Run with node tests/shared-runtime-browser-server.mjs, then invoke
// import('/tests/shared-runtime.browser.js').then(m=>m.runSharedRuntimeBrowser())
// in a browser at the printed origin. Uses real native playback and HTTP assets.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),generated=process.env.GENERATED_ROOT??path.join(root,'web/generated');
const hash=value=>createHash('sha256').update(value).digest('hex');
const wasm=Buffer.from([0,97,115,109,1,0,0,0]),digest=hash(wasm),identity='sha256:'+hash(JSON.stringify({'runtime/runtime-test/cache.wasm':digest},null,2)+'\n');
const native={schema:1,providerContractVersion:1,revision:'native',assets:[],providers:[{id:'browser-original',implementationIdentity:'demuxe-browser-v1',technology:'browser-native',delivery:['browser'],offers:[{capability:'media.present.original',version:1,profile:'selected-source'}]}]};
const extra={schema:1,providerContractVersion:1,revision:'extra',assets:[{id:'cached',path:'runtime-test/cache.wasm',bytes:wasm.length,sha256:digest}],providers:[{id:'cache-test',implementationIdentity:identity,technology:'wasm',delivery:['optional-assets'],assetIds:['cached'],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}]}]};
const additional=Object.fromEntries(['second','flaky','slow'].map(name=>{
  const path='runtime-test/'+name+'.wasm',id='cache-'+name,identity='sha256:'+hash(JSON.stringify({['runtime/'+path]:digest},null,2)+'\n');
  return [name,{schema:1,providerContractVersion:1,revision:name,assets:[{id,path,bytes:wasm.length,sha256:digest}],providers:[{...extra.providers[0],id,implementationIdentity:identity,assetIds:[id]}]}];
}));
const qualified=Object.fromEntries([native,...Object.values(additional),extra].flatMap(m=>m.providers.map(p=>[p.id,p.implementationIdentity])));
const requests={};
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/runtime-test/reset'&&req.method==='POST'){for(const key of Object.keys(requests))delete requests[key];res.writeHead(204).end();return;}
  if(pathname!=='/runtime-test/requests')requests[pathname]=(requests[pathname]??0)+1;
  try{
    let bytes,type='application/json';
    if(pathname==='/'){bytes=Buffer.from('<!doctype html><title>Shared runtime regression</title><h1>Shared runtime regression</h1>');type='text/html';}
    else if(pathname==='/runtime-test/config')bytes=Buffer.from(JSON.stringify({qualified}));
    else if(pathname==='/runtime-test/native.json')bytes=Buffer.from(JSON.stringify(native));
    else if(pathname==='/runtime-test/extra.json')bytes=Buffer.from(JSON.stringify(extra));
    else if(/^\/runtime-test\/(second|flaky|slow)\.json$/.test(pathname)){const name=pathname.split('/').pop().split('.')[0];if(name==='slow')await new Promise(r=>setTimeout(r,300));bytes=Buffer.from(JSON.stringify(additional[name]));}
    else if(pathname==='/runtime-test/conflict.json')bytes=Buffer.from(JSON.stringify({...extra,assets:[{...extra.assets[0],bytes:9}]}));
    else if(pathname==='/runtime-test/unqualified.json')bytes=Buffer.from(JSON.stringify({...native,providers:[{...native.providers[0],id:'unreviewed'}]}));
    else if(pathname==='/runtime-test/bad-contract.json')bytes=Buffer.from(JSON.stringify({...native,providerContractVersion:99}));
    else if(pathname==='/runtime-test/oversized.json')bytes=Buffer.alloc(1024*1024+1,32);
    else if(pathname==='/runtime-test/malformed.json')bytes=Buffer.from('{bad json');
    else if(pathname==='/runtime-test/retry.json'){if(requests[pathname]===1){res.writeHead(503).end();return;}bytes=Buffer.from(JSON.stringify(native));}
    else if(/^\/runtime-test\/(second|flaky|slow)\.wasm$/.test(pathname)){if(pathname.includes('slow'))await new Promise(r=>setTimeout(r,300));bytes=pathname.includes('flaky')&&requests[pathname]===1?Buffer.alloc(8):wasm;type='application/wasm';}
    else if(pathname==='/runtime-test/requests')bytes=Buffer.from(JSON.stringify(requests));
    else if(pathname==='/runtime-test/cache.wasm'){bytes=wasm;type='application/wasm';}
    else{
      if(pathname.includes('..')||!(/^\/web\//.test(pathname)||pathname==='/fixtures/example.mp4'||['/tests/shared-runtime.browser.js','/tests/shared-runtime-adversarial.browser.js','/tests/api-stability/live-presentation-adversarial.mjs'].includes(pathname)))throw Error('not found');
      const file=pathname.startsWith('/web/generated/')?path.join(generated,pathname.slice('/web/generated/'.length)):path.join(root,pathname);
      if(req.method==='HEAD'&&pathname.startsWith('/web/')){const info=await stat(file);res.writeHead(200,{'Content-Length':info.size,'Cache-Control':'no-store'}).end();return;}
      bytes=await readFile(file);type=pathname.endsWith('.mp4')?'video/mp4':pathname.endsWith('.wasm')?'application/wasm':'text/javascript';
    }
    res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');res.setHeader('ETag','\"'+hash(bytes)+'\"');res.setHeader('Accept-Ranges','bytes');
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
    if(range){const start=+range[1],end=range[2]?Math.min(+range[2],bytes.length-1):bytes.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});res.end(bytes.subarray(start,end+1));}
    else{res.setHeader('Content-Length',bytes.length);res.end(bytes);}
  }catch{res.writeHead(404).end();}
});
server.listen(Number(process.env.PORT??4187),'127.0.0.1',()=>console.log('Shared runtime regression: http://127.0.0.1:'+server.address().port));
