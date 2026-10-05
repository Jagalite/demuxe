// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const app='/Volumes/seed2/Projects/demuxe-release-1.1.0-rc.1-20261005';
const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:app,env:{...process.env,PORT:'0',DEMUXE_RUNTIME_ROOT:app+'/build/qualification/candidate-runtime/assets'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise(r=>child.stdout.on('data',b=>{const m=/http:\/\/127\.0\.0\.1:\d+/.exec(String(b));if(m)r(m[0]);}));
const server=http.createServer(async(req,res)=>{try{if(req.url==='/'||req.url==='/probe-page.js'){const name=req.url==='/'?'repro.html':'probe-page.js';res.setHeader('Content-Type',name.endsWith('html')?'text/html':'text/javascript');res.end(await fs.readFile(new URL(name,import.meta.url)));}else{const r=await fetch(origin+req.url,{headers:req.headers.range?{range:req.headers.range}:{}});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}}catch(e){res.writeHead(500);res.end(String(e));}});
server.listen(4198,'127.0.0.1',()=>console.log('Diagnostic http://127.0.0.1:4198'));
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{child.kill();server.close();process.exit();});
