// SPDX-License-Identifier: Apache-2.0
// Seal local bundle evidence against exact current inputs. This does not grant
// provider/platform qualification or authorize publication.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyBundleBinding} from './bundle-evidence.mjs';
import {collectPackages} from '../packages/bundler/index.mjs';
const base='build/bundle-flexibility',sha=data=>createHash('sha256').update(data).digest('hex');
const json=async name=>JSON.parse(await readFile(path.join(base,name)));
if(process.argv[2]){
 const report=JSON.parse(await readFile(process.argv[2]));assert.equal(report.passed,true);
 assert.ok(report.cases.length>0);
 for(const item of report.cases){await verifyBundleBinding(path.join(base,item.bundleName),item.binding);assert.ok(item.time>=.75);assert.equal(item.plan,item.item.plan);if(item.after){assert.equal(item.after.disposed,true);assert.equal(item.after.workers,0);assert.equal(item.after.objectURLs,0);}if(item.elementLifecycle){assert.equal(item.elementLifecycle.stable,true);for(const state of item.elementLifecycle.disposed){assert.equal(state.disposed,true);assert.equal(state.workers,0);assert.equal(state.objectURLs,0);}}}
 assert.ok(report.toolArchive,'Report must identify its installed tool archive');
 assert.equal(sha(await readFile(report.toolArchive.path)),report.toolArchive.sha256);
 for(const name of ['package.json','index.mjs','index.d.ts','cli.mjs','embedded-runtime.mjs','LICENSE'])assert.deepEqual(execFileSync('tar',['-xOf',report.toolArchive.path,'package/'+name]),await readFile('packages/bundler/'+name),'Packed build tool changed: '+name);
 for(const [name,expected]of Object.entries(report.sources))assert.equal(sha(await readFile(name)),expected,'Evidence source changed: '+name);
 console.log(JSON.stringify({passed:true,cases:report.cases.length,releaseQualified:false}));
 process.exit(0);
}
const first=await json('preview-playback-final.json'),more=await json('preview-additional-final.json'),installed=await json('installed-tool.json'),all=await json('installed-all.json');
assert.equal(first.passed,true);assert.equal(more.passed,true);assert.equal(installed.passed,true);assert.equal(all.passed,true);
assert.equal(first.cases.length,10);assert.equal(more.jspi.length,6);assert.equal(more.allProviderPassedCases.length,4);
for(const item of [...first.cases,...more.jspi,...more.allProviderPassedCases]){
 await verifyBundleBinding(path.join(base,item.bundleName??item.bundle??item.item.bundleName),item.binding);
 assert.ok(item.time>=.75);if(item.item.plan)assert.equal(item.plan,item.item.plan);
 if(item.after){assert.equal(item.after.disposed,true);assert.equal(item.after.workers,0);assert.equal(item.after.objectURLs,0);}
}
assert.equal(more.focused.globalsUnchanged,true);
for(const item of [more.focused.first,more.focused.second])assert.deepEqual(item,{data:{answer:42},head:200,headBytes:'',missing:404,aborted:true,nested:{answer:42,wasm:8,xhr:42,query:'?audioOnly=1'}});
assert.ok([...first.resources,...more.resources].every(url=>!url.includes('demuxe.invalid')));
const bundles={};
for(const name of ['assets-final','slices-final','full-final','all-final']){
 const manifest=await json(name+'/bundle-manifest.json');
 for(const [file,item]of Object.entries(manifest.outputs)){const data=await readFile(path.join(base,name,file));assert.equal(sha(data),item.sha256);assert.equal(data.length,item.bytes);}
 bundles[name]={manifestSHA256:sha(await readFile(path.join(base,name,'bundle-manifest.json'))),providers:manifest.providers,outputs:manifest.outputs};
}
assert.equal(bundles['all-final'].providers.length,15);
const collected=await collectPackages({core:path.join(all.root,'node_modules/demuxe'),providers:'all',providerDirectory:path.join(all.root,'node_modules/@demuxe')});
const manifest=await json('all-final/bundle-manifest.json');
assert.equal(collected.files.size,Object.keys(manifest.inputs).length);
for(const [name,data]of collected.files){assert.equal(sha(data),manifest.inputs[name].sha256);assert.equal(data.length,manifest.inputs[name].bytes);}
const archive=path.join(base,'tool-final/demuxe-bundler-0.3.0-beta.4.tgz');
const names=['package.json','index.mjs','index.d.ts','cli.mjs','embedded-runtime.mjs','LICENSE'];
for(const name of names){const packed=execFileSync('tar',['-xOf',archive,'package/'+name]);assert.deepEqual(packed,await readFile('packages/bundler/'+name),'Packaged tool source changed: '+name);}
const testOutput=execFileSync(process.execPath,['--test','tests/bundler.mjs'],{encoding:'utf8'});
assert.match(testOutput,/pass 9/);assert.match(testOutput,/fail 0/);
const sources={};
for(const name of [...names.map(n=>'packages/bundler/'+n),'tests/bundler.mjs','tests/bundler-browser.mjs','tests/bundle-playback.mjs','scripts/serve-bundle-review.mjs','scripts/verify-bundle-evidence.mjs','.github/workflows/bundler.yml','docs/BUNDLING.md'])sources[name]=sha(await readFile(name));
const result={schema:1,passed:true,status:'local-bundle-candidate',releaseQualified:false,playbackCases:20,browser:first.userAgent,toolArchive:{path:archive,sha256:sha(await readFile(archive))},sources,bundles,nodeTests:{passed:9,stdout:testOutput},evidence:['preview-playback-final.json','preview-additional-final.json','installed-tool.json','installed-all.json'].map(name=>({path:path.join(base,name)})),limitations:['Remote CI has not run','Full current Firefox native playback is not qualified','No commit, push or publication'],retainedFailedAttempt:more.retainedFailedAttempt};
for(const item of result.evidence)item.sha256=sha(await readFile(item.path));
await mkdir('results/media-components/bundling',{recursive:true});
await writeFile('results/media-components/bundling/local-candidate.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,playbackCases:20,nodeTests:9,providers:15,toolSHA256:result.toolArchive.sha256,report:'results/media-components/bundling/local-candidate.json'}));
