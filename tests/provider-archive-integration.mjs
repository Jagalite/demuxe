// SPDX-License-Identifier: Apache-2.0
// Real native owner dispatch and maintained recipe guards; installed browser matrix is separate.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const home=await mkdtemp(path.join(os.tmpdir(),'demuxe-archive-owner-')),sha=b=>createHash('sha256').update(b).digest('hex'),profiles=JSON.parse(await readFile('licensing/provider-packages.json'));
execFileSync('node_modules/.bin/tsc',['--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022,DOM','--strict','--skipLibCheck','--rootDir',process.cwd(),'--outDir',home+'/compiled',...profiles.profiles.container.sources,'src/internal/component-recipes.ts'],{stdio:'inherit'});await writeFile(home+'/compiled/package.json','{"type":"module"}');
const {createComponentOwners}=await import(pathToFileURL(home+'/compiled/packages/provider-container/src/owners.js')),{audioRepairRecipe,webmPacketCopyRecipe}=await import(pathToFileURL(home+'/compiled/src/internal/component-recipes.js'));
const assets=[],bytes=new Map(),providerAssets={'ts-container':['container-js']},providers=[{id:'ts-container',implementationIdentity:'reviewed-container'}];bytes.set('container-js',new ArrayBuffer(0));
for(const [profile,pointerName] of [['archive','/tmp/demuxe-archive-audio-builds/archive.json'],['flac','/tmp/demuxe-flac-rate-builds/flac.json'],['opus-encoder','build/codec-expansion/decoder-families/opus-encoder.json'],['archive-more','/tmp/demuxe-archive-more-builds/archive-more.json']]){const pointer=JSON.parse(await readFile(pointerName)),raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);const record=JSON.parse(raw),folder=home+'/web/providers/audio/'+profile;await mkdir(folder,{recursive:true});providerAssets['audio-'+profile]=[];providers.push({id:'audio-'+profile,implementationIdentity:pointer.recordSHA256});for(const name of ['module.mjs','module.wasm']){const data=await readFile(pointer.directory+'/'+name);assert.equal(sha(data),record.artifacts[name].sha256);await writeFile(folder+'/'+name,data);const id=profile+'-'+name;assets.push({id,url:pathToFileURL(folder+'/'+name).href});providerAssets['audio-'+profile].push(id);bytes.set(id,data.buffer.slice(data.byteOffset,data.byteOffset+data.length));}}
const base=pathToFileURL(home+'/'),deployment={catalog:{providers},assets,providerAssets},fixtureRoot='/tmp/demuxe-archive-audio-fixtures',wv=JSON.parse(await readFile(fixtureRoot+'/fixtures.json')).find(f=>f.id==='wavpack16-48000-2'),ape=JSON.parse(await readFile(fixtureRoot+'/fixtures.json')).find(f=>f.id==='ape-canonical');
async function setup(){const value=createComponentOwners(deployment,base),abort=new AbortController(),handles=[];for(const owner of value.owners){const result=await owner.prepare({signal:abort.signal,asset:async id=>bytes.get(id)});assert.equal(result.state,'ready');handles.push(result);}return {value,abort,dispose(){abort.abort();for(const h of handles)h.dispose();}};}
function idle(value){assert.ok(value.readiness().filter(r=>r.instance!=='none').every(r=>r.instance==='idle-reusable'));}
test('standalone archive recipes select exact container/decode/encode capabilities and reject incompatible sources',()=>{
 for(const [codec,container,rate,channels]of [['ape','ape',44100,2],['wavpack','wavpack',44100,1],['wavpack','wavpack',48000,8],['wavpack','wavpack',96000,6],['tta','tta',44100,6],['tta','tta',48000,2]]){const recipe=audioRepairRecipe(codec,channels,'flac',container,rate);assert.deepEqual(recipe.bindings[0].assignments.map(a=>a.providerId),['ts-container',codec==='tta'?'audio-archive-more':'audio-archive','audio-flac']);assert.equal(recipe.requirements[0].capability,'container.read.'+container);assert.equal(recipe.requirements[2].profile,'configured-integer');}
 assert.equal(audioRepairRecipe('wavpack',2,'opus','wavpack',48000).bindings[0].assignments[2].providerId,'audio-opus-encoder');
 for(const args of [['ape',2,'opus','ape',44100],['ape',2,'flac','ape',48000],['ape',1,'flac','ape',44100],['ape',2,'flac','matroska',44100],['wavpack',2,'flac','ape',44100],['flac',2,'flac','wavpack',48000],['wavpack',6,'flac','wavpack',44100],['wavpack',1,'opus','wavpack',48000],['tta',2,'flac','matroska',48000],['tta',8,'flac','tta',48000],['tta',2,'flac','tta',96000]])assert.throws(()=>audioRepairRecipe(...args));
 assert.deepEqual(webmPacketCopyRecipe().bindings[0].assignments.map(a=>a.providerId),['ts-container']);
});
test('real archive owners dispatch WV/APE, enforce busy exclusivity and release early iterators',async()=>{
 const t=await setup();try{
  for(const f of [wv,ape]){const input=await readFile(f.input),result=await t.value.execute(new Blob([input]),f.codec,'fine',new AbortController().signal,f.channels,'flac',f.codec,f.sampleRate);assert.equal(result.type,'audio/mp4');idle(t.value);}
  const source=new Blob([await readFile(wv.input)]),iterator=t.value.executeFragments(source,'wavpack','fine',new AbortController().signal,2,'flac','wavpack',48000);await iterator.next();assert.ok(t.value.readiness().some(r=>r.instance==='busy'));await assert.rejects(()=>t.value.execute(source,'wavpack','fine',new AbortController().signal,2,'flac','wavpack',48000),/already active/);await iterator.return();idle(t.value);assert.ok((await t.value.execute(source,'wavpack','fine',new AbortController().signal,2,'flac','wavpack',48000)).size>0);idle(t.value);
  const abort=new AbortController(),stream=t.value.executeFragments(source,'wavpack','fine',abort.signal,2,'flac','wavpack',48000);await stream.next();await stream.next();abort.abort();await assert.rejects(()=>stream.next(),e=>e.name==='AbortError');idle(t.value);
 }finally{t.dispose();}
});
test('TTA owner dispatch selects archive-more and resets busy after generator return',async()=>{
 const t=await setup();try{const fixtures=JSON.parse(await readFile('/tmp/demuxe-tta-fixtures/fixtures.json'));for(const [id,output]of [['tta16-44100-6','flac'],['tta24-48000-2','opus']]){const f=fixtures.find(f=>f.id===id),input=new Blob([await readFile(f.input)]),result=await t.value.execute(input,'tta','fine',new AbortController().signal,f.channels,output,'tta',f.sampleRate);assert.equal(result.type,'audio/mp4');idle(t.value);}
 const f=fixtures.find(f=>f.id==='tta16-48000-2'),source=new Blob([await readFile(f.input)]),stream=t.value.executeFragments(source,'tta','fine',new AbortController().signal,2,'flac','tta',48000);await stream.next();await stream.return();idle(t.value);assert.ok((await t.value.execute(source,'tta','fine',new AbortController().signal,2,'flac','tta',48000)).size>0);idle(t.value);
 }finally{t.dispose();}
});

test('source/output/WebM failures restore owner readiness for a subsequent valid preparation',async()=>{
 const t=await setup();try{const source=new Blob([await readFile(wv.input)]),apeSource=new Blob([await readFile(ape.input)]);
  await assert.rejects(()=>t.value.execute(source,'wavpack','fine',new AbortController().signal,1,'flac','wavpack',48000),e=>e.code==='PROVIDER_PROFILE_MISMATCH');idle(t.value);
  await assert.rejects(()=>t.value.execute(apeSource,'ape','fine',new AbortController().signal,2,'opus','ape',44100),e=>e.code==='PROVIDER_PROFILE_MISMATCH');idle(t.value);
  await assert.rejects(()=>t.value.executeWebmCopy(new Blob(['invalid']),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');idle(t.value);
  const a=new AbortController();a.abort();await assert.rejects(()=>t.value.executeWebmCopy(source,a.signal),e=>e.name==='AbortError');idle(t.value);
  assert.ok((await t.value.execute(source,'wavpack','fine',new AbortController().signal,2,'flac','wavpack',48000)).size>0);idle(t.value);
 }finally{t.dispose();}
});
