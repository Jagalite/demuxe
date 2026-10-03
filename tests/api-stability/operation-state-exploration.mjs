// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
// Contract representation uses independent sets of pending, completed and
// cancelled IDs, not production entry records or reducer-derived expectations.
function initial(){return{issued:0,generation:0,closed:false,running:null,pending:[],completed:[],cancelled:[],birth:{}};}
function reference(previous,event){
 const m=structuredClone(previous),id=event.id,type=event.type.slice(10),exists=m.pending.includes(id);let accepted=true;
 if(type==='admit'){m.issued++;if(m.closed)accepted=false;else{m.pending.push(m.issued);m.birth[m.issued]=m.generation;}}
 else if(type==='retire'){m.generation++;m.closed||=event.terminal;}
 else if(!exists)accepted=false;
 else if(type==='start'){accepted=!m.closed&&!m.cancelled.includes(id)&&m.birth[id]===m.generation&&m.running===null&&!m.completed.includes(id)&&m.pending.filter(value=>value<id).every(value=>m.completed.includes(value));if(accepted)m.running=id;}
 else if(type==='cancel'){if(!m.cancelled.includes(id))m.cancelled.push(id);}
 else if(type==='finish'){accepted=!m.completed.includes(id);if(accepted){m.completed.push(id);if(m.running===id)m.running=null;}}
 else if(type==='release'){m.pending=m.pending.filter(value=>value!==id);m.completed=m.completed.filter(value=>value!==id);m.cancelled=m.cancelled.filter(value=>value!==id);delete m.birth[id];if(m.running===id)m.running=null;}
 return{model:m,accepted};
}
function projection(m){return{serial:m.issued,epoch:m.generation,terminal:m.closed,active:m.running,entries:m.pending.map(id=>({id,epoch:m.birth[id],kind:null,cancelled:m.cancelled.includes(id),phase:m.completed.includes(id)?'finished':m.running===id?'active':'queued'}))};}
function choices(m){const events=[];if(m.issued<2)events.push({type:'operation.admit',kind:null});if(m.generation===0)for(const terminal of [false,true])events.push({type:'operation.retire',terminal});for(const id of [1,2,3])for(const type of ['start','cancel','finish','release'])events.push({type:'operation.'+type,id});return events;}
test('exhaustive two-admission one-retirement operation state space matches contract and drains fairly',()=>{
 const queue=[{state:initialPlayerControl(),model:initial(),history:[]}],seen=new Set(),coverage=new Set(),pairs=new Set();let edges=0,terminal=0;
 while(queue.length){const {state,model,history}=queue.shift(),key=JSON.stringify(projection(model));if(seen.has(key))continue;seen.add(key);assert.deepEqual(state.operations,projection(model));
  // Fairness obligation: logical completion/release eventually runs even for
  // an unstarted cancelled entry or a lifetime-retired predecessor.
  let drained=state;for(const id of model.pending){drained=transitionPlayer(drained,{type:'operation.finish',id}).state;drained=transitionPlayer(drained,{type:'operation.release',id}).state;}assert.equal(drained.operations.entries.length,0);assert.equal(drained.operations.active,null);
  if(model.closed)terminal++;
  for(const input of choices(model)){const expected=reference(model,input),result=transitionPlayer(state,input);assert.equal(result.accepted,expected.accepted,JSON.stringify([...history,input]));assert.deepEqual(result.state.operations,projection(expected.model),JSON.stringify([...history,input]));assert.ok(result.state.operations.entries.length<=2);const label=input.type+':'+result.accepted;coverage.add(label);if(history.length)pairs.add(history.at(-1).type+' -> '+label);edges++;if(result.accepted||input.type==='operation.admit')queue.push({state:result.state,model:expected.model,history:[...history,input]});}
 }
 assert.ok(seen.size>100);assert.ok(terminal>0);for(const type of ['admit','start','cancel','finish','release'])for(const accepted of [true,false])assert.ok(coverage.has('operation.'+type+':'+accepted));
 console.log(JSON.stringify({operationExploration:{states:seen.size,edges,terminalStates:terminal,transitionLabels:coverage.size,pairs:pairs.size,bounds:{admissions:2,retirements:1,knownIds:2,unknownIds:1},fairness:'every retained entry eventually receives finish and release'}}));
});
