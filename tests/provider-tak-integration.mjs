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
for(const [profile,pointerName] of [['archive-next','/tmp/demuxe-tak-builds/archive-next.json'],['flac','/tmp/demuxe-flac-rate-builds/flac.json']]){const pointer=JSON.parse(await readFile(pointerName)),raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);const record=JSON.parse(raw),folder=home+'/web/providers/audio/'+profile;await mkdir(folder,{recursive:true});providerAssets['audio-'+profile]=[];providers.push({id:'audio-'+profile,implementationIdentity:pointer.recordSHA256});for(const name of ['module.mjs','module.wasm']){const data=await readFile(pointer.directory+'/'+name);assert.equal(sha(data),record.artifacts[name].sha256);await writeFile(folder+'/'+name,data);const id=profile+'-'+name;assets.push({id,url:pathToFileURL(folder+'/'+name).href});providerAssets['audio-'+profile].push(id);bytes.set(id,data.buffer.slice(data.byteOffset,data.byteOffset+data.length));}}
const base=pathToFileURL(home+'/'),deployment={catalog:{providers},assets,providerAssets},fixtureRoot='/tmp/demuxe-tak-fixtures',tak=JSON.parse(await readFile(fixtureRoot+'/fixtures.json'))[0];
async function setup(){const value=createComponentOwners(deployment,base),abort=new AbortController(),handles=[];for(const owner of value.owners){const result=await owner.prepare({signal:abort.signal,asset:async id=>bytes.get(id)});assert.equal(result.state,'ready');handles.push(result);}return {value,abort,dispose(){abort.abort();for(const h of handles)h.dispose();}};}
function idle(value){assert.ok(value.readiness().filter(r=>r.instance!=='none').every(r=>r.instance==='idle-reusable'));}
test('TAK recipe selects archive-next, exact original clock and FLAC output only',()=>{
 const recipe=audioRepairRecipe('tak',1,'flac','tak',44100);assert.deepEqual(recipe.bindings[0].assignments.map(a=>a.providerId),['ts-container','audio-archive-next','audio-flac']);assert.equal(recipe.requirements[0].capability,'container.read.tak');assert.equal(recipe.requirements[2].profile,'canonical-integer');
 for(const args of [['tak',1,'opus','tak',44100],['tak',2,'flac','tak',44100],['tak',1,'flac','tak',48000],['tak',1,'flac','matroska',44100],['tta',1,'flac','tak',44100]])assert.throws(()=>audioRepairRecipe(...args));
});
test('TAK owner performs exact complete native conversion and restores readiness after every exit',async()=>{
 const t=await setup();try{
  const input=await readFile(tak.input);assert.equal(sha(input),tak.inputSHA256);const source=new Blob([input]),reference=await readFile(fixtureRoot+'/'+tak.id+'.s32');assert.equal(sha(reference),tak.referenceSHA256);
  const prepared=await t.value.execute(source,'tak','fine',new AbortController().signal,1,'flac','tak',44100),out=home+'/tak.mp4';await writeFile(out,Buffer.from(await prepared.arrayBuffer()));const actual=execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',out,'-map','0:a:0','-f','s32le','-'],{maxBuffer:32*1024*1024});assert.deepEqual(actual,reference);idle(t.value);
  const stream=t.value.executeFragments(source,'tak','fine',new AbortController().signal,1,'flac','tak',44100);await stream.next();assert.ok(t.value.readiness().some(r=>r.instance==='busy'));await assert.rejects(()=>t.value.execute(source,'tak','fine',new AbortController().signal,1,'flac','tak',44100),/already active/);await stream.return();idle(t.value);
  const abort=new AbortController(),flow=t.value.executeFragments(source,'tak','fine',abort.signal,1,'flac','tak',44100);await flow.next();abort.abort();await assert.rejects(()=>flow.next(),e=>e.name==='AbortError');idle(t.value);
  const corrupt=Buffer.from(input);corrupt[8]^=1;await assert.rejects(()=>t.value.execute(new Blob([corrupt]),'tak','fine',new AbortController().signal,1,'flac','tak',44100),e=>e.code==='PROVIDER_PROFILE_MISMATCH');idle(t.value);
  const before=new AbortController();before.abort();await assert.rejects(()=>t.value.execute(source,'tak','fine',before.signal,1,'flac','tak',44100),e=>e.name==='AbortError');idle(t.value);
 }finally{t.dispose();}
});
