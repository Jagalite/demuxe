// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../web/generated/unified-player.js';
import {initialPlayerControl} from '../web/generated/internal/machine/state.js';
import {initialPromotion,transitionPromotion,promotionCandidates} from '../web/generated/internal/machine/route-promotion.js';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function player({automatic=true,paused=true,background=false}={}){
  const p=Object.create(Player.prototype),source={kind:'local'};
  let refreshes=0,inspections=0,replacements=0,revision=0,adopted=0;
  Object.assign(p,{control:initialPlayerControl(),operationResources:new Map(),automatic,source,current:{backend:{}},settings:{pause:paused,aid:'auto',sid:'no',subtitles:false},queue:Promise.resolve(),
    sharedRuntime:{},providerRuntime:{refresh(){refreshes++;if(revision===adopted)return false;adopted=revision;return true;}},
    backgroundPromotion:background?{maxKnownBytes:512*1024*1024}:undefined,
    publish(){},startWatchdogs(){},tierConfiguration:()=>'',tierAttempts:{reason:()=>undefined,failure(){}},
    admissible:()=>[{id:'native-direct',mode:'native',eligible:true},{id:'software-full',mode:'software',eligible:true}],
    select:async()=>{inspections++;p.sourceInspection={source,probe:{format:'mp4',tracks:[]},settings:p.settings};},
    replace:async()=>{replacements++;},
  });
  Object.defineProperty(p,'diagnostics',{value:{plan:{id:'software-full'}}});
  p.sourceInspection={source,probe:{format:'mp4',tracks:[]},settings:p.settings};
  return {p,change(){revision++;p.providersChanged();},counts:()=>({refreshes,inspections,replacements})};
}
test('a provider publication coalesces and reevaluates through ordinary promotion',async()=>{
  const f=player();f.change();f.change();f.change();await delay(260);await f.p.queue;
  assert.equal(f.counts().inspections,1);assert.equal(f.counts().replacements,1);assert.equal(f.p.providerUpdatePending,false);
  f.p.cancelPromotion();
});
test('playing players reevaluate admission without bypassing overlap policy',async()=>{
  const f=player({paused:false});f.change();await delay(260);await f.p.queue;
  assert.equal(f.counts().inspections,1);assert.equal(f.counts().replacements,0);assert.equal(f.p.planDecisions[0].id,'native-direct');f.p.cancelPromotion();
});
test('preparation adopting a catalog preserves the later route inspection',async()=>{
  const f=player({paused:false});f.change();
  assert.equal(f.p.refreshProviders(false),true);
  await delay(260);await f.p.queue;
  assert.equal(f.counts().inspections,1);assert.equal(f.counts().replacements,0);
  assert.equal(f.p.providerUpdatePending,false);f.p.cancelPromotion();
});
test('playing players with an overlap budget use existing native promotion',async()=>{
  const f=player({paused:false,background:true});f.change();await delay(260);await f.p.queue;
  assert.equal(f.counts().replacements,1);f.p.cancelPromotion();
});
test('pinned modes do not automatically replace playback on provider publication',async()=>{
  const f=player({automatic:false});f.change();await delay(260);await f.p.queue;
  assert.equal(f.counts().inspections,0);assert.equal(f.counts().replacements,0);f.p.cancelPromotion();
});
test('updates during user work wait for the operation queue and then reevaluate',async()=>{
  const f=player();let release,started;const began=new Promise(resolve=>started=resolve);
  const operation=f.p.enqueue(async()=>{started();await new Promise(resolve=>release=resolve);});await began;
  f.change();assert.equal(f.p.control.routing.promotion.timer,null);release();await operation;await delay(260);await f.p.queue;
  assert.equal(f.counts().replacements,1);f.p.cancelPromotion();
});
test('a catalog update during inspection is processed again after the current operation',async()=>{
  const f=player();let release,started;const began=new Promise(resolve=>started=resolve),select=f.p.select;
  f.p.select=async(...args)=>{await select(...args);if(!release){started();await new Promise(resolve=>release=resolve);}};
  f.change();await began;f.change();release();await delay(280);await f.p.queue;
  assert.equal(f.counts().inspections,2);f.p.cancelPromotion();
});
test('unchanged failed and lower ranked routes are never promoted',()=>{
  assert.deepEqual(promotionCandidates([{id:'native-direct',mode:'native',eligible:true,cachedFailure:true},{id:'hybrid',mode:'hybrid',eligible:true,cachedFailure:false},{id:'software-full',mode:'software',eligible:true,cachedFailure:false}],'hybrid',true),[]);
  assert.deepEqual(promotionCandidates([{id:'hybrid',mode:'hybrid',eligible:true,cachedFailure:false},{id:'software-full',mode:'software',eligible:true,cachedFailure:false}],'software-full',false),[]);
});
test('provider-triggered promotion retains stale timer and queued-work fences',()=>{
  const facts={automatic:true,source:true,current:true,error:false,paused:false,background:false,waiting:false,queued:0,reevaluate:true};
  let s=transitionPromotion(initialPromotion(),{kind:'schedule',now:0,facts}),id=s.timer.id;
  assert.equal(transitionPromotion(s,{kind:'fired',id,now:200,facts:{...facts,queued:1}}).active,null);
  s=transitionPromotion(s,{kind:'cancel'});assert.equal(transitionPromotion(s,{kind:'fired',id,now:200,facts}).active,null);
});
test('retired players ignore provider notifications',()=>{
  const f=player();f.p.dispatchControl({type:'operation.retire',terminal:true});f.change();
  assert.equal(f.p.providerUpdatePending,false);assert.equal(f.p.control.routing.promotion.timer,null);
});

test('a notification reentering refresh survives consumption of the preceding update',()=>{
  const f=player();f.change();f.p.cancelPromotion();
  const refresh=f.p.providerRuntime.refresh;let reentered=false;
  f.p.providerRuntime.refresh=()=>{const changed=refresh();if(!reentered){reentered=true;f.change();}return changed;};
  assert.equal(f.p.refreshProviders(),true);assert.equal(f.p.providerUpdatePending,true);
  assert.equal(f.p.refreshProviders(),true);assert.equal(f.p.providerUpdatePending,false);f.p.cancelPromotion();
});
