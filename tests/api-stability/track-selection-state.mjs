// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
const item=(id,overrides={})=>({id:`1:audio:stream:${id}`,backendId:String(id+1),key:`audio:stream:${id}`,language:'english',title:'Main',codec:'aac',streamIndex:id,default:false,selected:false,...overrides});
const facts=(overrides={})=>({sourceId:1,session:1,inventory:[item(0,{default:true,selected:true}),item(1)],policy:undefined,plan:'hybrid',surfaceLocked:false,automaticLossless:false,...overrides});
function core(mode='hybrid',automatic=true){let state=initialPlayerControl();const send=input=>{const before=state,text=JSON.stringify(state),out=transitionPlayer(state,input);assert.equal(JSON.stringify(before),text);state=out.state;return out;};send({type:'source.configure',mode,automatic});send({type:'settings.change',value:{aid:'1'}});send({type:'preferences.change',value:{publicSelections:{audio:'audio:stream:0'}}});const attempt=send({type:'source.begin',operationEpoch:state.operations.epoch,mode,preserve:false,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])send({type,attempt});send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:state.settings,publicSelections:state.preferences.publicSelections,planMatches:true});send({type:'source.finished',attempt});const operation=send({type:'operation.admit',kind:'switching'}).id;send({type:'operation.start',id:operation});return{get state(){return state;},send,operation};}
function begin(r,overrides={}){return r.send({type:'setting.begin',hasBackend:true,hasSource:true,command:{kind:'publicTrack',track:'audio',id:'1:audio:stream:1',facts:facts(),...overrides}});}
function acceptCandidate(r,settings,publicSelections){const attempt=r.send({type:'source.begin',operationEpoch:r.state.operations.epoch,mode:'native',preserve:publicSelections===undefined,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])r.send({type,attempt});r.send({type:'source.accept',attempt,operationEpoch:r.state.operations.epoch,settings,planMatches:true,publicSelections});r.send({type:'source.finished',attempt});}
for(const outcome of ['accept','restore','degrade','retire'])test(`direct public selection ${outcome} keeps stable identity transactional`,()=>{
  const r=core(),request=begin(r);assert.deepEqual(request.effects.map(effect=>effect.kind),['track','track.verify']);assert.equal(r.state.settings.aid,'1');assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:0');
  if(outcome==='accept'){assert.deepEqual(r.send({type:'setting.accept',id:request.id}).effects,[{kind:'promotion'}]);assert.equal(r.state.settings.aid,'2');assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:1');}
  else if(outcome==='retire'){r.send({type:'operation.retire',terminal:false});assert.equal(r.send({type:'setting.accept',id:request.id}).accepted,false);assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:0');}
  else {assert.deepEqual(r.send({type:'setting.failed',id:request.id}).effects.map(effect=>[effect.kind,effect.value]),[['track','1'],['track.verify','1']]);r.send({type:outcome==='restore'?'setting.restored':'setting.degraded',id:request.id});assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:0');assert.equal(r.state.settings.aid,'1');assert.equal(!!r.state.settingsTransactions.degraded,outcome==='degrade');}
});
for(const automatic of [true,false])test(`native audio uses ${automatic?'automatic selection':'pinned replacement'} and commits remapped backend ID atomically`,()=>{
  const r=core('native',automatic),request=begin(r,{facts:facts({plan:'remux'})});assert.equal(request.effects[0].kind,automatic?'source.reconfigure':'source.replace');
  assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:0');assert.equal(r.state.settingsTransactions.pending.preferences.publicSelections.audio,'audio:stream:1');
  acceptCandidate(r,{...r.state.settings,aid:'17'});assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:1');assert.equal(r.state.settings.aid,'17');
  r.send({type:'setting.accept',id:request.id});assert.equal(r.state.settings.aid,'17');assert.equal(r.state.settingsTransactions.pending,null);
});
for(const [name,changes,reason] of [
  ['stale inventory',{facts:facts({session:0})},'invalid'],['foreign source',{id:'9:audio:stream:1'},'invalid'],['unknown track',{id:'1:audio:stream:99'},'invalid'],
  ['locked',{facts:facts({policy:{locked:true}})},'unsupported'],['off prohibited',{id:null,facts:facts({policy:{allowOff:false}})},'unsupported'],
  ['auto prohibited',{id:'auto',facts:facts({policy:{allowAuto:false}})},'unsupported'],['track disallowed',{facts:facts({policy:{allowed:[{streamIndex:0}]}})},'unsupported'],
])test(`public track admission rejects ${name} without starting effects`,()=>{const r=core(),before=r.state,out=begin(r,changes);assert.equal(out.accepted,false);assert.equal(out.reason,reason);assert.equal(r.state,before);assert.deepEqual(out.effects,[]);});
test('automatic track policy chooses among allowed preferences and preserves explicit off semantics',()=>{
  const r=core(),out=begin(r,{id:'auto',facts:facts({policy:{default:[{language:'japanese'},{language:'english'}],allowed:[{streamIndex:1}]}})});assert.equal(out.effects[0].value,'2');r.send({type:'setting.accept',id:out.id});assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:1');
  const off=begin(r,{id:'auto',facts:facts({policy:{default:'off'}})});assert.equal(off.effects[0].value,'no');r.send({type:'setting.accept',id:off.id});assert.equal(r.state.preferences.publicSelections.audio,undefined);
});
test('selected native track remembers stable requirement without replacing or changing backend auto setting',()=>{const r=core('native');r.send({type:'settings.change',value:{aid:'auto'}});const out=begin(r,{id:'1:audio:stream:0',facts:facts({plan:'direct'})});assert.deepEqual(out.effects,[]);r.send({type:'setting.accept',id:out.id});assert.equal(r.state.settings.aid,'auto');assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:0');});
test('unchanged track leaves remembered selection untouched and produces no promotion',()=>{const r=core();r.send({type:'preferences.change',value:{publicSelections:{}}});const out=begin(r,{id:'1:audio:stream:0'});assert.deepEqual(out.effects,[]);assert.deepEqual(r.send({type:'setting.accept',id:out.id}).effects,[]);assert.deepEqual(r.state.preferences.publicSelections,{});});
test('subtitle renderer and video-PiP requirements are selected before track mutation',()=>{
  const inventory=[item(1,{id:'1:sub:stream:1',key:'sub:stream:1'})];
  for(const surfaceLocked of [false,true]){const r=core('native'),out=begin(r,{track:'sub',id:'1:sub:stream:1',facts:facts({inventory,plan:'direct',surfaceLocked})});if(surfaceLocked){assert.equal(out.accepted,false);assert.equal(out.reason,'unsupported');}else assert.equal(out.effects[0].kind,'source.reconfigure');}
});
test('new source acceptance commits initial stable selections and close clears only source identity',()=>{const r=core();const keys={audio:'audio:stream:5'};acceptCandidate(r,r.state.settings,keys);keys.audio='changed';assert.equal(r.state.preferences.publicSelections.audio,'audio:stream:5');r.send({type:'preferences.change',value:{muted:true}});r.send({type:'source.clear'});assert.deepEqual(r.state.preferences.publicSelections,{});assert.equal(r.state.preferences.muted,true);});
function adapter(t,mode='native'){
  const p=unitPlayer(),backend=new EventTarget(),raw=[{id:1,type:'audio','ff-index':0,lang:'eng',selected:true,default:true},{id:2,type:'audio','ff-index':1,lang:'eng',selected:false}];
  Object.assign(backend,{properties:new Map([['track-list',raw]]),diagnostics:{plan:mode==='native'?'remux':'hybrid'},destroy:async()=>{},pause:async()=>{},play:async()=>{}});
  p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};p.currentMode=mode;acceptSourceIdentity(p,1);p.updateSettings({aid:'1'});p.updatePreferences({publicSelections:{audio:'audio:stream:0'}});t.after(()=>p.destroy());return{p,backend};
}
test('actual failed routed selection exposes desired key only to candidate preparation',async t=>{
  const {p}=adapter(t);p.select=async()=>{assert.equal(p.control.preferences.publicSelections.audio,'audio:stream:0');assert.equal(p.publicSelections.get('audio'),'audio:stream:1');throw Error('candidate rejected');};
  await assert.rejects(p.selectAudioTrack('1:audio:stream:1'),/candidate rejected/);assert.equal(p.publicSelections.get('audio'),'audio:stream:0');assert.equal(p.settings.aid,'1');assert.equal(p.control.settingsTransactions.pending,null);
});
test('actual direct selection waits for verification before accepting its stable key',async t=>{
  const {p,backend}=adapter(t,'hybrid');let release,ready;const started=new Promise(resolve=>ready=resolve);backend.selectTrack=async()=>{};p.confirmTrackSelection=()=>{ready();return new Promise(resolve=>release=resolve);};
  const work=p.selectAudioTrack('1:audio:stream:1');await started;assert.equal(p.publicSelections.get('audio'),'audio:stream:0');release();await work;assert.equal(p.publicSelections.get('audio'),'audio:stream:1');assert.equal(p.settings.aid,'2');
});
test('actual routed selection completing after close cannot restore expired public identities',async t=>{
  const {p}=adapter(t);let release,ready;const started=new Promise(resolve=>ready=resolve);p.select=()=>{ready();return new Promise(resolve=>release=resolve);};
  const work=p.selectAudioTrack('1:audio:stream:1'),rejected=assert.rejects(work,{code:'ABORTED'});await started;const closing=p.close();release();await rejected;await closing;assert.deepEqual(p.control.preferences.publicSelections,{});assert.equal(p.control.settingsTransactions.pending,null);
});
for(const plan of ['direct','shaka-mse','remux-mpv'])test(`subtitle visibility keeps ${plan} route requirements transactional`,()=>{
  const r=core('native');r.send({type:'settings.change',value:{subtitles:false}});
  const request=r.send({type:'setting.begin',hasBackend:true,hasSource:true,command:{kind:'visibility',value:true,facts:{policy:undefined,hasTracks:true,surfaceLocked:false,plan}}});
  assert.equal(request.effects[0].kind,plan==='direct'?'source.reconfigure':'subtitles');assert.equal(r.state.settings.subtitles,false);
  r.send({type:'setting.failed',id:request.id});r.send({type:'setting.restored',id:request.id});assert.equal(r.state.settings.subtitles,false);
});
test('visibility no-op preserves host lock semantics and disabled subtitles still request promotion',()=>{
  const r=core();r.send({type:'settings.change',value:{subtitles:false}});const command={kind:'visibility',value:false,facts:{policy:{locked:true},hasTracks:true,surfaceLocked:true,plan:'direct'}};
  const request=r.send({type:'setting.begin',hasBackend:true,hasSource:true,command});assert.deepEqual(request.effects,[]);assert.deepEqual(r.send({type:'setting.accept',id:request.id}).effects,[{kind:'promotion'}]);
  const rejection=r.send({type:'setting.begin',hasBackend:true,hasSource:true,command:{...command,value:true}});assert.equal(rejection.accepted,false);assert.match(rejection.message,/locked/);
});
test('cleanup failure after accepted route cannot restore the previous stable track key',async t=>{
  const {p}=adapter(t);p.select=async()=>{
    const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'native',preserve:true,planId:'fixture'}).id;
    for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
    p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:{...p.settings,aid:'12'},planMatches:true});p.dispatchControl({type:'source.finished',attempt});
    throw Error('old cleanup failed');
  };
  await assert.rejects(p.selectAudioTrack('1:audio:stream:1'),/old cleanup failed/);assert.equal(p.settings.aid,'12');assert.equal(p.control.preferences.publicSelections.audio,'audio:stream:1');assert.equal(p.control.settingsTransactions.pending,null);
});
