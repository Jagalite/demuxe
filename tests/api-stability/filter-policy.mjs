// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
function core(){let state=initialPlayerControl();const send=input=>{const result=transitionPlayer(state,input);state=result.state;return result;};const id=send({type:'operation.admit',kind:null}).id;send({type:'operation.start',id});return {send,get state(){return state;}};}

for(const mode of ['native','hybrid'])test(`forced ${mode} rejects no-source tone mapping without accepting desired preferences`,async t=>{
  const r=core();r.send({type:'source.configure',automatic:false,mode});const before=r.state;
  const rejected=r.send({type:'setting.begin',command:{kind:'toneMapping',value:'hdr-to-sdr'},hasBackend:false,hasSource:false});
  assert.equal(rejected.accepted,false);assert.equal(rejected.reason,'unsupported');assert.equal(rejected.state,before);assert.deepEqual(rejected.effects,[]);
  const p=unitPlayer();t.after(()=>p.destroy());p.automatic=false;p.currentMode=mode;let selections=0;p.select=async()=>{selections++;};
  await assert.rejects(p.setToneMapping('hdr-to-sdr'),{code:'UNSUPPORTED_FEATURE'});
  assert.equal(p.toneMapping,'off');assert.equal(p.mode,mode);assert.equal(p.control.settingsTransactions.pending,null);assert.equal(selections,0);
});

for(const requirement of ['video','audio','tone'])test(`clearing the final no-source ${requirement} requirement retains the accepted route until selection`,async t=>{
  const p=unitPlayer();t.after(()=>p.destroy());p.automatic=true;let selections=0;p.select=async()=>{selections++;};
  const update=requirement==='video'?value=>p.setVideoFilters(value):requirement==='audio'?value=>p.setAudioFilters(value):value=>p.setToneMapping(value);
  const enabled=requirement==='video'?'hflip':requirement==='audio'?'volume=0.5':'hdr-to-sdr',empty=requirement==='tone'?'off':'';
  await update(enabled);assert.equal(p.mode,'software');await update(empty);
  assert.equal(p.mode,'software');assert.equal(p.settings.vf,'');assert.equal(p.settings.af,'');assert.equal(p.toneMapping,'off');
  await update(empty);assert.equal(p.mode,'software');assert.equal(selections,0);assert.equal(p.control.settingsTransactions.pending,null);
});

test('no-op filter and tone requirements do not issue replacement or promotion effects',()=>{
  const r=core();r.send({type:'source.configure',automatic:true,mode:'software'});r.send({type:'settings.change',value:{vf:'hflip',af:'volume=0.5'}});r.send({type:'preferences.change',value:{toneMapping:'hdr-to-sdr'}});
  for(const command of [{kind:'filters',key:'vf',value:'hflip'},{kind:'filters',key:'af',value:'volume=0.5'},{kind:'toneMapping',value:'hdr-to-sdr'}]){
    const begun=r.send({type:'setting.begin',command,hasBackend:true,hasSource:true});assert.deepEqual(begun.effects,[]);
    const accepted=r.send({type:'setting.accept',id:begun.id});assert.deepEqual(accepted.effects,[]);assert.equal(r.state.source.mode,'software');
  }
});

for(const kind of ['filter','tone'])test(`actual ${kind} clear and rollback failure records degradation without accepting the desired requirement`,async t=>{
  const p=unitPlayer(),backend=new EventTarget(),calls=[];let promotions=0;t.after(()=>p.destroy());
  Object.assign(backend,{properties:new Map(),diagnostics:{plan:'software'},pause:async()=>{},play:async()=>{},destroy:async()=>{},command:async(_command,key,value)=>{calls.push([key,value]);throw Error('filter device lost');}});
  p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};acceptSourceIdentity(p,1);p.automatic=true;p.currentMode='software';p.updateSettings({vf:'hflip'});p.schedulePromotion=()=>promotions++;
  if(kind==='tone')p.toneMapping='hdr-to-sdr';
  await assert.rejects(kind==='tone'?p.setToneMapping('off'):p.setVideoFilters(''),{code:'DECODE_FAILED'});
  assert.equal(calls.length,2);assert.deepEqual(calls[0],['vf',kind==='tone'?'hflip':'']);
  assert.equal(calls[1][0],'vf');assert.ok(calls[1][1].endsWith('hflip'));if(kind==='tone')assert.ok(calls[1][1].startsWith('lavfi=[zscale='));else assert.equal(calls[1][1],'hflip');
  assert.equal(p.settings.vf,'hflip');assert.equal(p.toneMapping,kind==='tone'?'hdr-to-sdr':'off');assert.equal(promotions,0);
  assert.equal(p.control.settingsTransactions.pending,null);assert.ok(p.control.settingsTransactions.degraded);assert.equal(p.sessionError.code,'DECODE_FAILED');assert.equal(p.sessionError.scope,'session');
});
