// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import {fixtureBytes,prepareFixtures,sha,collect} from './container-specific-common.mjs';
import {checkIsoBmff,isoBmffRejections} from './container-specific-isobmff.mjs';
import {checkOgg,oggRejections,speexRejections} from './container-specific-ogg.mjs';
import {checkWave,waveRejections,aiffRejections} from './container-specific-wave.mjs';
import {checkMpegTs,tsRejections} from './container-specific-ts.mjs';
import {retainedFixtures,checkArchive,archiveRejections,rawG726Rejections} from './container-specific-archive.mjs';
import {checkWebm,webmRejections} from './container-specific-webm.mjs';
const contracts={
 'container.read.ape':['finite-clear-audio','ape','openApe'],
 'container.read.wavpack':['finite-clear-audio','wavpack','openWavpack'],
 'container.read.tta':['finite-clear-audio','tta','openTta'],
 'container.read.tak':['finite-clear-audio','tak','openTak'],
 'container.read.shorten':['finite-clear-audio','shorten','openShorten'],
 'container.read.adpcm-wave':['finite-clear-audio','adpcm-wave','openAdpcmWave'],
 'container.read.telephony':['finite-clear-audio','telephony','openTelephony'],
 'container.read.g726':['finite-clear-audio','g726','openG726'],
 'container.read.isobmff':['finite-clear-av','isobmff','openIsoBmff'],
 'container.read.ogg':['finite-clear-audio','ogg','openOgg'],
 'container.read.wave-aiff':['finite-clear-audio','wave-aiff','openWaveAiff'],
 'container.read.mpegts':['finite-pes-av','mpegts','openMpegTs'],
 'container.read.matroska':['finite-clear-webm','webm','openWebm'],
 'container.mux.webm':['explicit-timeline-av','webm','openWebm'],
};
export async function runChecks({adapter,offer,outputDirectory,fixtures=[]}){
 const contract=offer.capability==='container.read.g726'&&offer.profile==='explicit-raw-audio'?['explicit-raw-audio','g726','openRawG726']:contracts[offer.capability];assert.ok(contract,'Unregistered container contract');const [profile,kind,method]=contract;assert.equal(offer.version,1);assert.equal(offer.profile,profile);assert.equal(typeof adapter[method],'function','Installed reader adapter missing '+method);assert.ok(path.isAbsolute(outputDirectory));await mkdir(outputDirectory,{recursive:true});
 const archiveKinds=['ape','wavpack','tta','tak','shorten','adpcm-wave','telephony','g726'];
 const selected=fixtures.length?fixtures.filter(f=>f.container===kind&&(kind!=='g726'||!f.sourceContainer||f.sourceContainer===(profile==='explicit-raw-audio'?'raw-g726':'wave-g726'))):archiveKinds.includes(kind)?await retainedFixtures(kind,profile):await prepareFixtures(kind,outputDirectory);assert.ok(selected.length,'No explicit container fixture matches selected contract');const results=[],fixtureInputs={},loaded=[];let negativeControls=[];
 for(const f of selected){const bytes=await fixtureBytes(f);fixtureInputs[f.input]=sha(bytes);if(f.fixtureManifest){const {readFile}=await import('node:fs/promises');const manifestBytes=await readFile(f.fixtureManifest);assert.equal(sha(manifestBytes),f.fixtureManifestSHA256);fixtureInputs[f.fixtureManifest]=sha(manifestBytes);}
 const config=f.rawConfiguration??{codec:f.codec,bitsPerSample:f.bitsPerSample,...(f.referenceSamples!==undefined?{sampleCount:f.referenceSamples}:{})};
 const open=(blob,signal)=>method==='openRawG726'?adapter[method](blob,signal,config):adapter[method](blob,signal,f.aacProfile?{aacProfile:f.aacProfile}:undefined);let check;
  if(f.expectedRejection){assert.equal(f.expectedRejection,'PROVIDER_PROFILE_MISMATCH');await assert.rejects(async()=>{const r=await open(new Blob([bytes]),new AbortController().signal);if(kind==='shorten'){for await(const data of r.chunks())void data;}else await collect(r);},e=>e?.code===f.expectedRejection&&(!f.expectedMessage||e.message===f.expectedMessage),'Explicit container rejection');results.push({id:f.id,input:f.input,inputSHA256:sha(bytes),expectedRejection:f.expectedRejection,expectedMessage:f.expectedMessage,rejected:true});continue;}
  loaded.push({f,bytes,open});
  if(archiveKinds.includes(kind))check=await checkArchive({kind,open,input:f.input,bytes,fixture:f});else if(kind==='isobmff')check=await checkIsoBmff({open,input:f.input,bytes,aacProfile:f.aacProfile});else if(kind==='ogg')check=await checkOgg({open,input:f.input,bytes});else if(kind==='wave-aiff')check=await checkWave({open,input:f.input,bytes});else if(kind==='mpegts')check=await checkMpegTs({open,input:f.input,bytes});else check=await checkWebm({open,remux:adapter.remuxWebm,createWriter:adapter.createWebmWriter,input:f.input,bytes,outputDirectory:path.join(outputDirectory,f.id??'fixture'),mux:offer.capability==='container.mux.webm'});
  results.push({id:f.id,input:f.input,inputSHA256:sha(bytes),...check});
 }
 assert.ok(loaded.length,'Conformance needs actual admitted positive source');
 if(kind==='g726'&&profile==='explicit-raw-audio'){const f=loaded[0].f,configuration=f.rawConfiguration??{codec:f.codec,bitsPerSample:f.bitsPerSample,...(f.referenceSamples!==undefined?{sampleCount:f.referenceSamples}:{})};negativeControls=await rawG726Rejections(adapter.openRawG726,loaded[0].bytes,configuration);}else if(archiveKinds.includes(kind))negativeControls=await archiveRejections(kind,loaded[0].open,loaded[0].bytes);else if(kind==='isobmff')negativeControls=await isoBmffRejections(adapter[method],loaded[0].bytes);
 else if(kind==='ogg'){const opus=loaded.find(x=>x.bytes.includes(Buffer.from('OpusHead')));assert.ok(opus,'Ogg conformance requires Opus rejection fixture');negativeControls=await oggRejections(adapter[method],opus.bytes);for(const speex of loaded.filter(x=>x.bytes.includes(Buffer.from('Speex   '))))negativeControls.push(...await speexRejections(adapter[method],speex.bytes));}
 else if(kind==='wave-aiff'){const wav=loaded.find(x=>x.bytes.toString('ascii',0,4)==='RIFF'),aiff=loaded.find(x=>x.bytes.toString('ascii',0,4)==='FORM');assert.ok(wav&&aiff,'WAV/AIFF conformance needs both format controls');negativeControls=[...await waveRejections(adapter[method],wav.bytes),...await aiffRejections(adapter[method],aiff.bytes)];}
 else if(kind==='mpegts')negativeControls=await tsRejections(adapter[method],loaded[0].bytes);
 else if(offer.capability==='container.mux.webm'){const opus=loaded.find(x=>x.bytes.includes(Buffer.from('OpusHead')));assert.ok(opus);negativeControls=await webmRejections(adapter.remuxWebm,opus.bytes);}
 const result={passed:true,scope:kind==='mpegts'?'Finite single-program AVC Annex B/AAC ADTS packet-only conformance; exact PTS/DTS, ownership and transport rejection; no remux, seeking or Player admission':`Finite ${kind} installed reader${offer.capability.startsWith('container.mux.')?' and packet-copy writer':''} fixture conformance; original payload/configuration/clock and bounded ownership checks`,container:kind,fixtureInputs,results,negativeControls,parityJobs:[]};await writeFile(path.join(outputDirectory,'container-specific.json'),JSON.stringify(result,null,2)+'\n');return result;
}
