// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {schedules} from './composed-replay-harness.mjs';
// Fixed contractual oracle table. Expected values/effects are not copied from
// the reducer's initial snapshot, selected route or emitted rollback request.
const cases=[
 {name:'volume',command:{kind:'volume',value:40},path:['settings','volume'],before:100,after:40,apply:{kind:'volume',value:40},rollback:{kind:'volume',value:100}},
 {name:'mute',command:{kind:'mute',value:true},path:['preferences','muted'],before:false,after:true,apply:{kind:'volume',value:0},rollback:{kind:'volume',value:100}},
 {name:'rate',command:{kind:'rate',value:1.5},path:['settings','speed'],before:1,after:1.5,apply:{kind:'rate',value:1.5},rollback:{kind:'rate',value:1}},
 {name:'gain',command:{kind:'gain',value:.5},path:['settings','gain'],before:1,after:.5,apply:{kind:'gain',value:.5},rollback:{kind:'gain',value:1}},
 {name:'audio',command:{kind:'track',track:'audio',value:'3'},path:['settings','aid'],before:'auto',after:'3',apply:{kind:'track',track:'audio',value:'3'},rollback:{kind:'track',track:'audio',value:'auto'},sourceReset:true},
 {name:'subtitles',command:{kind:'subtitles',value:false},path:['settings','subtitles'],before:true,after:false,apply:{kind:'subtitles',value:false},rollback:{kind:'subtitles',value:true}},
 {name:'output',command:{kind:'output',value:'speakers'},path:['preferences','outputDeviceId'],before:'',after:'speakers',apply:{kind:'output',value:'speakers'},rollback:{kind:'output',value:''}},
 {name:'buffering',command:{kind:'buffering',value:{preload:'metadata',profile:'low-latency'}},path:['preferences','buffering'],before:{preload:'auto',profile:'balanced'},after:{preload:'metadata',profile:'low-latency'},apply:{kind:'buffering',value:{preload:'metadata',profile:'low-latency'}},rollback:{kind:'buffering',value:{preload:'auto',profile:'balanced'}}},
 {name:'quality',command:{kind:'quality',value:{mode:'manual',id:'720'},previous:{mode:'auto'}},path:['preferences','qualityPolicy'],before:null,after:{mode:'manual',id:'720'},apply:{kind:'quality',value:{mode:'manual',id:'720'}},rollback:{kind:'quality',value:{mode:'auto'}},sourceReset:true},
];
const coverage=new Set(),pairs=new Set();let checks=0,histories=0;
function replay(spec,history,{ignoreRollback=false}={}){
 let state=initialPlayerControl(),pending=null,accepted=spec.before,degraded=false,paused=false,id,previous;
 const send=input=>{const old=state,text=JSON.stringify(old),decision=transitionPlayer(state,input);state=decision.state;assert.equal(JSON.stringify(old),text,'immutable input state');return ignoreRollback&&input.type==='setting.failed'?{...decision,effects:[]}:decision;};
 const op=send({type:'operation.admit',kind:null}).id;send({type:'operation.start',id:op});send({type:'settings.change',value:{pause:false}});
 for(const action of history){let decision,expected=true,effects=[];
  if(action==='begin'){decision=send({type:'setting.begin',command:spec.command,hasBackend:true});id=decision.id;pending='applying';effects=[spec.apply];}
  else if(action==='pause'){paused=true;decision=send({type:'settings.change',value:{pause:true}});}
  else if(action==='retire'){pending=null;degraded=false;if(spec.sourceReset)accepted=spec.before;paused=true;decision=send({type:'source.clear'});}
  else{expected=action==='accept'?pending==='applying':action==='failed'?pending==='applying':pending==='compensating';decision=send({type:'setting.'+action,id});
   if(expected){if(action==='failed'){pending='compensating';effects=[spec.rollback];}else{if(action==='accept')accepted=spec.after;if(action==='degraded')degraded=true;pending=null;}}
  }
  assert.equal(decision.accepted,expected,action+' admission');if(action!=='pause'&&action!=='retire')assert.deepEqual(decision.effects??[],effects,action+' effects');assert.deepEqual(state[spec.path[0]][spec.path[1]],accepted,action+' accepted value');assert.equal(state.settings.pause,paused,'independent pause intent');assert.equal(state.settingsTransactions.pending?.phase??null,pending);assert.equal(!!state.settingsTransactions.degraded,degraded);
  const label=spec.name+':'+action+':'+expected;coverage.add(label);if(previous)pairs.add(previous+' -> '+label);previous=label;checks++;
 }
 send({type:'operation.retire',terminal:true});assert.equal(state.settingsTransactions.pending,null);histories++;return state;
}
for(const spec of cases)test(`causal ${spec.name} success and rollback schedules preserve accepted values`,()=>{
 for(const result of ['accept','restored','degraded']){
  const nodes=[{id:'begin',after:[],action:'begin'},{id:'pause',after:['begin'],action:'pause'},{id:'retire',after:['begin'],action:'retire'}];
  if(result==='accept')nodes.push({id:'result',after:['begin'],action:'accept'});else nodes.push({id:'failure',after:['begin'],action:'failed'},{id:'result',after:['failure'],action:result});
  for(const history of schedules(nodes)){const first=replay(spec,history),second=replay(spec,history);assert.deepEqual(first,second);}
 }
});
for(const spec of cases)test(`${spec.name} rollback omission mutation is detected before settlement`,()=>{
 const history=['begin','failed','restored'];replay(spec,history);assert.throws(()=>replay(spec,history,{ignoreRollback:true}),/failed effects/);
 // Explicit minimal witness: begin produces identity, failed must compensate.
 assert.throws(()=>replay(spec,['begin','failed'],{ignoreRollback:true}),/failed effects/);assert.doesNotThrow(()=>replay(spec,['begin'],{ignoreRollback:true}));
});
test('setter causal coverage includes failure after retirement and compensation retirement',()=>{
 for(const spec of cases)for(const action of ['accept','failed','restored','degraded'])for(const accepted of [false,true])assert.ok(coverage.has(spec.name+':'+action+':'+accepted));
 assert.ok(pairs.size>100);console.log(JSON.stringify({settingsScheduleCoverage:{histories,checks,transitions:coverage.size,pairs:pairs.size,commands:cases.map(c=>c.name),scope:'pure setter transactions with emergency pause and source retirement; no native physical rollback or route fixture qualification'}}));
});
