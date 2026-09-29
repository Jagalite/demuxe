import {Worker} from 'node:worker_threads';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dirs=process.argv.slice(2);const out='results/microcodec';await mkdir(out,{recursive:true});
const {fixtures}=JSON.parse(await readFile('build/microcodec/fixtures/manifest.json'));
for(const dir0 of dirs){const dir=path.resolve(dir0),name=path.basename(dir);const results=[];for(const f of fixtures.filter(f=>name.includes('dts')?f.kind===2:f.kind<2)){
 const output=path.resolve(out,`${name}-${f.name}.f32`);const r=await new Promise((resolve,reject)=>{const w=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{dir,fixture:f,output}});w.on('message',resolve);w.on('error',reject);});
 if(r.error)throw Error(r.error);const actual=await readFile(output),ref=await readFile(f.pcm);let maxAbs=0;assert.equal(actual.length,ref.length);for(let i=0;i<actual.length;i+=4)maxAbs=Math.max(maxAbs,Math.abs(actual.readFloatLE(i)-ref.readFloatLE(i)));
 r.nativeReference={maxAbs,tolerance:1e-5,pass:maxAbs<=1e-5};r.fixture=f.name;r.rate=48000;r.channels=f.channels;results.push(r);console.log(name,f.name,actual.length,maxAbs,r.resetResults);
 }await writeFile(out+'/'+name+'.json',JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,results},null,2));}
