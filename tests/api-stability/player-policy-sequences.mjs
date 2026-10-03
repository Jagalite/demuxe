// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {schedules} from './composed-replay-harness.mjs';

function replay(kind,history,{dropPause=false}={}){
 let state=initialPlayerControl();const effects=[],trace=[];
 const send=input=>{const old=state,encoded=JSON.stringify(old),decision=transitionPlayer(state,input);assert.equal(JSON.stringify(old),encoded,'input mutated');state=decision.state;trace.push([input.type,decision.accepted,decision.transportEffect?.kind]);return decision;};
 const accept=()=>{const begin=send({type:'source.begin',operationEpoch:state.operations.epoch,mode:'native',preserve:true,planId:'fixture'});if(!begin.accepted)return;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])send({type,attempt:begin.id});send({type:'source.accept',attempt:begin.id,operationEpoch:state.operations.epoch,settings:{...state.settings,pause:false},planMatches:true});send({type:'source.finished',attempt:begin.id});};
 accept();const operation=send({type:'operation.admit',kind:null}).id;send({type:'operation.start',id:operation});
 const intent=send({type:kind==='play'?'play.request':'seek.request',latest:false}).id;
 const begin=send(kind==='play'?{type:'transport.play.begin',intent,position:4,trialSame:true,trialVerified:false,local:true,backendPlan:'direct',nativeRemux:'auto',fallbackAvailable:true}:{type:'transport.seek.begin',intent,target:12,previous:4,seekable:null});
 assert.equal(begin.accepted,true);const id=begin.id;
 const completions=kind==='play'?{
  failed:{type:'transport.play.failed',id,compatible:false,inconclusive:true,streaming:false},
  intermediate:{type:'transport.play.fallback-failed',id,compatible:false,code:'ASSET_LOAD_FAILED'},
  restored:{type:'transport.play.restored',id},
 }:{
  failed:{type:'transport.seek.failed',id,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:false},
  intermediate:{type:'transport.seek.restored',id},
  restored:{type:'transport.seek.resumed',id},
 };
 for(const action of history){
  if(action==='pause'){if(!dropPause)send({type:'play.retire'});}
  else if(action==='close'){send({type:'operation.retire',terminal:false});send({type:'source.clear'});}
  else if(action==='replace'){accept();}
  else {
   const first=send(completions[action]);if(['fallback','restore','verify','resume'].includes(first.transportEffect?.kind))effects.push([action,first.transportEffect.kind]);
   const duplicate=send(completions[action]);assert.ok(!['fallback','restore','verify','resume'].includes(duplicate.transportEffect?.kind),'duplicate completion repeated physical work');
  }
 }
 // Expected effects follow only causal position of the user's interruption and
 // source replacement, independently of the reducer's chosen phases or effects.
 const at=action=>history.indexOf(action),retired=Math.min(at('close'),at('replace')),stopped=Math.min(retired,at('pause'));
 const expected=kind==='play'?[['failed','fallback'],['intermediate','restore'],['restored','verify']].filter(([action])=>at(action)<stopped):[
  ...(at('failed')<retired?[['failed','restore']]:[]),
  ...(at('intermediate')<stopped?[['intermediate','resume']]:[]),
 ];
 assert.deepEqual(effects,expected,`${kind} ${history.join(' → ')}`);
 send({type:'transport.finished',id});send({type:'operation.finish',id:operation});send({type:'operation.release',id:operation});
 assert.equal(state.transport.pending,null);assert.equal(state.operations.entries.length,0);
 return {effects,trace};
}
const variants=schedules([
 {id:'failed',after:[],action:'failed'},
 {id:'intermediate',after:['failed'],action:'intermediate'},
 {id:'restored',after:['intermediate'],action:'restored'},
 ...['pause','close','replace'].map(action=>({id:action,after:[],action})),
]);
for(const kind of ['play','seek'])test(`${kind} recovery explores all 120 causal interruption/replacement schedules and duplicate outcomes`,()=>{
 assert.equal(variants.length,120);
 for(const history of variants)assert.deepEqual(replay(kind,history),replay(kind,history),'same sequence must replay identically');
});
for(const kind of ['play','seek'])test(`${kind} recovery schedule oracle detects omitted pause retirement`,()=>{
 const history=kind==='play'?['failed','intermediate','pause','restored','replace','close']:['failed','pause','intermediate','restored','replace','close'];
 replay(kind,history);assert.throws(()=>replay(kind,history,{dropPause:true}),error=>error.code==='ERR_ASSERTION');
});
