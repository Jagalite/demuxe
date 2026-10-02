// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPreparation,admitPreparation,stepPreparation,completePreparation,retirePreparation,preparationProgress,preparationEngine} from '../../web/generated/internal/machine/engine-preparation.js';
const environment={software:'engine-software-full',runtime:'pthread',isolated:true,providerAssets:false,privatePlayback:false};
test('preparation reserves every selected role and one font before any start effects',()=>{
 const initial=createPreparation(),next=admitPreparation(initial,['hybrid','software','software'],environment,10);
 assert.deepEqual(next.names,['hybrid','software','font']);assert.deepEqual(next.start,next.names);assert.deepEqual(initial.jobs,[]);
 assert.deepEqual(admitPreparation(next.state,['software'],environment,15).start,[]);
 assert.deepEqual(preparationProgress(next.state),next.names.map(name=>({name,status:'queued'})));
});
test('private inspector and playback availability select exact independent role paths',()=>{
 const env={...environment,isolated:false,runtime:'asyncify',providerAssets:true};
 let admission=admitPreparation(createPreparation(),['inspector','hybrid','software'],env,0);
 assert.deepEqual(admission.state.jobs.map(j=>[j.path,j.isolated]),[['web/engine-remux-asyncify/remux.wasm',true],['web/engine-hybrid/player.wasm',false],['web/engine-software-full/player.wasm',false],['fixtures/DejaVuSans.ttf',false]]);
 admission=admitPreparation(createPreparation(),['hybrid','software'],{...env,privatePlayback:true},0);
 assert.equal(admission.state.jobs[0].path,admission.state.jobs[1].path);assert.equal(admission.start.length,3);
 assert.equal(preparationEngine('engine-hybrid',{...env,privatePlayback:true}),'engine-mpv-playback-asyncify');
});
test('direct fetching enforces component byte caps while verified provider bytes keep acquisition budgets',()=>{
 let state=admitPreparation(createPreparation(),['software'],environment,0).state;
 assert.equal(stepPreparation(state,'font',{kind:'bytes',bytes:9*1024*1024,declared:true}).effect,'overflow');
 assert.equal(state.jobs.find(j=>j.name==='font').bytes,0);
 const streamed=stepPreparation(state,'font',{kind:'bytes',bytes:9*1024*1024});assert.equal(streamed.effect,'overflow');assert.equal(streamed.state.jobs[1].bytes,9*1024*1024);
 state=admitPreparation(createPreparation(),['software'],{...environment,providerAssets:true},0).state;
 assert.equal(stepPreparation(state,'software',{kind:'bytes',bytes:40*1024*1024}).effect,'accepted');
});
test('deadline and retirement prevent publication with distinct visible progress lifetime',()=>{
 let state=admitPreparation(createPreparation(),['inspector'],environment,5).state;state=stepPreparation(state,'inspector',{kind:'phase',phase:'loading'}).state;
 assert.equal(stepPreparation(state,'inspector',{kind:'deadline',now:15004}).effect,'ignore');
 const expired=stepPreparation(state,'inspector',{kind:'deadline',now:15005});assert.equal(expired.effect,'abort');
 const timeout=completePreparation(expired.state,'inspector',15010);assert.equal(timeout.publish,false);assert.equal(timeout.asset.status,'aborted');assert.equal(timeout.state.jobs[0].phase,'aborted');
 const retired=completePreparation(retirePreparation(state),'inspector',20);assert.equal(retired.publish,false);assert.equal(retired.notify,false);assert.equal(retired.state.jobs[0].phase,'loading');
 assert.equal(admitPreparation(retired.state,['software'],environment,25).aborted[0].status,'aborted');
});
test('completion preserves byte and elapsed reports, and replay never mutates queued snapshots',()=>{
 const queued=admitPreparation(createPreparation(),['inspector'],environment,10).state;
 const history=()=>{let state=stepPreparation(queued,'inspector',{kind:'phase',phase:'loading'}).state;state=stepPreparation(state,'inspector',{kind:'bytes',bytes:8}).state;state=stepPreparation(state,'inspector',{kind:'phase',phase:'compiling'}).state;return completePreparation(state,'inspector',25);};
 assert.deepEqual(history(),history());assert.deepEqual(history().asset,{name:'inspector',status:'ready',bytes:8,milliseconds:15});assert.equal(queued.jobs[0].phase,'queued');assert.equal(queued.jobs[0].bytes,0);
});

test('duplicate terminal completions cannot replace a prepared report or publish twice',()=>{
 let state=admitPreparation(createPreparation(),['inspector'],environment,0).state;
 const completed=completePreparation(state,'inspector',10);state=completed.state;const duplicate=completePreparation(state,'inspector',100,'late failure');
 assert.equal(duplicate.state,state);assert.equal(duplicate.publish,false);assert.equal(duplicate.notify,false);assert.deepEqual(duplicate.asset,completed.asset);
});
