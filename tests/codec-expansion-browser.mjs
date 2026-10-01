// SPDX-License-Identifier: Apache-2.0
// Serve the installed assets/embedded matrix for the collaborative browser.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {prepareAudioTimingReference} from './provider-conformance/audio-fixtures.mjs';
const root=process.cwd(),home=path.resolve('build/codec-expansion');
const installed=JSON.parse(await readFile(home+'/installed.json'));
const fixtures=JSON.parse(await readFile(home+'/decoder-fixtures/fixtures.json'));
const out=home+'/browser';await mkdir(out,{recursive:true});
const requests=[],sha=b=>createHash('sha256').update(b).digest('hex');
const html='<!doctype html><meta charset="utf-8"><title>Codec expansion installed tests</title><button id="run">Run installed codec tests</button><pre id="status">Ready</pre><div id="players"></div><script type="module" src="/page.mjs"></script>';
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 try{
  const url=new URL(req.url,'http://localhost'),name=url.pathname;requests.push(name);
  if(name==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(name==='/result'){
   const chunks=[];for await(const c of req)chunks.push(c);const result=JSON.parse(Buffer.concat(chunks));
   await writeFile(out+'/results.json',JSON.stringify({...result,installed,requests},null,2)+'\n');res.end('saved');console.log('Browser matrix',result.passed,result.results.length,result.error??'');return;
  }
  if(name.startsWith('/timing/')){
   const f=fixtures.find(f=>f.id===name.slice('/timing/'.length));assert.ok(f);
   res.setHeader('Content-Type','application/json');
   res.end(JSON.stringify(await prepareAudioTimingReference({...f,input:path.resolve(f.input)})));return;
  }
  if(name==='/validate'){
   const f=fixtures.find(f=>f.id===url.searchParams.get('id'));assert.ok(f);const encoding=url.searchParams.get('encoding');assert.ok(['flac','opus'].includes(encoding));
   const chunks=[];let size=0;for await(const c of req){size+=c.length;assert.ok(size<32*1024*1024);chunks.push(c);}const data=Buffer.concat(chunks),file=out+'/'+f.id+'-'+encoding+'.mp4';await writeFile(file,data);
   const audio=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','f32le','-'],{maxBuffer:32*1024*1024});
   const actual=audio(file),reference=audio(path.resolve(f.input));assert.ok(actual.length>=reference.length);
   if(encoding==='flac')assert.equal(actual.length,reference.length);else assert.ok(actual.length-reference.length<=960*8);
   let energy=0,error=0,maxError=0;for(let i=0;i<reference.length;i+=4){const a=actual.readFloatLE(i),b=reference.readFloatLE(i);energy+=b*b;error+=(a-b)**2;maxError=Math.max(maxError,Math.abs(a-b));}
   assert.ok(Number.isFinite(error)&&energy>0);const snr=10*Math.log10(energy/Math.max(error,1e-30));
   if(encoding==='flac')assert.ok(maxError<2e-5,'PCM mismatch '+maxError);else assert.ok(snr>15,'Opus quality '+snr);
   let integerExact=false;
   if(encoding==='flac'&&['flac','alac','pcm-s16le','pcm-s24le','pcm-s32le'].includes(f.codec)){
    const integer=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','s32le','-'],{maxBuffer:32*1024*1024});
    assert.deepEqual(integer(file),integer(path.resolve(f.input)),'Exact integer composition PCM mismatch');integerExact=true;
   }
   const video=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:v:0','-f','rawvideo','-'],{maxBuffer:32*1024*1024});assert.equal(sha(video(file)),sha(video(path.resolve(f.input))));
   res.end(JSON.stringify({passed:true,samples:reference.length/8,maxError,snr,integerExact,videoExact:true,outputSHA256:sha(data)}));return;
  }
  let file;
  if(name==='/page.mjs')file=root+'/tests/codec-expansion-page.mjs';
  else if(name==='/provider-conformance/audio-decoder.mjs')file=root+'/tests/provider-conformance/audio-decoder.mjs';
  else if(name==='/cases.json')file=installed.work+'/cases.json';
  else if(name.startsWith('/fixtures/')){
   const relative=name.slice(10);assert.ok(fixtures.some(f=>['json','mkv','mov','f32','s32','f64'].some(ext=>relative===f.id+'.'+ext)));file=home+'/decoder-fixtures/'+relative;
  }else if(name.startsWith('/bundles/')){file=path.resolve(installed.work,'.'+name);assert.ok(file.startsWith(installed.work+'/bundles/'));}
  else throw Error('Unknown test path');
  res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(await readFile(file));
 }catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end(String(e.stack));}
});
await new Promise(r=>server.listen(Number(process.env.PORT??4187),'127.0.0.1',r));console.log('Codec expansion tests http://127.0.0.1:'+server.address().port);
