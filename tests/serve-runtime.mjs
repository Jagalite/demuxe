// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const names=['roadmap-browser','preview-browser','preview-software','preview-shaka-browser','public-api','automatic-adaptation','native-fractional-seek','native-ass','native-ass-selection-regressions','native-ass-style-regressions','audio-adaptation','audio-adaptation-lifecycle','in-place-gain','unequal-tail-windows'];
const blocks=await Promise.all(names.map(async name=>{
 const source=await readFile(new URL(`./${name}.mjs`,import.meta.url),'utf8');
 assert.match(source,/await installPackageEntrypoint\(page, origin\);await page.goto/);
 return source.split('// BEGIN installed-package entrypoint adapter (keep identical across standalone harnesses).')[1].split('// END installed-package entrypoint adapter.')[0];
}));
test('all standalone package adapters retain identical source',()=>{for(const block of blocks)assert.equal(block,blocks[0]);});
const install=new Function(`return (${blocks[0]});`)();
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'demuxe-entry-'));const prior=process.env.DEMUXE_RUNTIME_ROOT;process.env.DEMUXE_RUNTIME_ROOT=root;try{await fn(root);}finally{if(prior===undefined)delete process.env.DEMUXE_RUNTIME_ROOT;else process.env.DEMUXE_RUNTIME_ROOT=prior;await rm(root,{recursive:true,force:true});}}
async function manifest(root,body,entry={bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')}){await writeFile(join(root,'index.js'),body);await writeFile(join(root,'release-manifest.json'),JSON.stringify({files:{'index.js':entry}}));}
test('monolithic route serves exact manifest-bound bytes and only exact entry URL',()=>fixture(async root=>{
 const body=Buffer.from("export * from './web/generated/index.js';\n");await manifest(root,body);let predicate,handler;
 await install({route:async(p,h)=>{predicate=p;handler=h;}},'http://127.0.0.1:4179');
 assert.equal(predicate(new URL('http://127.0.0.1:4179/index.js')),true);
 for(const url of ['http://evil.invalid/index.js','http://127.0.0.1:4179/index.js?x','http://127.0.0.1:4179/player.js','http://127.0.0.1:4179/dist/index.js'])assert.equal(predicate(new URL(url)),false);
 let response;await handler({fulfill:async r=>{response=r;}});assert.equal(response.status,200);assert.deepEqual(response.body,body);
}));
test('source and modular roots without monolithic manifest keep server routes',()=>fixture(async root=>{
 await writeFile(join(root,'index.js'),'modular sentinel');await install({route:()=>assert.fail('unexpected interception')},'http://localhost');delete process.env.DEMUXE_RUNTIME_ROOT;await install({route:()=>assert.fail('unexpected interception')},'http://localhost');
}));
test('tampered bytes, missing manifest entry, malformed manifest, and missing installed entry fail closed',()=>fixture(async root=>{
 const page={route:()=>assert.fail('invalid package intercepted')};const body=Buffer.from('export {};');await manifest(root,body);await writeFile(join(root,'index.js'),Buffer.alloc(body.length,120));await assert.rejects(install(page,'http://localhost'),/differs from manifest/);
 await writeFile(join(root,'release-manifest.json'),JSON.stringify({files:{}}));await assert.rejects(install(page,'http://localhost'),/lacks index.js/);
 await writeFile(join(root,'release-manifest.json'),'{');await assert.rejects(install(page,'http://localhost'),SyntaxError);
 await manifest(root,body);await rm(join(root,'index.js'));await assert.rejects(install(page,'http://localhost'),{code:'ENOENT'});
}));

test('public API receipt fails closed on bootstrap, empty selection, failed checks, or teardown failure',async()=>{
 const source=await readFile(new URL('./public-api.mjs',import.meta.url),'utf8');
 assert.match(source,/let suiteCompleted=false;\s*try\{/);
 assert.match(source,/await check\('no uncaught errors'[^\n]+\n suiteCompleted=true;|await check\('no uncaught errors'[^\n]+\nsuiteCompleted=true;/);
 const finalizer=source.split('}finally{result.passed=false;')[1].split('\n\n// BEGIN installed-package')[0];
 const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor;
 const finish=new AsyncFunction('suiteCompleted','result','page','browser','server','writeFile','out','process','result.passed=false;'+finalizer.slice(0,-1));
 for(const [completed,checks,teardownFails,expected] of [[false,[],false,false],[false,[{passed:true}],false,false],[true,[],false,false],[true,[{passed:false}],false,false],[true,[{passed:true}],true,false],[true,[{passed:true}],false,true]]){
  const result={checks},processState={exitCode:0};let receipt,killed=false;
  const work=finish(completed,result,{evaluate:async()=>{}},{close:async()=>{if(teardownFails)throw Error('teardown failed');}},{kill:()=>{killed=true;}},async(_,body)=>{receipt=JSON.parse(body);},'unused',processState);
  if(teardownFails)await assert.rejects(work,/teardown failed/);else await work;
  assert.equal(receipt.passed,expected);assert.equal(killed,true);assert.equal(processState.exitCode,expected?0:1);
 }
});
