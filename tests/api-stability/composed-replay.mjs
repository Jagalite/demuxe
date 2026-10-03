// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {replayComposed,schedules,shrinkComposed,validateHistory,ReplayViolation} from './composed-replay-harness.mjs';
const open={type:'open'},play={type:'submit',id:1,kind:'backend.play',lane:'immediate'},pause={type:'pause'},complete={type:'complete',id:1,success:true};
const report={histories:0,checks:0,transitions:new Set(),pairs:new Set(),effects:new Set()};
async function run(history,options){const r=await replayComposed(history,options);report.histories++;report.checks+=r.checks;for(const x of r.coverage)report.transitions.add(x);for(const x of r.pairs)report.pairs.add(x);for(const x of r.effectKinds)report.effects.add(x);return r;}
test('all linear extensions of play/pause/completion/retirement causal DAG preserve intermediate authority',async()=>{
 const variants=schedules([{id:'play',after:[],action:play},{id:'pause',after:['play'],action:pause},{id:'complete',after:['play'],action:complete},{id:'retire',after:['play'],action:{type:'retire'}}]);assert.equal(variants.length,6);
 for(const steps of variants){const r=await run([open,...steps]);assert.equal(r.calls.filter(([,kind])=>kind==='play').length,1);assert.equal(r.outcomes.length,1);}
});
test('scheduled dispatch explores every causal position of cancellation and completion',async()=>{
 const issued={...play,lane:'scheduled'},variants=schedules([{id:'issue',after:[],action:issued},{id:'flush',after:['issue'],action:{type:'flush'}},{id:'pause',after:['issue'],action:pause},{id:'retire',after:['issue'],action:{type:'clear'}}]);assert.equal(variants.length,6);
 for(const steps of variants){const r=await run([open,...steps]);const ran=steps.findIndex(s=>s.type==='flush')<Math.min(steps.findIndex(s=>s.type==='pause'),steps.findIndex(s=>s.type==='clear'));assert.equal(r.calls.filter(([,kind])=>kind==='play').length,ran?1:0);assert.deepEqual(r.outcomes,[[1,'retired']]);}
});
test('timers, ignored aborts, duplicated outcomes, failure and cleanup detachment compose',async()=>{
 for(const success of [false,true])for(const deadline of [false,true]){const r=await run([open,play,{type:'submit',id:2,kind:'timer.wait',lane:'scheduled',deadline:50},{type:'flush'},{type:'advance',time:49},{type:'complete',id:1,success},{type:'duplicate',id:1},{type:'advance',time:50},{type:'release'},...(deadline?[{type:'advance',time:6000}]:[]),{type:'cleanup',success}]);assert.deepEqual(r.outcomes.slice(0,2),[[1,success?'completed':'failed'],[2,'completed']]);assert.equal(r.calls.filter(([,kind])=>kind==='release').length,1);assert.equal(r.final.lateReleased,deadline&&success?1:0);assert.equal(r.final.lateFailed,deadline&&!success?1:0);}
});
test('short pending-work histories compare deterministic replay and bounded retained suffixes',async()=>{
 for(let seed=1;seed<=20;seed++){let n=seed;const steps=[open];for(let id=1;id<=12;id++){n=(Math.imul(n,1664525)+1013904223)>>>0;steps.push({type:'submit',id,kind:n%3?'backend.play':'backend.pause',lane:n%2?'immediate':'scheduled'});steps.push({type:'flush'});if(n%4===0)steps.push(pause);steps.push({type:'complete',id,success:n%5!==0});if(n%3===0)steps.push({type:'duplicate',id});}const first=await run(steps),again=await run(steps);assert.deepEqual(again,first);assert.ok(first.trace.entries.length<=64);assert.ok(first.trace.dropped>0);}
});
for(const [mutation,history] of [['dropped-pause',[open,play,pause,complete]],['missing-identity',[open,play,{type:'clear'},complete,{type:'duplicate',id:1}]],['premature-acceptance',[open,{type:'probe-accept'}]],['skipped-release',[open,{type:'release'},{type:'cleanup'}]]])test(`mutation ${mutation} fails independent contractual oracle and shrinks causally`,async()=>{
 await run(history);const fails=async steps=>{try{await replayComposed(steps,{mutation});return false;}catch(error){return error instanceof ReplayViolation&&error.cause?.code==='ERR_ASSERTION';}};assert.equal(await fails(history),true);const shrunk=await shrinkComposed(history,fails);assert.equal(shrunk.oneMinimal,true);assert.ok(shrunk.history.length<=history.length);assert.doesNotThrow(()=>validateHistory(shrunk.history));assert.equal(await fails(shrunk.history),true);for(let i=0;i<shrunk.history.length;i++){const candidate=shrunk.history.filter((_,index)=>index!==i);try{validateHistory(candidate);}catch{continue;}assert.equal(await fails(candidate),false,'single deletion still reproduces');}
});
test('causal parser rejects completions before producer/start and arbitrary operations',()=>{
 for(const steps of [[open,complete],[open,{...play,lane:'scheduled'},complete],[open,{type:'advance',time:2},{type:'advance',time:1}],[{type:'fetch',url:'https://example.invalid'}]])assert.throws(()=>validateHistory(steps));
});
test('coverage records actual transition, transition-pair and typed-effect vocabulary',()=>{
 for(const type of ['effect.event:admit:accepted','effect.event:start:accepted','effect.event:physical-result:accepted','effect.event:physical-result:ignored','resource.event:deadline:accepted','resource.event:physical-result:accepted','source.accept:ignored','play.retire:accepted','operation.retire:accepted'])assert.ok(report.transitions.has(type),type);
 assert.ok(report.pairs.size>20);assert.deepEqual([...report.effects].sort(),['backend.pause','backend.play','timer.wait']);assert.ok(report.checks>1000);
 console.log(JSON.stringify({composedReplayCoverage:{histories:report.histories,checkedTransitions:report.checks,transitionCount:report.transitions.size,pairCount:report.pairs.size,transitions:[...report.transitions].sort(),pairs:[...report.pairs].sort(),effectKinds:[...report.effects].sort(),scope:'finite simulated source/effect/resource/play composition; not browser, route eligibility, setter rollback or preview ownership qualification'}}));
});
