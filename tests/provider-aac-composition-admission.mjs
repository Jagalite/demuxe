// SPDX-License-Identifier: Apache-2.0
// Real admitted movies prove exported repair cannot bypass the finite recipe.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const home=await mkdtemp(path.join(os.tmpdir(),'demuxe-aac-admission-'));
const sourceNames=['packages/provider-container/src/audio-repair.ts','packages/provider-container/src/isobmff.ts','packages/provider-container/src/fmp4.ts','packages/provider-container/src/matroska.ts','packages/provider-container/src/wave-aiff.ts','packages/provider-container/src/wma-format.ts','packages/provider-audio/src/aac-config.ts','tests/provider-aac-composition-admission.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=Object.fromEntries(await Promise.all(sourceNames.map(async p=>[p,sha(await readFile(p))])));
execFileSync('node_modules/.bin/tsc',['--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022,DOM','--strict','--skipLibCheck','--outDir',home+'/compiled',...sourceNames.filter(p=>p.endsWith('.ts'))],{stdio:'inherit'});
await writeFile(home+'/compiled/package.json','{"type":"module"}');
const {repairIsoBmffAudio}=await import(pathToFileURL(home+'/compiled/provider-container/src/audio-repair.js'));
const {IsoBmffReader}=await import(pathToFileURL(home+'/compiled/provider-container/src/isobmff.js'));
const root=process.env.AAC_COMPOSITION_FIXTURE_ROOT??'/tmp/demuxe-aac-p23-compositions';
const manifestBytes=await readFile(root+'/fixtures.json'),fixtures=JSON.parse(manifestBytes),results=[];
assert.equal(fixtures.length,5);
async function source(f){const bytes=await readFile(f.input);assert.equal(sha(bytes),f.inputSHA256);return bytes;}
function components(f,overrides={}){return {codec:'aac',container:'isobmff',aacProfile:f.aacProfile,sampleRate:f.sampleRate,channels:f.channels,output:'flac',...overrides};}
async function rejectBeforeFactories(id,bytes,config,pattern){let decoder=0,encoder=0;
 await assert.rejects(()=>repairIsoBmffAudio(new Blob([bytes]),{...config,decoder(){decoder++;throw Error('Unexpected decoder acquisition');},encoder(){encoder++;throw Error('Unexpected encoder acquisition');}},new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH'&&pattern.test(e.message));
 assert.equal(decoder,0);assert.equal(encoder,0);results.push({id,passed:true,decoderFactories:decoder,encoderFactories:encoder});
}
// Positive metadata admission separately proves controls are not malformed input.
for(const f of fixtures){const bytes=await source(f),reader=await IsoBmffReader.open(new Blob([bytes]),new AbortController().signal,{aacProfile:f.aacProfile});assert.equal(reader.tracks.filter(t=>t.kind==='audio').length,1);results.push({id:f.id+'-reader',passed:true,inputSHA256:sha(bytes)});}
const usac=fixtures.find(f=>f.aacProfile==='usac'&&f.sampleRate===48000),he=fixtures.find(f=>f.aacProfile==='he'),ps=fixtures.find(f=>f.aacProfile==='he-v2');
for(const [id,f,override]of[
 ['usac-opus-bypass',usac,{output:'opus'}],['usac-mono32000',usac,{channels:1,sampleRate:32000}],['usac-multichannel',usac,{channels:6}],['usac-rate96000',usac,{sampleRate:96000}],
 ['he-rate44100',he,{sampleRate:44100}],['he-mono',he,{channels:1}],['ps-rate48000',ps,{sampleRate:48000}],['unknown-profile',he,{aacProfile:'unknown'}],
])await rejectBeforeFactories(id,await source(f),components(f,override),/explicit AAC composition profile/);
// Retain HE48 Opus admission. Acquisition sentinel proves the new guard does
// not reject this maintained tuple, without pretending to decode native audio.
const heBytes=await source(he);let acquired=0;await assert.rejects(()=>repairIsoBmffAudio(new Blob([heBytes]),{...components(he,{output:'opus'}),decoder(){acquired++;throw Error('Qualified HE48 acquisition');},encoder(){throw Error('Unexpected encoder');}},new AbortController().signal),/Qualified HE48 acquisition/);assert.equal(acquired,1);results.push({id:'he48-opus-still-admitted',passed:true});
// Structural box locations avoid selecting marker bytes inside compressed data.
function children(b,start=0,end=b.length){const rows=[];for(let p=start;p<end;){const size=b.readUInt32BE(p);assert.ok(size>=8&&p+size<=end);rows.push({type:b.toString('latin1',p+4,p+8),start:p+8,end:p+size});p+=size;}return rows;}
function audioEdit(b){const moov=children(b).find(x=>x.type==='moov');for(const trak of children(b,moov.start,moov.end).filter(x=>x.type==='trak')){const boxes=children(b,trak.start,trak.end),mdia=boxes.find(x=>x.type==='mdia'),hdlr=children(b,mdia.start,mdia.end).find(x=>x.type==='hdlr');if(b.toString('latin1',hdlr.start+8,hdlr.start+12)!=='soun')continue;const edts=boxes.find(x=>x.type==='edts');return children(b,edts.start,edts.end).find(x=>x.type==='elst').start;}throw Error('Audio edit missing');}
const original=await source(usac),edit=audioEdit(original);assert.equal(original[edit],0);
const fractionalFixture=fixtures.find(f=>f.aacProfile==='usac'&&f.sampleRate===44100),fractionalBytes=Buffer.from(await source(fractionalFixture)),fractionalEdit=audioEdit(fractionalBytes);fractionalBytes.writeUInt32BE(fractionalBytes.readUInt32BE(fractionalEdit+8)-1,fractionalEdit+8);
await rejectBeforeFactories('fractional-interior-edit',fractionalBytes,components(fractionalFixture),/^Fractional ISO AAC edit sample$/);
const overlong=Buffer.from(original);overlong.writeUInt32BE(overlong.readUInt32BE(edit+8)+100,edit+8);await rejectBeforeFactories('overlong-endpoint-edit',overlong,components(usac),/^Unsupported ISO edit trim$/);
// An actual qualified file with the wrong explicit profile must fail before
// factory allocation even when its channel/rate tuple overlaps another profile.
await rejectBeforeFactories('real-usac-as-he',original,components(usac,{aacProfile:'he'}),/Unqualified explicit AAC extension configuration/);
for(const [name,hash]of Object.entries(sources))assert.equal(sha(await readFile(name)),hash,'Source changed during admission proof');
const report={passed:true,scope:'Exported ISO AAC finite composition preflight, real source edit/ASC controls and zero factory acquisition for unsupported tuples; no native or browser playback claim',sources,fixtureManifestSHA256:sha(manifestBytes),results};
await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/aac-composition-admission.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,controls:results.length,home}));
