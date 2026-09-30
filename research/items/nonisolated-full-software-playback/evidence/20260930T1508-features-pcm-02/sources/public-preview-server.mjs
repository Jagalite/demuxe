// SPDX-License-Identifier: MIT
// Maintained private Backend controls and pictures; no CPU measurements.
import http from 'node:http';
import path from 'node:path';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [assetsArg, referencesArg, outputArg] = process.argv.slice(2);
if (!outputArg) throw Error('Usage: node public-preview-server.mjs ENGINE_ASSET_ROOT REFERENCES FRESH_OUTPUT');
const root = path.resolve(import.meta.dirname, '../../../..'), assets = path.resolve(assetsArg), references = path.resolve(referencesArg), output = path.resolve(outputArg);
await mkdir(output, {recursive: false});await mkdir(path.join(output, 'sources'));
await writeFile(path.join(output, 'sources/public-preview-server.mjs'), await readFile(import.meta.filename));
const rows = JSON.parse(await readFile(path.join(references, 'references.json'))).rows.filter(row => !process.env.PLAYBACK_ROW || row.profile.key === process.env.PLAYBACK_ROW);
if (!rows.length || !process.env.PLAYBACK_INSTALLED_ROOT) throw Error('Installed playback assets and matching fixtures required');
const files = new Map(), hashes = {}, report = {scope: (process.env.BACKEND_CHECK==='1'||process.env.FEATURE_CHECK==='1')?'Direct Backend non-isolated playback qualification':'Public Player non-isolated playback qualification', startedAt: new Date().toISOString(), command: process.argv, environment: {runtime: process.env.PLAYBACK_RUNTIME ?? 'jspi', installedRoot: process.env.PLAYBACK_INSTALLED_ROOT, browser: process.env.PLAYBACK_BROWSER ?? 'chrome', row: process.env.PLAYBACK_ROW, negativeOnly:process.env.PLAYBACK_NEGATIVE_ONLY==='1'}, cases: [], sourceSHA256: hashes};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checkName=process.env.FEATURE_CHECK==='1'?'feature-preview-check.mjs':process.env.BACKEND_CHECK==='1'?'backend-preview-check.mjs':'public-preview-check.mjs';
const qualification=await readFile(path.join(root,'research/items/nonisolated-full-software-playback/tests/'+checkName));
await writeFile(path.join(output,'sources/'+checkName),qualification);
hashes['harness:public-preview-server.mjs']={sha256:hash(await readFile(import.meta.filename))};
hashes['harness:'+checkName]={sha256:hash(qualification)};
const snapshots=[];
const heldReads={started:0,active:0,aborted:0};report.heldReads=heldReads;
report.rangeRequests = [];
const server = http.createServer(async (req, res) => {

  try {
    if (req.url === '/') {res.setHeader('Content-Type', 'text/html');res.end('<!doctype html><h1>Non-isolated public playback qualification</h1><div id="status">Ready</div><main></main><script type="module" src="/qualification.mjs"></script>');return;}
    const url = new URL(req.url, 'http://localhost');
    if(url.pathname==='/qualification.mjs'){res.setHeader('Content-Type','text/javascript');res.end(qualification);return;}
    if(url.pathname==='/profiles'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rows.map(r=>r.profile)));return;}
    if(url.pathname==='/result'&&req.method==='POST'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>1024*1024)throw Error('Result limit');}
      const data=JSON.parse(body);report.cases.push(data);report.passed=report.cases.every(c=>c.passed);await Promise.all(snapshots);await writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');res.end('saved');return;
    }
    if(url.pathname.startsWith('/reference-pcm/')){
      const key=url.pathname.slice(15);if(!rows.some(r=>r.profile.key===key))throw Error('Unknown reference');
      const bytes=await readFile(path.join(references,key,'reference.f32'));hashes['reference-pcm:'+key]={sha256:hash(bytes),bytes:bytes.length};res.end(bytes);return;
    }
    if(url.pathname.startsWith('/reference/')){
      const key=url.pathname.slice(11);if(!rows.some(r=>r.profile.key===key))throw Error('Unknown reference');
      const bytes=await readFile(path.join(references,key,'reference.rgb'));hashes['reference:'+key]={sha256:hash(bytes),bytes:bytes.length};res.end(bytes);return;
    }
    const rangeMode = url.searchParams.get('range');
    if (rangeMode) {
      report.rangeRequests.push({mode: rangeMode, range: req.headers.range, authorized: req.headers.authorization === 'Bearer refreshed'});
      if(rangeMode==='held'){
        heldReads.started++;heldReads.active++;
        await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);heldReads.active--;resolve();};const timer=setTimeout(finish,15000);res.once('close',()=>{heldReads.aborted++;finish();});});
        if(res.destroyed)return;
      }
      if (rangeMode === 'authorized' && req.headers.authorization !== 'Bearer refreshed') {res.writeHead(401).end();return;}
      if (rangeMode === 'blocked') {res.writeHead(403).end();return;}
    }
    let file;
    if (url.pathname.startsWith('/fixture/')) file = rows.find(row => row.profile.key === url.pathname.slice(9))?.profile.fixture;
    else {
      const relative = url.pathname.replace(/^\//, '');
      if (!relative.startsWith('web/') && !relative.startsWith('fixtures/')) throw Error('Unknown asset');
      const base = relative.startsWith('web/engine-mpv-playback-') ? path.resolve(process.env.PLAYBACK_INSTALLED_ROOT) : relative.startsWith('web/engine-') || relative.startsWith('fixtures/') ? assets : root;
      file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) throw Error('Invalid asset path');
    }
    if (!file) {res.writeHead(404).end();return;}
    if (!files.has(file)) {
      const bytes = await readFile(file);files.set(file, bytes);hashes[file] = {sha256: hash(bytes), bytes: bytes.length};
      if (file.startsWith(root + '/web/') && /\.m?js$/.test(file)) {
        const target = path.join(output, 'sources', file.slice(root.length + 1));
        snapshots.push((async()=>{await mkdir(path.dirname(target), {recursive: true});await writeFile(target, bytes);})());
      }
    }
    res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : /\.m?js$/.test(file) ? 'text/javascript' : 'application/octet-stream');
    if (rangeMode) {
      const bytes=files.get(file), match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '');
      if (!match) {res.writeHead(400).end();return;}
      const start=Number(match[1]),end=Math.min(Number(match[2]),bytes.length-1);
      if(start>=bytes.length){res.writeHead(416,{'Content-Range':'bytes */'+bytes.length}).end();return;}
      res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1,'ETag':'"private-backend-fixture"'});res.end(bytes.subarray(start,end+1));return;
    }
    res.end(files.get(file));
  } catch (error) {res.writeHead(404).end(String(error));}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
console.log(JSON.stringify({port:server.address().port,output}));
