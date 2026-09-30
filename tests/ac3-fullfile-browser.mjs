// SPDX-License-Identifier: Apache-2.0
// Run this server, then click Run in the collaborative browser. Results bind
// fixture/build hashes and decoded output; no browser automation is embedded.
// AC3_BUILDS=<native build parent> AC3_CONSUMER=<installed consumer>
// node tests/ac3-fullfile-browser.mjs  (PORT defaults to 4186)
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),out=path.resolve(process.env.AC3_OUTPUT??'build/codec-expansion/ac3-fullfile');
const builds=process.env.AC3_BUILDS??'/Volumes/seed2/Projects/demuxe-codec-preparation-builds';
const consumer=process.env.AC3_CONSUMER&&path.resolve(process.env.AC3_CONSUMER);
const sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
const fixtures=[];
for(const [codec,channels] of [['ac3',2],['ac3',6],['eac3',2],['eac3',6],['aac',2]]){
 const id=codec+'-'+channels,file=path.join(out,id+'.mkv');
 const tone=Array.from({length:channels},(_,i)=>`0.04*sin(2*PI*${330+i*110}*t)`).join('|');
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=24','-f','lavfi','-i',`aevalsrc=${tone}:s=48000:c=${channels===2?'stereo':'5.1(side)'}`,'-t','8','-c:v','libx264','-preset','ultrafast','-bf','2','-g','24','-c:a',codec,'-b:a','384k',file]);
 fixtures.push({id,codec,channels,file,negative:codec==='aac',sha256:sha(await readFile(file))});
}
// An explicit padded-size case exercises the >64 MiB route boundary and
// bounded reads. It does not stand in for long-duration media qualification.
const large=path.join(out,'ac3-2-large.mkv');
// Keep the requested seek plus forward preload before EOF: trailing padding
// intentionally lies outside the media segment and may be scanned at EOF.
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=24','-f','lavfi','-i','aevalsrc=0.04*sin(2*PI*330*t)|0.04*sin(2*PI*440*t):s=48000:c=stereo','-t','20','-c:v','libx264','-preset','ultrafast','-bf','2','-g','24','-c:a','ac3','-b:a','384k',large]);
const padding=65*1024*1024,handle=await open(large,'r+');
try{const {size}=await handle.stat();await handle.write(Buffer.from([0xec,0x10|(padding>>>24),padding>>>16&255,padding>>>8&255,padding&255]),0,5,size);await handle.truncate(size+5+padding);}finally{await handle.close();}
fixtures.push({id:'ac3-2-large',codec:'ac3',channels:2,file:large,large:true,sha256:sha(await readFile(large))});
const records={};
for(const runtime of ['jspi','asyncify']){
 const dir=path.join(builds,'ac3-eac3-'+runtime+'-01'),record=JSON.parse(await readFile(dir+'/build-result.json'));
 assert.deepEqual(record.enabledDecoders,['AC3','EAC3']);
 for(const leaf of ['remux.mjs','remux.wasm'])assert.equal(sha(await readFile(dir+'/engine/'+leaf)),record.artifacts[leaf]);
 records[runtime]={directory:dir,artifacts:record.artifacts,wasmBytes:(await readFile(dir+'/engine/remux.wasm')).length};
}
const report={passed:false,fixtures,builds:records,cases:[],scope:'AC3/EAC3 stereo and 5.1 synthetic reordered-AVC fixtures plus a 65 MiB padded-size boundary case; exact copied video, decoded PCM tolerance and installed Player lifecycle. No long-duration, Firefox or release qualification.'};
report.hostFFmpeg=execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0];
report.testSources={};for(const file of ['tests/ac3-fullfile-browser.mjs','tests/ac3-fullfile-page.mjs','tests/ac3-fullfile-consumer.mjs','tests/provider-lossless-broad-worker.mjs'])report.testSources[file]=sha(await readFile(file));
if(consumer)report.testQualification=JSON.parse(await readFile(consumer+'/test-qualification.json'));
const requests=[];
const html=`<!doctype html><meta charset="utf-8"><title>AC3 full-file qualification</title><button id="run">Run AC3 full-file tests</button><pre id="status">Ready</pre><div id="player"></div><script type="module" src="/test-page.mjs"></script>`;
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const url=new URL(req.url,'http://localhost'),name=url.pathname;requests.push(name);
 try{
  if(name==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(name==='/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({fixtures,consumer:!!consumer}));return;}
  if(name==='/result'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=JSON.parse(Buffer.concat(chunks));
   Object.assign(report,data,{requests});const text=JSON.stringify(report,null,2)+'\n';await writeFile(out+'/attempt-'+Date.now()+'.json',text);await writeFile(out+'/result.json',text);res.end('saved');console.log('AC3 result',report.passed,report.error??'');return;
  }
  if(name==='/validate'){
   const fixture=fixtures.find(f=>f.id===url.searchParams.get('id'));assert.ok(fixture);const runtime=url.searchParams.get('runtime');assert.ok(records[runtime]);
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks);assert.ok(bytes.length<32*1024*1024);
   const file=out+'/'+fixture.id+'-'+runtime+'.mp4';await writeFile(file,bytes);
   const raw=(p,audio)=>execFileSync('ffmpeg',['-v','error','-i',p,'-map',audio?'0:a:0':'0:v:0',...(audio?['-c:a','pcm_f32le','-f','f32le']:['-c:v','rawvideo','-f','rawvideo']),'-'],{maxBuffer:32*1024*1024});
   const expected=raw(fixture.file,true),actual=raw(file,true);assert.equal(actual.length,expected.length,'Decoded sample count');
   let maxError=0,energy=0;for(let at=0;at<actual.length;at+=4){const a=actual.readFloatLE(at),b=expected.readFloatLE(at);maxError=Math.max(maxError,Math.abs(a-b));energy+=a*a;}assert.ok(Number.isFinite(maxError)&&maxError<=2e-6,'PCM error '+maxError);assert.ok(energy>1);
   assert.equal(sha(raw(file,false)),sha(raw(fixture.file,false)),'Copied video');
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({outputSHA256:sha(bytes),samples:actual.length/4/fixture.channels,maxPCMError:maxError,videoDecodedExact:true}));return;
  }
  let file;
  if(name==='/test-page.mjs')file=root+'/tests/ac3-fullfile-page.mjs';
  else if(name.startsWith('/fixtures/')){const fixture=fixtures.find(f=>f.id+'.mkv'===name.slice(10));assert.ok(fixture);file=fixture.file;}
  else if(name.startsWith('/engines/')){const [, ,runtime,leaf]=name.split('/');assert.ok(records[runtime]&&['remux.mjs','remux.wasm'].includes(leaf));file=records[runtime].directory+'/engine/'+leaf;}
  else if(name.startsWith('/repository/')){const relative=name.slice(12);assert.ok(['tests/provider-lossless-broad-worker.mjs','web/private-ffmpeg/bridge.js','web/private-ffmpeg/single-owner.js','web/private-ffmpeg/range-source.js'].includes(relative));file=root+'/'+relative;}
  else if(consumer){file=path.resolve(consumer,'.'+name);assert.ok(file.startsWith(consumer+path.sep));}
  else throw Error('Unknown path');
  const bytes=await readFile(file);res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.json')?'application/json':'application/octet-stream');res.end(bytes);
 }catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end(String(e.stack));}
});
await new Promise(r=>server.listen(Number(process.env.PORT??4186),'127.0.0.1',r));console.log('AC3 browser server http://127.0.0.1:'+server.address().port+' PID '+process.pid);
