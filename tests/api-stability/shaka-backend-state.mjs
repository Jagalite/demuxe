// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialShakaBackend,transitionShakaBackend,shakaLeaseCurrent} from '../../web/generated/internal/machine/shaka-backend.js';
const initial=()=>initialShakaBackend({preload:'auto',profile:'balanced'});
const source={format:'dash',live:false,maxBandwidth:1e6};
test('load admission retains single allocation and permits runtime retry before allocation',()=>{
 let result=transitionShakaBackend(initial(),{type:'open',source}),state=result.state,old=result.lease;
 assert.equal(transitionShakaBackend(state,{type:'open',source}).accepted,false);
 state=transitionShakaBackend(state,{type:'failed',lease:old}).state;
 result=transitionShakaBackend(state,{type:'open',source});assert.equal(result.accepted,true);state=result.state;
 assert.equal(shakaLeaseCurrent(state,old),false);state=transitionShakaBackend(state,{type:'allocate',lease:result.lease}).state;
 state=transitionShakaBackend(state,{type:'failed',lease:result.lease}).state;assert.equal(transitionShakaBackend(state,{type:'open',source}).accepted,false);
});
for(const domain of ['load','quality','selection','buffering','attachment'])test(`retirement atomically rejects ${domain} completions`,()=>{
 let result=transitionShakaBackend(initial(),{type:'open',source});if(domain!=='load')result=transitionShakaBackend(result.state,{type:'begin',domain});
 const lease=result.lease,epoch=result.state.epoch,state=transitionShakaBackend(result.state,{type:'close'}).state;
 for(const command of [{type:'finish',lease},{type:'opened',lease},{type:'quality',lease,value:{mode:'manual',id:'variant:4'},runtime:true},{type:'buffering',lease,value:{preload:'none',profile:'balanced'}},{type:'attached',lease,id:1,select:true},{type:'observed',epoch,value:{observation:'playhead-buffer',position:1,width:640,height:360,codec:'avc1',bandwidth:1e6,contentType:'video'}},{type:'failure',epoch}]){const result=transitionShakaBackend(state,command);assert.equal(result.accepted,false);assert.equal(result.state,state);}
});
test('settings supersede their own domain; concurrent attachments retain unique indexes',()=>{
 let state=initial(),requests={};for(const domain of ['quality','selection','buffering','attachment']){const result=transitionShakaBackend(state,{type:'begin',domain});state=result.state;requests[domain]=result.lease;}
 let result=transitionShakaBackend(state,{type:'begin',domain:'quality'});state=result.state;assert.equal(shakaLeaseCurrent(state,requests.quality),false);
 for(const domain of ['selection','buffering','attachment'])assert.equal(shakaLeaseCurrent(state,requests[domain]),true);
 result=transitionShakaBackend(state,{type:'begin',domain:'attachment'});state=result.state;const second=result.lease;
 state=transitionShakaBackend(state,{type:'attached',lease:second,id:2,select:false}).state;state=transitionShakaBackend(state,{type:'attached',lease:requests.attachment,id:1,select:true}).state;
 assert.deepEqual(state.external.map(item=>[item.id,item.index]),[[2,1],[1,2]]);assert.equal(state.selectedSub,'shaka-sub-1');
 assert.equal(transitionShakaBackend(state,{type:'attached',lease:second,id:3,select:false}).accepted,false);
});
test('cross-domain acknowledgments cannot mutate accepted preferences',()=>{
 const result=transitionShakaBackend(initial(),{type:'begin',domain:'attachment'}),state=result.state,lease=result.lease;
 for(const command of [{type:'quality',lease,value:{mode:'auto'},runtime:true},{type:'selection',lease,visible:false},{type:'buffering',lease,value:{preload:'none',profile:'balanced'}},{type:'allocate',lease},{type:'defaults',lease,value:{bufferingGoal:1}}])assert.equal(transitionShakaBackend(state,command).state,state);
});
test('deterministic sequence replay preserves frozen prior states across control variations',()=>{
 const run=()=>{let state=initial();const states=[];for(let index=0;index<100;index++){const old=state,before=JSON.stringify(old),domain=index<64?['quality','selection','buffering','attachment'][index%4]:['quality','selection','buffering'][index%3];let result=transitionShakaBackend(state,{type:'begin',domain});state=result.state;const lease=result.lease;
 const command=domain==='quality'?{type:'quality',lease,value:{mode:'auto',maxHeight:360+index},runtime:true}:domain==='selection'?{type:'selection',lease,visible:index%3!==0}:domain==='buffering'?{type:'buffering',lease,value:{preload:'auto',profile:'balanced',aheadSeconds:index+1}}:{type:'attached',lease,id:index,select:false};state=transitionShakaBackend(state,command).state;state=transitionShakaBackend(state,{type:'finish',lease}).state;
 assert.equal(JSON.stringify(old),before);assert.ok(Object.isFrozen(state));assert.equal(state.requests.length,0);states.push(state);}return states;};assert.deepEqual(run(),run());
});
test('quality policy respects selected audio, source ceilings and representation identity',async()=>{
 const {shakaQualityPlan}=await import('../../web/generated/internal/machine/shaka-backend.js');
 const base={id:4,active:true,audioIdentity:'en',videoCodec:'avc1',originalVideoId:'4',originalAudioId:null,bandwidth:900000,height:720};
 const tracks=[base,{...base,id:5,active:false,bandwidth:400000,height:360},{...base,id:6,active:false,audioIdentity:'fr',bandwidth:300000,height:240}];
 let state=transitionShakaBackend(initial(),{type:'open',source}).state;
 assert.deepEqual(shakaQualityPlan(state,tracks,{mode:'auto',maxHeight:360}).ids,[5]);assert.equal(shakaQualityPlan(state,tracks,{mode:'manual',id:'variant:6'}).failure,'no-quality');
 state=transitionShakaBackend(initial(),{type:'open',source:{...source,representation:'4'}}).state;
 assert.equal(shakaQualityPlan(state,tracks,{mode:'auto'}).failure,'source-pin');assert.deepEqual(shakaQualityPlan(state,tracks,{mode:'manual',id:'variant:5'}).ids,[5]);
 state=transitionShakaBackend(initial(),{type:'open',source:{...source,representation:'variant:4'}}).state;assert.equal(shakaQualityPlan(state,tracks,{mode:'manual',id:'variant:5'}).failure,'no-quality');
});
test('variant supersession preserves the old physical slot until cleanup and rejects forged release',()=>{
 let result=transitionShakaBackend(initial(),{type:'begin',domain:'quality'}),old=result.lease,state=transitionShakaBackend(result.state,{type:'enter',lease:old}).state;
 result=transitionShakaBackend(state,{type:'begin',domain:'audio'});state=result.state;const latest=result.lease;
 assert.equal(shakaLeaseCurrent(state,old),false);assert.equal(state.effect,old);assert.equal(transitionShakaBackend(state,{type:'enter',lease:latest}).accepted,false);
 assert.equal(transitionShakaBackend(state,{type:'leave',lease:latest}).state,state);
 state=transitionShakaBackend(state,{type:'leave',lease:old}).state;assert.equal(transitionShakaBackend(state,{type:'enter',lease:latest}).accepted,true);
});
