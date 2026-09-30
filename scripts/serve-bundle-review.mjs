// SPDX-License-Identifier: Apache-2.0
// Serve the retained bundle artifacts for the collaborative browser. Uses the
// same public Player exercise as the automated browser regression harness.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
const root=path.resolve('build/bundle-flexibility'),requests=[];
const source=await readFile('tests/bundle-playback.mjs','utf8');
const begin=source.indexOf('async({item,delivery})=>{'),end=source.indexOf('  },{item,delivery:manifest.delivery});');
if(begin<0||end<begin)throw Error('Public Player test function was not found');
const exercise=(source.slice(begin,end)+'}').replace('async({item,delivery})','async({item,delivery,bundleName})').replace("import('/demuxe.mjs')","import('/'+bundleName+'/demuxe.mjs')").replace("fetch('/bundle-manifest.json'", "fetch('/'+bundleName+'/bundle-manifest.json'").replace("fetch('/'+name", "fetch('/'+bundleName+'/'+name");
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 const name=new URL(req.url,'http://localhost').pathname;requests.push(name);
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Enable audio</button><div id="host"></div><script type="module">window.exercise='+exercise+';document.querySelector("button").onclick=()=>{window.audioEnabled=true;};</script>');return;}
 if(name==='/requests'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(requests));return;}
 const base=name.startsWith('/fixtures/')?path.resolve('build/provider-lossless-audio'):root;
 const file=name==='/example.mp4'?path.resolve('fixtures/example.mp4'):path.resolve(base,name.startsWith('/fixtures/')?name.slice(10):name.slice(1));
 if(name!=='/example.mp4'&&!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const data=await readFile(file);res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
});
server.listen(4178,'127.0.0.1',()=>console.log('Bundle review: http://127.0.0.1:4178'));
