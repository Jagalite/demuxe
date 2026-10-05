// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const collector=path.resolve('scripts/generated-runtime-files.mjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'demuxe-exports-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,write(name,text){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);},run(packaged){return spawnSync(process.execPath,[collector,root,...(packaged?['--packaged']:[])],{encoding:'utf8',input:packaged?JSON.stringify(packaged):undefined});}};}
test('public exports include static, dynamic and declaration imports, not runtime URL literals',t=>{
 const f=fixture(t);f.write('package.json',JSON.stringify({exports:{'.':{types:'./web/generated/index.d.ts',import:'./web/generated/index.js'},'./player':'./web/generated/player.js'}}));
 f.write('web/generated/index.js',`export {x} from './dependency.js';export const lazy=()=>import('./lazy.js');new URL('./generated/internal/runtime-worker.js', workerURL);const example="import('./not-an-import.js')";/* import './comment.js' */`);
 f.write('web/generated/index.d.ts',`export type X=import('./types.js').X;`);
 for(const name of ['player.js','dependency.js','dependency.d.ts','lazy.js','types.d.ts'])f.write('web/generated/'+name,'export {};');
 const r=f.run();assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),['dependency.d.ts','dependency.js','index.d.ts','index.js','lazy.js','player.js','types.d.ts'].map(n=>'web/generated/'+n).sort());
});
test('a genuine missing import is rejected',t=>{const f=fixture(t);f.write('package.json',JSON.stringify({exports:{'.':'./web/generated/index.js'}}));f.write('web/generated/index.js',`import './missing.js';`);f.write('web/generated/missing.d.ts','export {};');const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/Missing generated runtime dependency: web\/generated\/missing.js/);});
test('all real public entrypoints and their generated dependencies can be collected',()=>{const r=spawnSync(process.execPath,[collector,process.cwd()],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const files=JSON.parse(r.stdout);for(const name of ['index.js','player/index.js','contracts.js','integration/index.js','media-element/index.js','adapters/videojs.js','internal/runtime-worker.js'])assert.ok(files.includes('web/generated/'+name),name);});

test('selected worker and optional engine roots include transitive generated imports without scanning dormant assets',t=>{
 const f=fixture(t);f.write('package.json',JSON.stringify({exports:{'.':'./web/generated/index.js'}}));f.write('web/generated/index.js','export {};');
 f.write('web/generated/internal/machine/worker.js',"export {state} from './state.js';");f.write('web/generated/internal/machine/worker.d.ts',"export {state} from './state.js';");
 f.write('web/generated/internal/machine/state.js','export const state=0;');f.write('web/generated/internal/machine/state.d.ts','export declare const state:number;');
 f.write('web/generated/internal/machine/optional.js','export {};');f.write('web/dormant-worker.js',"import './generated/internal/machine/missing-dormant.js';");
 const old=f.run();assert.equal(old.status,0,old.stderr);assert.deepEqual(JSON.parse(old.stdout),['web/generated/index.js'],'Public exports alone miss every worker dependency');
 const packaged={'web/worker.js':"import './private/bridge.js';",'web/private/bridge.js':"export * from '../generated/internal/machine/worker.js';",'web/optional/engine.mjs':"import '../generated/internal/machine/optional.js';"};
 const result=f.run(packaged);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),['web/generated/index.js',...['optional.js','state.d.ts','state.js','worker.d.ts','worker.js'].map(name=>'web/generated/internal/machine/'+name)].sort());
});
test('packaged worker imports fail closed on missing generated or unselected non-generated dependencies',t=>{
 const f=fixture(t);f.write('package.json',JSON.stringify({exports:{'.':'./web/generated/index.js'}}));f.write('web/generated/index.js','export {};');
 const missing=f.run({'web/worker.js':"import './generated/internal/machine/missing.js';"});assert.notEqual(missing.status,0);assert.match(missing.stderr,/Missing generated runtime dependency/);
 f.write('web/not-selected.js','export {};');const unselected=f.run({'web/worker.js':"import './not-selected.js';"});assert.notEqual(unselected.status,0);assert.match(unselected.stderr,/Missing packaged runtime dependency: web\/not-selected.js/);
});
test('real migrated remux and private runtime worker imports are included',()=>{
 const names=['native-remux-source-worker.js','file-reader.js','range-reader.js','private-ffmpeg/bridge.js','private-ffmpeg/range-source.js','private-ffmpeg/single-owner.js','private-mpv/playback-host.js','private-mpv/playback-pcm.js','private-mpv/audio-worklet.js'];
 const packaged=Object.fromEntries(names.map(name=>['web/'+name,fs.readFileSync('web/'+name,'utf8')]));
 const r=spawnSync(process.execPath,[collector,process.cwd(),'--packaged'],{encoding:'utf8',input:JSON.stringify(packaged)});assert.equal(r.status,0,r.stderr);const files=JSON.parse(r.stdout);
 for(const name of ['remux-source-worker','local-reader','range-reader','ffmpeg-bridge','ffmpeg-owner','private-range-source','playback-host','private-pcm','private-worklet'])assert.ok(files.includes('web/generated/internal/machine/'+name+'.js'),name);
});
