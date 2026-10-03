// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLegacyAdaptiveDecode,transitionLegacyAdaptiveDecode} from '../../web/generated/internal/machine/legacy-adaptive-decode.js';
import {initialLegacyRetainedPresentation,transitionLegacyRetainedPresentation,legacyRetainedRequestCurrent,legacyRetainedNeedsPump} from '../../web/generated/internal/machine/legacy-retained-presentation.js';
const input={codec:'h264',decodeQuality:'exact',maxDecodePixels:8294400};
const adaptive=(codec='h264',quality='exact')=>initialLegacyAdaptiveDecode({...input,codec,decodeQuality:quality},true);
function pressure(state,now,drops){state=transitionLegacyAdaptiveDecode(state,{type:'observe',name:'decoder-frame-drop-count',value:drops,now,position:0}).state;return transitionLegacyAdaptiveDecode(state,{type:'sample',now,position:0,paused:false,pendingTarget:null});}
function switchReady(state=adaptive()){let result;for(let i=1;i<=4;i++){result=pressure(state,i*2000,i*3);state=result.state;}return result;}
test('adaptive samples require sustained pressure and commit only matching successful command',()=>{
 let s=adaptive();for(let i=1;i<=3;i++){const d=pressure(s,i*2000,i*3);s=d.state;assert.equal(d.request,undefined);assert.equal(s.policy.adaptiveState,'normal');}
 const request=pressure(s,8000,12);assert.ok(request.request.options.includes('skip_loop_filter=noref'));assert.equal(request.state.policy.adaptiveState,'normal');assert.equal(request.state.switching.id,request.request.id);
 assert.equal(transitionLegacyAdaptiveDecode(request.state,{type:'finish',id:999,success:true}).state,request.state);
 const applied=transitionLegacyAdaptiveDecode(request.state,{type:'finish',id:request.request.id,success:true}).state;assert.equal(applied.policy.adaptiveState,'reduced-reconstruction');assert.equal(applied.switching,null);assert.equal(pressure(applied,10000,20).accepted,false);
});
for(const action of ['failure','retirement'])test(`adaptive ${action} never commits an unaccepted policy`,()=>{
 const d=switchReady(),s=action==='retirement'?transitionLegacyAdaptiveDecode(d.state,{type:'retire'}).state:d.state;
 const result=transitionLegacyAdaptiveDecode(s,{type:'finish',id:d.request.id,success:action==='retirement'});assert.equal(result.state.policy.adaptiveState,'normal');assert.equal(result.state.switching,null);
});
test('balanced reconstruction skips identical intermediate configuration and goes to frame-drop',()=>{const d=switchReady(adaptive('h264','balanced'));assert.equal(d.state.switching.policy.adaptiveState,'drop-non-reference');assert.ok(d.request.options.includes('skip_frame=noref'));});
test('unsupported codecs and disabled adaptive policy never issue work',()=>{for(const codec of ['av1','mpeg4','mpeg1video'])assert.equal(switchReady(adaptive(codec)).request,undefined);assert.equal(switchReady(initialLegacyAdaptiveDecode(input,false)).request,undefined);});
for(const blocker of ['pause','cache','seek'])test(`adaptive ${blocker} resets pressure streak without publishing policy`,()=>{
 let s=pressure(adaptive(),2000,3).state;s=pressure(s,4000,6).state;
 if(blocker==='cache')s=transitionLegacyAdaptiveDecode(s,{type:'observe',name:'paused-for-cache',value:true,now:4000,position:0}).state;
 const d=transitionLegacyAdaptiveDecode(s,{type:'sample',now:6000,position:0,paused:blocker==='pause',pendingTarget:blocker==='seek'?1:null});assert.equal(d.state.streak,0);assert.equal(d.request,undefined);
});
test('speed and detected codec normalization are owned and detached DTO facts',()=>{
 const original={...input,codec:undefined},s=initialLegacyAdaptiveDecode(original,true);original.decodeQuality='performance';assert.equal(s.input.decodeQuality,'exact');
 const detected=transitionLegacyAdaptiveDecode(s,{type:'observe',name:'video-codec',value:'HEVC (H.265)',now:10,position:0}).state;assert.equal(detected.policy.codec,'hevc');
 const speed=transitionLegacyAdaptiveDecode({...detected,streak:2,direction:'pressure'},{type:'observe',name:'speed',value:2,now:15,position:3}).state;assert.deepEqual([speed.speed,speed.sampleAt,speed.samplePosition,speed.streak,speed.direction],[2,15,3,0,'']);assert.ok(Object.isFrozen(speed.policy.ffmpegOptions));
});
test('adaptive matching success followed by five recovery samples returns to exact',()=>{
 const d=switchReady();let s=transitionLegacyAdaptiveDecode(d.state,{type:'finish',id:d.request.id,success:true}).state;
 let next;for(let i=0;i<5;i++){next=transitionLegacyAdaptiveDecode(s,{type:'sample',now:18000+i*2000,position:10+i*2,paused:false,pendingTarget:null});s=next.state;}
 assert.equal(next.state.switching.policy.adaptiveState,'normal');
});
const receive=(s,key,generation=0)=>transitionLegacyRetainedPresentation(s,{type:'receive',pts:key,generation,pendingTarget:null});
const select=(s,key,serial=1,now=0,delay=10)=>transitionLegacyRetainedPresentation(s,{type:'select',serial,key,now,delay,redraw:false});
test('retained draw transfers one exact frame owner and duplicate callback cannot draw twice',()=>{
 const first=receive(initialLegacyRetainedPresentation(),100),selection=select(first.state,100),armed=transitionLegacyRetainedPresentation(selection.state,{type:'schedule',key:100});
 const command={type:'draw',id:armed.request.id,epoch:armed.request.epoch,now:10};assert.equal(transitionLegacyRetainedPresentation(armed.state,{...command,now:9}).accepted,false);
 const drawn=transitionLegacyRetainedPresentation(armed.state,command);assert.equal(drawn.frame,first.accept);assert.equal(drawn.state.held.id,first.accept);assert.equal(drawn.state.pending.length,0);assert.equal(drawn.state.frames.length,0);assert.equal(drawn.state.drawn,0);const presented=transitionLegacyRetainedPresentation(drawn.state,{type:'presented',id:drawn.drawing,epoch:command.epoch});assert.equal(presented.state.drawn,1);assert.equal(transitionLegacyRetainedPresentation(presented.state,{type:'presented',id:drawn.drawing,epoch:command.epoch}).accepted,false);assert.equal(transitionLegacyRetainedPresentation(drawn.state,command).accepted,false);
});
test('retained frame and pending request budgets reject before owner allocation',()=>{
 let s=initialLegacyRetainedPresentation();for(let key=0;key<16;key++)s=receive(s,key).state;assert.equal(legacyRetainedNeedsPump(s),true);const rejected=receive(s,17);assert.equal(rejected.error,'Retained frame bound exceeded');assert.equal(rejected.state.frames.length,16);assert.equal(rejected.state.serial,s.serial);
 s=initialLegacyRetainedPresentation();for(let key=0;key<8;key++)s=select(s,key,key+1).state;const full=select(s,8,9);assert.equal(full.error,'Pending presentation bound exceeded');assert.equal(full.state.pending.length,8);assert.equal(full.state.serial,s.serial);
});
test('generation advance and reset cancel timer identities before same-timestamp replacement',()=>{
 let s=receive(initialLegacyRetainedPresentation(),100).state;s=select(s,100).state;const armed=transitionLegacyRetainedPresentation(s,{type:'schedule',key:100});
 const advanced=receive(armed.state,100,1);assert.deepEqual(advanced.cancel,[armed.request.id]);assert.equal(advanced.close.length,1);assert.equal(advanced.state.pending.length,0);assert.equal(legacyRetainedRequestCurrent(advanced.state,armed.request.id,armed.request.epoch),false);
 const stale=transitionLegacyRetainedPresentation(advanced.state,{type:'draw',id:armed.request.id,epoch:armed.request.epoch,now:100});assert.equal(stale.accepted,false);assert.equal(stale.state,advanced.state);
 const reset=transitionLegacyRetainedPresentation(advanced.state,{type:'reset',target:2});assert.deepEqual(reset.close,[advanced.accept]);assert.equal(receive(reset.state,2000000,1).discard,true);assert.equal(receive(reset.state,1000,2).discard,true);assert.ok(receive(reset.state,2000000,2).accept);
});
test('pending earlier selections retain required frames while unselected preroll releases',()=>{
 let s=initialLegacyRetainedPresentation();for(const key of [1,2,3])s=receive(s,key).state;s=select(s,1).state;const next=select(s,3,2);assert.deepEqual(next.close,[2]);assert.deepEqual(next.state.frames.map(x=>x.key),[1,3]);assert.ok(receive(next.state,1).error.includes('Duplicate'));
});
test('held redraw uses existing owner and successor draw releases it once',()=>{
 const initial=receive(initialLegacyRetainedPresentation(),100);let s=select(initial.state,100).state;let d=transitionLegacyRetainedPresentation(s,{type:'schedule',key:100});s=transitionLegacyRetainedPresentation(d.state,{type:'draw',id:d.request.id,epoch:d.request.epoch,now:10}).state;
 const redraw=transitionLegacyRetainedPresentation(s,{type:'select',serial:2,key:100,now:10,delay:0,redraw:true});assert.equal(redraw.redraw,initial.accept);assert.equal(redraw.state.pending.length,0);
 const next=receive(redraw.state,200);s=select(next.state,200,3,10,0).state;d=transitionLegacyRetainedPresentation(s,{type:'schedule',key:200});const draw=transitionLegacyRetainedPresentation(d.state,{type:'draw',id:d.request.id,epoch:d.request.epoch,now:10});assert.deepEqual(draw.close,[initial.accept]);assert.equal(draw.state.held.id,next.accept);
});
test('missing frame deadline is exact and closed owner discards every late receipt',()=>{
 const s=select(initialLegacyRetainedPresentation(),1).state;assert.equal(transitionLegacyRetainedPresentation(s,{type:'check',now:510}).error,undefined);assert.ok(transitionLegacyRetainedPresentation(s,{type:'check',now:511}).error.includes('did not arrive'));
 const closed=transitionLegacyRetainedPresentation(s,{type:'reset',closed:true});assert.equal(closed.cancel.length,1);assert.equal(receive(closed.state,1).discard,true);assert.equal(select(closed.state,1).accepted,false);
});
test('retained deterministic generation histories preserve independent receipt accounting and bounds',()=>{
 const run=()=>{let s=initialLegacyRetainedPresentation(),owned=new Set(),received=0,closed=0,drawn=0;const transitions=[];
  const send=input=>{const d=transitionLegacyRetainedPresentation(s,input);s=d.state;for(const id of d.close){assert.ok(owned.delete(id),'double close');closed++;}if(d.accept){assert.ok(!owned.has(d.accept));owned.add(d.accept);}if(d.frame)drawn++;assert.deepEqual([...owned].sort((a,b)=>a-b),[...s.frames.map(x=>x.id),...s.held?[s.held.id]:[]].sort((a,b)=>a-b));assert.ok(owned.size<=16);assert.ok(s.pending.length<=8);transitions.push([input.type,d.accepted,!!d.error]);return d;};
  for(let generation=0;generation<30;generation++){for(let i=0;i<4;i++){const key=generation*100+i;received++;send({type:'receive',pts:key,generation,pendingTarget:null});const d=send({type:'select',serial:i+1,key,now:key,delay:0,redraw:false});const arm=send({type:'schedule',key});if(arm.request)send({type:'draw',id:arm.request.id,epoch:arm.request.epoch,now:key});}send({type:'reset'});}
  assert.equal(owned.size,0);assert.equal(closed,received);assert.equal(drawn,received);return {state:s,transitions};};assert.deepEqual(run(),run());
});
test('adaptive source reset fences old command result without reusing request identity',()=>{const d=switchReady(),reset=transitionLegacyAdaptiveDecode(d.state,{type:'reset',now:8000,position:0}).state;assert.equal(reset.switching,null);assert.equal(transitionLegacyAdaptiveDecode(reset,{type:'finish',id:d.request.id,success:true}).state,reset);let s=reset,result;for(let i=1;i<=3;i++){result=pressure(s,8000+i*2000,12+i*3);s=result.state;}assert.ok(result.request.id>d.request.id);});
test('retained epoch exhaustion clears owners and permanently denies reopening without identity reuse',()=>{const frame=receive(initialLegacyRetainedPresentation(),1);const s={...frame.state,epoch:Number.MAX_SAFE_INTEGER};const closed=transitionLegacyRetainedPresentation(s,{type:'reset'});assert.equal(closed.state.closed,true);assert.equal(closed.state.epoch,Number.MAX_SAFE_INTEGER);assert.deepEqual(closed.close,[frame.accept]);assert.equal(transitionLegacyRetainedPresentation(closed.state,{type:'reset',closed:false}).state.closed,true);assert.equal(receive(closed.state,1,1).discard,true);const generation=receive(s,1,1);assert.equal(generation.state.closed,true);assert.equal(generation.discard,true);assert.equal(generation.accept,undefined);assert.deepEqual(generation.close,[frame.accept]);});
