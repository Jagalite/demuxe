// SPDX-License-Identifier: Apache-2.0
// Prepare finite independent container fixtures and an explicit standard-runner
// config. Retained canonical media is required; no downloads or native builds.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareFixtures,sha} from '../tests/provider-conformance/container-specific-common.mjs';
import {retainedFixtures} from '../tests/provider-conformance/container-specific-archive.mjs';
import {mediaReferenceEnvironment} from './media-reference-environment.mjs';
export async function prepareContainerConformance({outputDirectory,provider,core,manifests={}}){
 assert.ok(path.isAbsolute(outputDirectory)&&path.isAbsolute(provider),'Absolute output and installed provider paths required');if(core)assert.ok(path.isAbsolute(core));for(const value of Object.values(manifests))assert.ok(path.isAbsolute(value),'Manifest overrides must be absolute');
 await mkdir(path.dirname(outputDirectory),{recursive:true});await mkdir(outputDirectory);const fixtures=[],fixtureInputs={},manifestInputs={};
 for(const kind of ['isobmff','ogg','wave-aiff','mpegts','webm'])for(const f of await prepareFixtures(kind,path.join(outputDirectory,kind))){const digest=sha(await readFile(f.input));fixtures.push({...f,id:'conformance-'+kind+'-'+f.id,inputSHA256:digest});fixtureInputs[f.input]=digest;}
 if(manifests.ogg){const raw=await readFile(manifests.ogg),rows=JSON.parse(raw);assert.ok(Array.isArray(rows)&&rows.length);manifestInputs[manifests.ogg]=sha(raw);for(const f of rows){assert.equal(f.container,'ogg');assert.ok(path.isAbsolute(f.input));const digest=sha(await readFile(f.input));assert.equal(digest,f.inputSHA256);fixtures.push({...f,fixtureManifest:manifests.ogg,fixtureManifestSHA256:sha(raw)});fixtureInputs[f.input]=digest;}}
 for(const kind of ['ape','wavpack','tta','tak','shorten','adpcm-wave','telephony','g726'])for(const profile of kind==='g726'?['finite-clear-audio','explicit-raw-audio']:['finite-clear-audio']){
  const override=manifests[kind==='g726'&&profile==='explicit-raw-audio'?'g726-raw':kind];for(const f of await retainedFixtures(kind,profile,override)){assert.ok(path.isAbsolute(f.input));const bytes=await readFile(f.input);assert.equal(sha(bytes),f.inputSHA256,'Retained canonical fixture source hash');fixtures.push({...f,id:'conformance-'+kind+'-'+f.id});fixtureInputs[f.input]=sha(bytes);manifestInputs[f.fixtureManifest]=f.fixtureManifestSHA256;}
 }
 assert.equal(new Set(fixtures.map(f=>f.id)).size,fixtures.length,'Unique conformance fixture IDs required');
 const config={schema:1,...(core?{core}:{}),providers:[{path:provider,containerFixtures:fixtures}],timeout:180000},configPath=path.join(outputDirectory,'config.json');await writeFile(configPath,JSON.stringify(config,null,2)+'\n');await writeFile(path.join(outputDirectory,'fixtures.json'),JSON.stringify(fixtures,null,2)+'\n');
 const result={schema:1,status:'PASS',scope:'Prepared explicit container fixtures; qualification requires standard runner completion',configPath,configSHA256:sha(await readFile(configPath)),fixtures:fixtures.length,fixtureInputs,manifestInputs,referenceEnvironment:await mediaReferenceEnvironment(),generatorInputs:{[fileURLToPath(import.meta.url)]:sha(await readFile(fileURLToPath(import.meta.url))),[fileURLToPath(new URL('../tests/provider-conformance/container-specific-common.mjs',import.meta.url))]:sha(await readFile(new URL('../tests/provider-conformance/container-specific-common.mjs',import.meta.url))),[fileURLToPath(new URL('../tests/provider-conformance/container-specific-archive.mjs',import.meta.url))]:sha(await readFile(new URL('../tests/provider-conformance/container-specific-archive.mjs',import.meta.url)))}};
 await writeFile(path.join(outputDirectory,'preparation.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args={};for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];assert.ok(['--output','--provider','--core','--manifests'].includes(key)&&process.argv[i+1],'Usage: --output <fresh-dir> --provider <installed-package> [--core <core-package>] [--manifests <JSON map>]');args[key.slice(2)]=path.resolve(process.argv[i+1]);}
 assert.ok(args.output&&args.provider);const result=await prepareContainerConformance({outputDirectory:args.output,provider:args.provider,core:args.core,manifests:args.manifests?JSON.parse(await readFile(args.manifests)):undefined});console.log(JSON.stringify({status:result.status,fixtures:result.fixtures,configPath:result.configPath,configSHA256:result.configSHA256}));
}
