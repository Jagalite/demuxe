// SPDX-License-Identifier: Apache-2.0
// Local fixture lab. Qualification comes from checked browser evidence, never manifests.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const setup=JSON.parse(await readFile('build/component-consumer/latest.json','utf8'));
const reports=await Promise.all(['chrome','firefox'].map(async family=>{
 const r=JSON.parse(await readFile('results/media-components/component-installed/'+family+'.json','utf8'));
 if(!r.passed)throw Error('Component browser qualification has not passed: '+family);
 if(r.setup.archives[0].archiveSHA256!==setup.archives[0].archiveSHA256)throw Error('Core differs from tested component build');
 return r;
}));
for(const a of setup.archives){const hash=createHash('sha256').update(await readFile(a.archive)).digest('hex');if(hash!==(a.sha256??a.archiveSHA256))throw Error('Installed archive changed');}
const identities=Object.fromEntries(reports[0].cases.find(c=>c.id==='cost-0-fine').readiness.map(p=>[p.providerId,p.implementationIdentity]));
for(const report of reports)for(const p of report.cases.find(c=>c.id==='cost-0-fine').readiness)if(identities[p.providerId]!==p.implementationIdentity)throw Error('Browser evidence differs on provider identity');
for(const layout of ['fine','common','combined','missing']){
 const deployment=JSON.parse(await readFile(path.join(setup.work,layout,'demuxe-providers.json'),'utf8'));
 for(const p of deployment.providers){
  if(!p.assetIds?.length)continue;
  const entries=p.assetIds.map(id=>{const a=deployment.assets.find(a=>a.id===id);if(!a)throw Error('Missing provider asset');return ['runtime/'+a.path,a.sha256];}).sort(([a],[b])=>a<b?-1:a>b?1:0);
  const identity='sha256:'+createHash('sha256').update(JSON.stringify(Object.fromEntries(entries),null,2)+'\n').digest('hex');
  if(identity!==p.implementationIdentity||identity!==identities[p.id])throw Error('Deployed provider differs from browser evidence');
 }
}
const qualified={identities,browsers:reports.map(r=>({family:r.family,major:r.browser.split('.')[0]})),fixtures:{}};
for(const codec of ['copy','ac3','eac3','dca']){
 const samples=reports.map(r=>r.cases.find(c=>c.id===(codec==='copy'?'typescript-copy':'fine-'+codec)));
 if(samples.some(s=>!s?.nonblack||!(s.audioPeak>0.001))||samples[0].sourceSHA256!==samples[1].sourceSHA256)throw Error('Missing matching fixture output evidence');
 qualified.fixtures[codec]=samples[0].sourceSHA256;
}
// Identity comparison catches stale setup after provider rebuild, without treating
// source-sharing as permission for an untested binary or package closure.
for(const r of reports)for(const a of setup.archives.slice(1))if(!r.setup.archives.some(t=>t.implementationIdentity===a.implementationIdentity))throw Error('Provider differs from tested build');
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/qualification.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(qualified));return;}
 const fixtures=Object.fromEntries(['ac3','eac3','dca'].map(c=>['/fixtures/'+c+'.mkv',path.resolve('build/provider-audio/repair/'+c+'.mkv')]));fixtures['/fixtures/copy.mkv']=path.resolve('build/provider-container/no-reorder.mkv');
 const demo={'/':'examples/component-lab.html','/lab.js':'examples/component-lab.js'};
 const file=demo[name]?path.resolve(demo[name]):fixtures[name]??path.resolve(setup.work,'.'+name);
 if(!demo[name]&&!fixtures[name]&&!file.startsWith(path.resolve(setup.work)+path.sep)){res.writeHead(403).end();return;}
 try{const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}
});
server.listen(Number(process.env.PORT??4188),'127.0.0.1',()=>console.log('Component lab: http://127.0.0.1:'+server.address().port));
