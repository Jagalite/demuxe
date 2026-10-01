// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runChecks} from './container-specific.mjs';
import {fixtureBytes,prepareFixtures} from './container-specific-common.mjs';
import {sha,verifyProvider,checkUnchanged} from './package.mjs';
import {loadAdapter} from './adapters.mjs';
const home=await mkdtemp(path.join(tmpdir(),'demuxe-specific-container-contracts-'));
test('exact container contract tuple and installed adapter are required',async()=>{
 const offer={capability:'container.read.mpegts',version:1,profile:'finite-pes-av'};
 for(const changed of [{version:2},{profile:'implicit-remux'},{capability:'container.mux.mpegts'}])await assert.rejects(()=>runChecks({adapter:{openMpegTs(){}},offer:{...offer,...changed},outputDirectory:home}),/Unregistered|strictly equal/);
 await assert.rejects(()=>runChecks({adapter:{},offer,outputDirectory:home}),/Installed reader adapter missing/);
});
test('fixture source digest and explicit container tag cannot be laundered',async()=>{
 const input=path.join(home,'mismatched.wav');await writeFile(input,Buffer.from('fixture'));await assert.rejects(()=>fixtureBytes({input,inputSHA256:'0'.repeat(64)}),/Fixture source hash/);
 await assert.rejects(()=>runChecks({adapter:{openWaveAiff(){}},offer:{capability:'container.read.wave-aiff',version:1,profile:'finite-clear-audio'},outputDirectory:home,fixtures:[{input,container:'mpegts'}]}),/No explicit container fixture/);
});
const packagePath=process.env.PROVIDER_CONFORMANCE_CONTAINER_PACKAGE;
test('actual installed candidate reader and WebM mux scopes pass native references', {skip:!packagePath},async()=>{
 const coreVersion=process.env.PROVIDER_CONFORMANCE_CORE_VERSION??'0.1.0',provider=await verifyProvider(path.resolve(packagePath),coreVersion),fact=provider.manifest.provides.find(f=>f.offers.some(o=>o.capability==='container.read.matroska'));
 assert.ok(fact);const loaded=await loadAdapter(provider,fact,undefined,path.join(home,'installed-adapter'));const results=[];
 try{for(const [capability,profile]of [['container.read.isobmff','finite-clear-av'],['container.read.ogg','finite-clear-audio'],['container.read.wave-aiff','finite-clear-audio'],['container.read.mpegts','finite-pes-av'],['container.read.matroska','finite-clear-webm'],['container.mux.webm','explicit-timeline-av'],...['ape','wavpack','tta','tak','shorten','adpcm-wave','telephony','g726'].map(k=>['container.read.'+k,'finite-clear-audio']),['container.read.g726','explicit-raw-audio']]){
  const offer={capability,version:1,profile};assert.ok(fact.offers.some(o=>o.capability===capability&&o.profile===profile),'Candidate must declare selected finite profile');results.push(await runChecks({adapter:loaded.adapter,offer,outputDirectory:path.join(home,capability+'-'+profile)}));
 }await mkdir(path.resolve('build/provider-conformance'),{recursive:true});await writeFile(path.resolve('build/provider-conformance/container-specific-installed.json'),JSON.stringify({schema:1,status:'PASS',package:provider.root,identity:provider.identity,packageInputs:provider.inputs,importedArtifacts:loaded.imports,adapterInputs:loaded.harnessInputs,results},null,2)+'\n');}
 finally{await loaded.adapter.dispose?.();await checkUnchanged(provider);}
});
test('actual candidate PCM packet corruption and clock drift fail the suite',{skip:!packagePath},async()=>{
 const provider=await verifyProvider(path.resolve(packagePath),process.env.PROVIDER_CONFORMANCE_CORE_VERSION??'0.1.0'),fact=provider.manifest.provides.find(f=>f.offers.some(o=>o.capability==='container.read.wave-aiff'));
 const loaded=await loadAdapter(provider,fact,undefined,path.join(home,'mutation-adapter')),fixtures=await prepareFixtures('wave-aiff',path.join(home,'mutation-fixtures'));
 try{for(const mode of ['payload','clock']){const adapter={...loaded.adapter,openWaveAiff:async(...args)=>{const actual=await loaded.adapter.openWaveAiff(...args);return {...actual,tracks:actual.tracks,sampleCount:actual.sampleCount,packets:async function*(...seek){for await(const p of actual.packets(...seek)){const copy={...p,data:p.data.slice()};if(mode==='payload')copy.data[0]^=255;else copy.timestampNs++;yield copy;}}};}};
  await assert.rejects(()=>runChecks({adapter,offer:{capability:'container.read.wave-aiff',version:1,profile:'finite-clear-audio'},outputDirectory:path.join(home,mode),fixtures}),mode==='payload'?/Original normalized PCM bytes/:/strictly equal/);
 }await mkdir(path.resolve('build/provider-conformance'),{recursive:true});await writeFile(path.resolve('build/provider-conformance/container-specific-controls.json'),JSON.stringify({schema:1,status:'PASS',scope:'Actual installed PCM packet byte corruption and one-nanosecond sample-clock drift rejected',identity:provider.identity,packageInputs:provider.inputs,testSHA256:sha(await readFile(new URL(import.meta.url))),controls:['actual-owned-payload-corruption','actual-sample-clock-plus-one-nanosecond']},null,2)+'\n');}finally{await loaded.adapter.dispose?.();await checkUnchanged(provider);}
});
