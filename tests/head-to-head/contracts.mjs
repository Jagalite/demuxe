// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {byteRange,serve} from './server.mjs';
import {markedAudio,markedImage,performanceEligible,selectCases} from './checks.mjs';

test('closed, open and suffix ranges are bounded; malformed/multiple/unsatisfiable ranges reject',()=>{
  assert.deepEqual(byteRange('bytes=2-4',10),{start:2,end:4,status:206});
  assert.deepEqual(byteRange('bytes=8-',10),{start:8,end:9,status:206});
  assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9,status:206});
  for(const bad of ['bytes=10-','bytes=4-2','bytes=-0','bytes=-','bytes=0-1,3-4'])assert.equal(byteRange(bad,10),null);
});
test('marked audio rejects silence, missing channel, swapped channels and wrong tones',()=>{
  const audio=[{channel:0,hz:440,rms:.1},{channel:1,hz:880,rms:.1}];assert(markedAudio({audio}));
  assert(!markedAudio({audio:audio.slice(0,1)}));assert(!markedAudio({audio:audio.map(a=>({...a,rms:0}))}));
  assert(!markedAudio({audio:audio.map(a=>({...a,channel:1-a.channel}))}));
  assert(!markedAudio({audio:audio.map(a=>({...a,hz:1200}))}));
});
function png(rgb) {
  const chunk=(name,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(name,4);data.copy(b,8);return b;};
  const header=Buffer.alloc(13);header.writeUInt32BE(32);header.writeUInt32BE(18,4);header[8]=8;header[9]=2;
  const pixels=Buffer.alloc(18*97);
  for(let y=0;y<18;y++)for(let x=0;x<32;x++)for(let c=0;c<3;c++)pixels[y*97+1+x*3+c]=rgb[c];
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
test('display oracle rejects black and stale timeline markers',()=>{
  assert(markedImage(png([255,0,0]),1).markerCorrect);
  assert(!markedImage(png([255,0,0]),6).markerCorrect);
  assert(markedImage(png([0,0,255]),6).markerCorrect);
  assert(!markedImage(png([0,0,0]),1).markerCorrect);
});
test('performance requires matching passed correctness, assets, harness and exact browser profile',()=>{
  const identity={assetsSHA256:'a',harnessSHA256:'h',browserIdentity:'b'};
  const record={kind:'correctness',...identity,cases:[{id:'x',status:'passed'}]};
  assert(performanceEligible(record,identity,'x'));
  assert(!performanceEligible(record,identity,'y'));
  for(const name of Object.keys(identity))assert(!performanceEligible(record,{...identity,[name]:'changed'},'x'));
  assert(!performanceEligible({...record,cases:[{id:'x',status:'blocked'}]},identity,'x'));
});
test('case selection fails on typo instead of silently reducing requested coverage',()=>{
  const matrix={cases:[{id:'a.default',player:'a'},{id:'b.default',player:'b'}]};
  assert.equal(selectCases(matrix,'a').length,1);assert.equal(selectCases(matrix,'all').length,2);
  assert.throws(()=>selectCases(matrix,'a,typo'));
});
test('server serves byte-exact ranges and refuses symlink escapes',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'head-to-head-contract-'));
  const assets=path.join(root,'assets');await fs.mkdir(assets);await fs.writeFile(path.join(assets,'sample.bin'),'0123456789');
  await fs.writeFile(path.join(root,'outside.txt'),'private');await fs.symlink(path.join(root,'outside.txt'),path.join(assets,'escape'));
  const server=await serve(assets,assets,path.join(root,'requests.jsonl'));
  try {
    const response=await fetch(server.origin+'/sample.bin',{headers:{Range:'bytes=-3'}});
    assert.equal(response.status,206);assert.equal(await response.text(),'789');assert.equal(response.headers.get('content-range'),'bytes 7-9/10');
    assert.equal((await fetch(server.origin+'/sample.bin',{headers:{Range:'bytes=20-'}})).status,416);
    assert.equal((await fetch(server.origin+'/escape')).status,403);
    const head=await fetch(server.origin+'/sample.bin',{method:'HEAD'});assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
  } finally {await server.close();await fs.rm(root,{recursive:true,force:true});}
});
test('run verifier accepts retained failures but detects evidence tampering',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'head-to-head-evidence-'));
  try {
    const record={id:'example',status:'failed',recordPath:'result.json'};
    const summary={kind:'correctness',finishedAt:'2026-01-01T00:00:00Z',selected:['example'],cases:[record],counts:{failed:1}};
    const files={'result.json':JSON.stringify(record),'summary.json':JSON.stringify(summary)};
    const hashes={};
    for(const [name,body]of Object.entries(files)){await fs.writeFile(path.join(root,name),body);hashes[name]=createHash('sha256').update(body).digest('hex');}
    await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({sha256:hashes}));
    const verify=()=>execFileSync(process.execPath,[path.join(import.meta.dirname,'verify.mjs'),root],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    assert.equal(JSON.parse(verify()).integrityPassed,true);
    await fs.writeFile(path.join(root,'result.json'),JSON.stringify({...record,status:'passed'}));
    assert.throws(verify,error=>error.status===1&&error.stdout.includes('Changed: result.json'));
  } finally {await fs.rm(root,{recursive:true,force:true});}
});
