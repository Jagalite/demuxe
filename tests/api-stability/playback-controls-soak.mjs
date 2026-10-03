// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {VirtualEffects} from './virtual-effects.mjs';
import {random,day} from './playback-soak-harness.mjs';
// This oracle holds only accepted user values and outstanding intent identities.
// Expected effects come from command contracts, never reducer output.
export function soakControls({seed=1,steps=4000,mutation}={}){
 assert.ok(Number.isSafeInteger(seed)&&seed>0&&Number.isSafeInteger(steps)&&steps>=64&&steps<=20000);
 const next=random(seed),clock=new VirtualEffects(),coverage=new Set(),suffix=[];
 const values={volume:100,speed:1,gain:1,aid:'auto',sid:'auto',subtitles:true,outputDeviceId:'',pause:true};
 let state=initialPlayerControl(),checks=0,step=0,intentSerial=0,latest=null;const seeks=new Set();
 function send(input){
  const before=state,immutable=JSON.stringify(before);let result=transitionPlayer(state,input);
  if(mutation==='drop-rollback'&&input.type==='setting.failed')result={...result,effects:[]};
  state=result.state;assert.equal(JSON.stringify(before),immutable,'immutable input');checks++;
  suffix.push({step,input});if(suffix.length>32)suffix.shift();return result;
 }
 function check(){for(const key of ['volume','speed','gain','aid','sid','subtitles','pause'])assert.deepEqual(state.settings[key],values[key],key+' accepted value');assert.equal(state.preferences.outputDeviceId,values.outputDeviceId);assert.deepEqual([...state.playback.seeks],[...seeks]);assert.equal(state.playback.latestSeek,latest);assert.ok(seeks.size<=32);assert.equal(state.operations.entries.length,0);assert.equal(state.settingsTransactions.pending,null);}
 function operation(){const id=send({type:'operation.admit',kind:null}).id;assert.ok(id);assert.equal(send({type:'operation.start',id}).accepted,true);return id;}
 function finish(id){send({type:'operation.finish',id});send({type:'operation.release',id});}
 function source(){const attempt=send({type:'source.begin',operationEpoch:state.operations.epoch,mode:'software',preserve:false,planId:'synthetic'}).id;for(const stage of ['created','configured','opened','applied','positioned'])send({type:'source.'+stage,attempt});send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:{pause:values.pause,volume:values.volume,speed:values.speed,gain:values.gain,aid:values.aid,sid:values.sid,subtitles:values.subtitles,vf:'',af:''},planMatches:true});send({type:'source.finished',attempt});}
 try{
  source();
  for(step=0;step<steps;step++){
   const choice=next()%8,old={...values};let key,command,apply,rollback;
   if(choice===0){key='volume';command={kind:'volume',value:next()%101};apply=command;rollback={kind:'volume',value:old.volume};}
   else if(choice===1){key='speed';command={kind:'rate',value:[.5,1,1.5,2][next()%4]};apply=command;rollback={kind:'rate',value:old.speed};}
   else if(choice===2){key='gain';command={kind:'gain',value:[.5,1,2][next()%3]};apply=command;rollback={kind:'gain',value:old.gain};}
   else if(choice<5){key=choice===3?'aid':'sid';command={kind:'track',track:choice===3?'audio':'sub',value:['auto','1','2'][next()%3]};apply=command;rollback={kind:'track',track:command.track,value:old[key]};}
   else if(choice===5){key='subtitles';command={kind:'subtitles',value:!!(next()%2)};apply=command;rollback={kind:'subtitles',value:old.subtitles};}
   else if(choice===6){key='outputDeviceId';command={kind:'output',value:next()%2?'speakers':''};apply=command;rollback={kind:'output',value:old.outputDeviceId};}
   else {key='pause';command={kind:'pause'};apply=command;rollback={kind:old.pause?'pause':'play'};}
   const op=operation(),begin=send({type:'setting.begin',command,hasBackend:true});assert.equal(begin.accepted,true);assert.deepEqual(begin.effects,[apply],'apply effect contract');
   coverage.add(command.kind+(command.track?':'+command.track:''));const outcome=next()%4;
   if(outcome===0){clock.scheduleDeadline(()=>{assert.equal(send({type:'setting.accept',id:begin.id}).accepted,true);values[key]=key==='pause'?true:command.value;},10);coverage.add('accept');}
   else if(outcome===1||outcome===2){assert.deepEqual(send({type:'setting.failed',id:begin.id}).effects,[rollback],'rollback effect contract');const result=outcome===1?'restored':'degraded';clock.scheduleDeadline(()=>assert.equal(send({type:'setting.'+result,id:begin.id}).accepted,true),10);coverage.add(result);}
   else {send({type:'operation.retire',terminal:false});send({type:'source.clear'});values.pause=true;values.aid='auto';values.sid='auto';clock.scheduleDeadline(()=>{for(const result of ['accept','failed','restored','degraded'])assert.equal(send({type:'setting.'+result,id:begin.id}).accepted,false,'retired setter result');},10);coverage.add('retired');}
   // An emergency pause may arrive before an unrelated delayed setting result.
   if(key!=='pause'&&next()%3===0){send({type:'settings.change',value:{pause:true}});values.pause=true;coverage.add('pause-during-setting');}
   clock.advanceTo(clock.time+10);assert.equal(send({type:'setting.accept',id:begin.id}).accepted,false,'duplicate setter result');finish(op);
   if(outcome===3)source();
   if(step%7===0){
    const requested=send({type:'seek.request',latest:true});const id=++intentSerial;assert.equal(requested.id,id);assert.deepEqual(requested.retire,latest===null?[]:[latest]);seeks.add(id);latest=id;
    clock.scheduleDeadline(()=>{send({type:'seek.settled',id});seeks.delete(id);if(latest===id)latest=null;send({type:'seek.settled',id});},100+next()%1000);coverage.add('latest-seek');
   }
   if(step%11===0){
    values.pause=false;send({type:'settings.change',value:{pause:false}});const loop=!!(next()%2);
    send({type:'preferences.change',value:{playbackRange:{start:1,end:5},loopPolicy:loop}});
    const id=send({type:'boundary.sample',time:5,duration:10,ended:false}).id;assert.ok(id);const op=operation();
    assert.deepEqual(send({type:'boundary.start',id,time:5,duration:10,ended:false}).effects,[{kind:'pause'}]);
    assert.equal(send({type:'boundary.complete',id,phase:'seeking'}).accepted,false,'out of order boundary');
    assert.deepEqual(send({type:'boundary.complete',id,phase:'pausing'}).effects,[{kind:'seek',value:loop?1:5}]);values.pause=!loop;
    assert.equal(send({type:'boundary.complete',id,phase:'pausing'}).accepted,false);
    assert.deepEqual(send({type:'boundary.complete',id,phase:'seeking'}).effects,[{kind:'seek.verify',value:loop?1:5}]);
    assert.deepEqual(send({type:'boundary.complete',id,phase:'verifying'}).effects,loop?[{kind:'play'}]:[]);
    if(loop)send({type:'boundary.complete',id,phase:'resuming'});finish(op);send({type:'boundary.settled',id});coverage.add(loop?'loop':'range-stop');
   }
   clock.advanceTo(clock.time+next()%100);if(step%64===63)clock.advanceTo(clock.time+28*day/Math.floor(steps/64));
   check();
  }
  clock.advanceTo(clock.time+day);check();send({type:'operation.retire',terminal:true});assert.equal(send({type:'setting.begin',command:{kind:'volume',value:50},hasBackend:true}).accepted,false);assert.equal(clock.timers.size,0);
  return{seed,steps,checks,virtualDays:clock.time/day,coverage:[...coverage].sort()};
 }catch(error){throw new Error(`Control soak failed: seed=${seed}, steps=${steps}, step=${step}\nLast inputs: ${JSON.stringify(suffix)}`,{cause:error});}
}
