// SPDX-License-Identifier: MIT
// Focused public timeline and verified-provider regressions; no CPU measurements.
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [runtimeArg,fixtureArg,outArg]=process.argv.slice(2);
if(!outArg)throw Error('Usage: review-preview-server.mjs RUNTIME_ROOT FIXTURE FRESH_OUTPUT');
const root=path.resolve(runtimeArg),fixture=await readFile(fixtureArg),out=path.resolve(outArg);
await mkdir(out,{recursive:false});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifests={},identities={},served={};
for(const runtime of ['jspi','asyncify']){
 const groups=[{id:'mpv-playback-'+runtime,paths:[...['manifest.json','player.mjs','player.wasm'].map(name=>`web/engine-mpv-playback-${runtime}/${name}`),'fixtures/DejaVuSans.ttf'],offers:[{capability:'media.play.complete',version:1,profile:'source-tracks'}]},
 {id:'ffmpeg-file-preparation-'+runtime,paths:[...['manifest.json','remux.mjs','remux.wasm'].map(name=>`web/engine-remux-${runtime}/${name}`)],offers:[{capability:'media.prepare.file',version:1,profile:'packet-copy'}]}];
 const assets=[],providers=[];identities[runtime]={};
 for(const group of groups){
  const entries=[];
  for(const name of group.paths){const bytes=await readFile(path.join(root,name)),sha256=digest(bytes);assets.push({id:name,path:name,bytes:bytes.length,sha256});entries.push(['runtime/'+name,sha256]);}
  const implementationIdentity='sha256:'+digest(JSON.stringify(Object.fromEntries(entries.sort(([a],[b])=>a<b?-1:a>b?1:0)),null,2)+'\n');
  identities[runtime][group.id]=implementationIdentity;
  providers.push({id:group.id,implementationIdentity,technology:'mixed',delivery:['optional-assets'],assetIds:group.paths,offers:group.offers});
 }
 manifests[runtime]={schema:1,providerContractVersion:1,revision:'focused-review',assets,providers};
}
const report={startedAt:new Date().toISOString(),runtimeRoot:root,fixtureSHA256:digest(fixture),scope:'Public cooperative seekability and verified modular provider playback',cases:[],served};
let fault='';
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),prefix=/^\/providers-(jspi|asyncify)\//.exec(url.pathname),runtime=prefix?.[1];
  const relative=(runtime?url.pathname.slice(prefix[0].length):url.pathname.slice(1));
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><h1>Cooperative playback review</h1><div id="status">Ready</div><main></main><script type="module" src="/review-check.mjs"></script>');return;}
  if(url.pathname==='/review-check.mjs'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('./review-preview-check.mjs',import.meta.url)));return;}
  if(url.pathname==='/result'&&req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>1024*1024)throw Error('Result byte budget');}report.cases.push(JSON.parse(body));report.passed=report.cases.every(c=>c.passed);await writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');res.end('saved');return;}
  if(url.pathname==='/fault'){fault=url.searchParams.get('file')??'';if(!['','manifest.json','player.wasm','player.mjs'].includes(fault))throw Error('Invalid fault');res.end('set');return;}
  if(relative==='demuxe-providers.json'&&runtime){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(manifests[runtime]));return;}
  if(relative==='web/generated/internal/provider-build.js'&&runtime){res.setHeader('Content-Type','text/javascript');res.end('export const providerDeploymentEnabled=true;export const qualifiedProviderIdentities='+JSON.stringify(identities[runtime])+';');return;}
  if(url.pathname==='/fixture'){res.setHeader('Content-Type','application/octet-stream');res.end(fixture);return;}
  if(!/^(web\/|fixtures\/|index\.js$)/.test(relative))throw Error('Unknown asset');
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Invalid asset');
  let bytes=await readFile(file);
  if(runtime&&fault&&relative===`web/engine-mpv-playback-${runtime}/${fault}`&&req.method!=='HEAD'){bytes=Buffer.from(bytes);bytes[bytes.length-1]^=1;}
  served[(runtime?'providers-'+runtime+'/':'')+relative]={sha256:digest(bytes),bytes:bytes.length};
  res.setHeader('Content-Type',relative.endsWith('.wasm')?'application/wasm':/\.m?js$/.test(relative)?'text/javascript':'application/octet-stream');res.end(bytes);
 }catch(error){res.writeHead(404).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
console.log(JSON.stringify({port:server.address().port,out}));
