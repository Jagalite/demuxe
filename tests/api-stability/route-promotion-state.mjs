// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPromotion,transitionPromotion,promotionPlanAllowed} from '../../web/generated/internal/machine/route-promotion.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {Player} from '../../web/generated/unified-player.js';
const facts={automatic:true,source:true,current:true,error:false,paused:true,background:false,waiting:false,queued:0};
const schedule=(state=initialPromotion(),now=10,extra={})=>transitionPromotion(state,{kind:'schedule',now,facts:{...facts,...extra}});
const fire=(state,extra={},now=state.timer.due)=>transitionPromotion(state,{kind:'fired',id:state.timer.id,now,facts:{...facts,...extra}});
test('promotion timer owns a unique lease and explicit 200ms deadline',()=>{
 const initial=initialPromotion(),first=schedule(initial);assert.equal(first.timer.due,210);assert.equal(initial.timer,null);
 assert.equal(fire(first,{},209.999),first);const fired=fire(first);assert.equal(fired.timer,null);assert.deepEqual(fired.active,{id:1,epoch:0,phase:'queued'});
 assert.equal(transitionPromotion(fired,{kind:'fired',id:1,now:500,facts}),fired);
 const next=schedule(first,20);assert.equal(next.timer.id,2);assert.equal(transitionPromotion(next,{kind:'fired',id:1,now:500,facts}),next);
});
test('schedule and callback independently enforce automatic accepted-source eligibility',()=>{
 for(const extra of [{automatic:false},{source:false},{current:false},{error:true}]){assert.equal(schedule(undefined,10,extra).timer,null);assert.equal(fire(schedule(),extra).active,null);}
 for(const extra of [{queued:1},{waiting:true},{paused:false}])assert.equal(fire(schedule(),extra).active,null);
 assert.equal(fire(schedule(),{paused:false,background:true}).active.phase,'queued');
});
test('queued inspection and real handoff remain distinct phases',()=>{
 let state=fire(schedule());state=transitionPromotion(state,{kind:'start',id:1,facts});assert.equal(state.active.phase,'inspecting');
 const inspected=state;state=transitionPromotion(state,{kind:'trying',id:1});assert.equal(state.active.phase,'trying');assert.equal(inspected.active.phase,'inspecting');
 assert.equal(transitionPromotion(state,{kind:'start',id:1,facts}),state);
 state=transitionPromotion(state,{kind:'finished',id:1});assert.equal(state.active,null);
 for(const extra of [{automatic:false},{source:false},{current:false}])assert.equal(transitionPromotion(fire(schedule()),{kind:'start',id:1,facts:{...facts,...extra}}).active,null);
});
test('cancellation retires timer and active authority before stale callbacks or completions',()=>{
 for(const old of [schedule(),fire(schedule()),transitionPromotion(fire(schedule()),{kind:'start',id:1,facts})]){
  let state=transitionPromotion(old,{kind:'cancel'});assert.equal(state.timer,null);assert.equal(state.active,null);assert.equal(state.epoch,1);
  state=fire(schedule(state));const pending=state;
  for(const change of [{kind:'fired',id:1,now:1000,facts},{kind:'start',id:1,facts},{kind:'trying',id:1},{kind:'finished',id:1}])assert.equal(transitionPromotion(state,change),pending);
 }
});
test('a timer cannot admit a second promotion while an earlier owner is active',()=>{
 const active=fire(schedule()),next=schedule(active,300),fired=fire(next);assert.equal(fired.timer,null);assert.equal(fired.active,active.active);
});
test('playing promotion keeps Native overlap eligibility and cached failures stay excluded',()=>{
 for(const mode of ['native','hybrid','software']){assert.equal(promotionPlanAllowed(true,mode,false),true);assert.equal(promotionPlanAllowed(false,mode,false),mode==='native');assert.equal(promotionPlanAllowed(true,mode,true),false);}
});
test('composed source clear and operation retirement atomically retire promotion',()=>{
 for(const retirement of [{type:'source.clear'},{type:'operation.retire',terminal:false},{type:'operation.retire',terminal:true}]){
  let state=initialPlayerControl();const send=input=>{const d=transitionPlayer(state,input);state=d.state;return d;};
  send({type:'routing.promotion',change:{kind:'schedule',now:0,facts}});send({type:'routing.promotion',change:{kind:'fired',id:1,now:200,facts}});assert.equal(state.routing.promotion.active.id,1);
  send(retirement);assert.equal(state.routing.promotion.active,null);assert.equal(state.routing.promotion.timer,null);assert.equal(send({type:'routing.promotion',change:{kind:'trying',id:1}}).accepted,false);
  if(state.operations.terminal)assert.equal(send({type:'routing.promotion',change:{kind:'schedule',now:1000,facts}}).accepted,false);
 }
});
test('real timer rounds up early wakes and cancellation rejects an already queued callback',async t=>{
 const callbacks=[];let now=10;
 t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',(fn,delay)=>{callbacks.push({fn,delay});return callbacks.length;});t.mock.method(globalThis,'clearTimeout',()=>{});
 const p=unitPlayer();t.after(()=>p.destroy());Object.assign(p,{source:{kind:'local'},current:{backend:{}},automatic:true});let queued=0;p.enqueue=async()=>{queued++;};
 Player.prototype.schedulePromotion.call(p);assert.equal(callbacks.length,1);assert.equal(callbacks[0].delay,200);
 now=209.5;callbacks[0].fn();assert.equal(queued,0);assert.equal(callbacks.length,2);assert.equal(callbacks[1].delay,1);
 p.cancelPromotion();now=211;callbacks[1].fn();assert.equal(queued,0);assert.equal(p.control.routing.promotion.active,null);
 p.current=undefined;
});
test('abort callback observes retired promotion and cannot finish a successor',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const controller=new AbortController();p.promotionController=controller;
 p.dispatchControl({type:'routing.promotion',change:{kind:'schedule',now:0,facts}});p.dispatchControl({type:'routing.promotion',change:{kind:'fired',id:1,now:200,facts}});
 controller.signal.addEventListener('abort',()=>{assert.equal(p.control.routing.promotion.active,null);p.dispatchControl({type:'routing.promotion',change:{kind:'schedule',now:1000,facts}});});
 p.cancelPromotion();assert.equal(p.control.routing.promotion.timer.id,2);p.dispatchControl({type:'routing.promotion',change:{kind:'finished',id:1}});assert.equal(p.control.routing.promotion.timer.id,2);
});
