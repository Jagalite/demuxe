// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSourceApplication,claimSourceApplication,completeSourceApplication,sourceApplicationDone} from '../../web/generated/internal/machine/source-application.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const settings={pause:true,volume:37,speed:1.5,gain:1,aid:'auto',sid:'auto',subtitles:true,vf:'',af:''};
const facts=(extra={})=>({mode:'native',preserve:false,planId:'native-direct',settings,quality:null,outputDevice:'',attachments:0,nativeTracks:0,indexes:[],publicSelections:[],audioPolicy:false,subtitlePolicy:false,...extra});
const track=(id,extra={})=>({id,backendId:id,language:null,title:null,codec:null,streamIndex:null,default:false,selected:false,...extra});
function run(input,observe=()=>undefined){let state=initialSourceApplication(input);const effects=[];for(let count=0;count<100;count++){const before=structuredClone(state),prior=state,claim=claimSourceApplication(state);assert.deepEqual(prior,before);state=claim.state;if(!claim.effect)break;assert.equal(claimSourceApplication(state).accepted,false);const {step,...effect}=claim.effect;effects.push(effect);if(effect.kind==='reject')return {effects,state};const result=completeSourceApplication(state,step,observe(effect)??(effect.kind.endsWith('.inspect')?{kind:'support',available:false}:undefined));assert.equal(result.accepted,true);assert.equal(completeSourceApplication(result.state,step).accepted,false);state=result.state;}assert.equal(sourceApplicationDone(state),true);return {effects,state};}
test('Native application replays attachments before text tracks and native selections',()=>{
 const out=run(facts({attachments:2,nativeTracks:1}));assert.deepEqual(out.effects,[{kind:'metadata.inspect'},{kind:'attachment',index:0},{kind:'attachment',index:1},{kind:'text',index:0},{kind:'track',type:'audio',value:'auto',save:false},{kind:'track',type:'sub',value:'auto',save:false},{kind:'subtitles',value:true,save:false},{kind:'applied'}]);
});
test('software attachment replay restores explicit subtitle after all attachments',()=>{
 const out=run(facts({mode:'software',settings:{...settings,sid:'8'},attachments:2,nativeTracks:2}));assert.deepEqual(out.effects,[{kind:'metadata.inspect'},{kind:'attachment',index:0},{kind:'attachment',index:1},{kind:'track',type:'sub',value:'8',save:false},{kind:'applied'}]);
});
test('target validation precedes quality, device and metadata checks',()=>{
 const input=facts({requestedTarget:5,quality:{mode:'manual',id:'pin'},outputDevice:'device'}),failed=run(input,()=>({kind:'target',duration:4,live:false}));assert.deepEqual(failed.effects.map(effect=>effect.kind),['target','reject']);assert.equal(failed.effects.at(-1).code,'INVALID_ARGUMENT');
 for(const duration of [null,0,-1,Infinity,NaN,5])assert.equal(run(facts({requestedTarget:5}),()=>({kind:'target',duration,live:false})).effects.at(-1).code,'INVALID_ARGUMENT');
 assert.equal(run(facts({requestedTarget:5}),effect=>effect.kind==='target'?{kind:'target',duration:6,live:false}:undefined).state.pending,null);
});
test('preserved manual quality and unsupported output have ordered typed failures',()=>{
 assert.equal(run(facts({preserve:true,quality:{mode:'manual',id:'pin'}})).effects[0].message,'A manual quality pin cannot be mapped across a replacement backend');
 assert.deepEqual(run(facts({preserve:true,quality:{mode:'auto'},outputDevice:'device'})).effects.map(effect=>effect.kind),['quality.inspect','reject']);
 assert.deepEqual(run(facts({preserve:true,quality:{mode:'auto'},outputDevice:'device'}),effect=>({kind:'support',available:effect.kind==='quality.inspect'})).effects.map(effect=>effect.kind),['quality.inspect','quality','output.inspect','reject']);
});
test('quality and initial settings are detached without freezing input graphs',()=>{
 const input=facts({preserve:true,quality:{mode:'auto',maxHeight:720},settings:{...settings}}),state=initialSourceApplication(input);input.quality.maxHeight=1;input.settings.volume=0;assert.equal(state.commands[0].policy.maxHeight,720);assert.equal(state.settings.volume,37);assert.equal(Object.isFrozen(input.settings),false);assert.equal(Object.isFrozen(input.quality),false);
});
test('cross-route and external mappings preserve distinct identity semantics',()=>{
 const input=facts({mode:'software',preserve:true,indexes:[{type:'audio',index:4}],externalSubtitleKey:'sub:attachment:a'}),observed={kind:'tracks',remux:false,tracks:[{id:'6',type:'audio',index:4,key:'audio:stream:4',publicKey:'audio:stream:4'},{id:'9',type:'sub',index:0,key:'sub:attachment:a',publicKey:'sub:shaka:9'}]};
 const out=run(input,effect=>effect.kind.startsWith('resolve.')?observed:undefined);assert.deepEqual(out.effects.filter(effect=>effect.kind==='track').map(effect=>[effect.type,effect.value]),[['audio','6'],['sub','9']]);assert.equal(out.state.settings.aid,'6');assert.equal(out.state.settings.sid,'9');
});
test('Native remux index mapping, direct public audio and hidden subtitles retain policy',()=>{
 const input=facts({preserve:true,indexes:[{type:'audio',index:2}],publicSelections:[{type:'audio',key:'audio:stream:2'},{type:'sub',key:'sub:stream:4'}],settings:{...settings,subtitles:false}}),out=run(input,effect=>effect.kind==='resolve.index'?{kind:'tracks',remux:true,tracks:[{id:'3',type:'audio',index:null,key:'audio:native:3',publicKey:'audio:stream:2'}]}:undefined);
 assert.equal(out.state.settings.aid,'auto');assert.equal(out.effects.some(effect=>effect.kind==='resolve.public'),false);assert.equal(out.effects.filter(effect=>effect.kind==='track'&&effect.save).length,1);
});
test('public mapping failure preserves error code and available public-key diagnostic',()=>{
 const out=run(facts({mode:'software',preserve:true,planId:'software',publicSelections:[{type:'sub',key:'sub:stream:9'}]}),effect=>effect.kind==='resolve.public'?{kind:'tracks',remux:false,tracks:[{id:'1',type:'sub',index:0,key:'raw',publicKey:'sub:stream:0'}]}:undefined);assert.deepEqual(out.effects.at(-1),{kind:'reject',code:'UNSUPPORTED_FEATURE',message:'Cannot preserve explicit public track selection across playback modes (sub:stream:9; available sub:stream:0)'});
});
test('track policy enforces subtitle visibility then selection and confirmation with accepted settings',()=>{
 const out=run(facts({mode:'software',settings:{...settings,subtitles:false},audioPolicy:true,subtitlePolicy:true}),effect=>effect.kind==='policy'?{kind:'policy',policy:effect.type==='audio'?{default:'off'}:{default:{language:'french'}},tracks:effect.type==='audio'?[track('1',{selected:true})]:[track('7',{language:'english'}),track('8',{language:'french'})]}:undefined);
 assert.deepEqual(out.effects.filter(effect=>['track','subtitles','verify'].includes(effect.kind)),[{kind:'track',type:'audio',value:'no',save:true},{kind:'verify',type:'audio',value:'no'},{kind:'subtitles',value:true,save:true},{kind:'track',type:'sub',value:'8',save:true},{kind:'verify',type:'sub',value:'8'}]);assert.equal(out.state.settings.subtitles,true);assert.equal(out.state.settings.aid,'no');assert.equal(out.state.settings.sid,'8');
});
test('preserved allowed track skips default replacement while disallowed selected track changes',()=>{
 for(const allowed of [true,false]){const out=run(facts({mode:'software',preserve:true,audioPolicy:true}),effect=>effect.kind==='policy'?{kind:'policy',policy:{allowed:[{codec:allowed?'aac':'opus'}]},tracks:[track('1',{selected:true,codec:'aac'}),track('2',{codec:'opus'})]}:undefined);assert.equal(out.effects.some(effect=>effect.kind==='verify'),!allowed);if(!allowed)assert.equal(out.state.settings.aid,'2');}
});
test('application acknowledgments require exact pending step and matching observation type',()=>{
 const initial=initialSourceApplication(facts({requestedTarget:2}));assert.equal(completeSourceApplication(initial,0).accepted,false);const next=claimSourceApplication(initial);assert.equal(completeSourceApplication(next.state,1,{kind:'target',duration:20,live:false}).accepted,false);assert.equal(completeSourceApplication(next.state,0,{kind:'support',available:true}).accepted,false);
});
function composed(){let state=initialPlayerControl();const send=input=>{const result=transitionPlayer(state,input);state=result.state;return result;};const operation=send({type:'operation.admit',kind:'opening'}).id;send({type:'operation.start',id:operation});const attempt=send({type:'source.begin',operationEpoch:state.operations.epoch,mode:'native',preserve:false,planId:'native-direct'}).id;for(const type of ['source.created','source.configured','source.opened'])send({type,attempt});return{send,attempt,operation,get state(){return state;}};}
test('composed application owns the applying-to-positioning phase and rejects bypass',()=>{
 const c=composed();assert.equal(c.send({type:'source.application.begin',attempt:c.attempt,facts:facts()}).accepted,true);assert.equal(c.send({type:'source.applied',attempt:c.attempt}).accepted,false);for(;;){const out=c.send({type:'source.application.next',attempt:c.attempt});assert.equal(out.accepted,true);if(!out.applicationEffect)break;const effect=out.applicationEffect;assert.equal(c.send({type:'source.application.completed',attempt:c.attempt,step:effect.step,observation:effect.kind==='metadata.inspect'?{kind:'support',available:false}:undefined}).accepted,true);}assert.equal(c.state.source.candidate.phase,'positioning');assert.equal(c.state.source.serial,0);
});
test('cancelled original operation cannot acknowledge or advance post-open work',()=>{
 const c=composed();c.send({type:'source.application.begin',attempt:c.attempt,facts:facts()});const effect=c.send({type:'source.application.next',attempt:c.attempt}).applicationEffect;c.send({type:'operation.cancel',id:c.operation});const before=c.state;assert.equal(c.send({type:'source.application.completed',attempt:c.attempt,step:effect.step,observation:{kind:'support',available:true}}).accepted,false);assert.equal(c.send({type:'source.application.next',attempt:c.attempt}).accepted,false);assert.equal(c.state,before);assert.equal(c.send({type:'source.finished',attempt:c.attempt}).accepted,true);
});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function fixture(t,options={}){
 const p=unitPlayer(),calls=[],caller=new AbortController(),mode=options.mode??'native',plan=mode==='native'?'native-direct':mode,attached=options.attachments??[];
 p.currentMode=mode;
 const invoke=(kind,...args)=>{calls.push([kind,...args]);return options.effect?.(kind,args,p,caller);};
 const backend={ready:Promise.resolve(),properties:new Map([['duration',20],['track-list',options.tracks??[]]]),diagnostics:{plan:mode==='native'?'direct':mode},command:async(...args)=>invoke('command',...args),gain:async value=>invoke('gain',value),volume:async value=>invoke('volume',value),rate:async value=>invoke('rate',value),selectTrack:async(type,value)=>{await invoke('track',type,value);const raw=backend.properties.get('track-list');for(const track of raw)if(track.type===type)track.selected=String(track.id)===value;},subtitleVisible:async value=>invoke('subtitles',value),open:async(...args)=>invoke('open',...args),openRemote:async(...args)=>invoke('remote',...args),destroy:async()=>invoke('destroy'),pause:async()=>{},play:async()=>{},setQuality:async policy=>invoke('quality',policy),setAudioOutputDevice:async value=>invoke('output',value),inspectMetadata:async()=>invoke('metadata'),addSubtitle:async asset=>invoke('attachment',asset),addTextTrack:async(...args)=>invoke('text',...args)};
 const session={backend,surface:{style:{display:'none'},remove(){}}};p.create=async()=>session;p.admissible=()=>[{id:plan,mode,eligible:true}];p.settled=async()=>invoke('settled');p.confirmTrackSelection=async(...args)=>invoke('verify',args[4],args[5]);if(attached.length)Object.defineProperty(p,'subtitleAssets',{get:()=>attached});
 if(options.quality)p.qualityPolicy=options.quality;if(options.output)p.updatePreferences({outputDeviceId:options.output});if(options.publicSelections)p.updatePreferences({publicSelections:options.publicSelections});
 const source={kind:'local',file:new File(['media'],'movie.mp4'),trackPolicy:options.policy},nativeTracks=options.nativeTracks??[];
 const open=()=>p.enqueue(()=>p.replace(source,mode,{...p.settings,...options.settings},options.preserve??false,nativeTracks,options.target,false,plan),'opening',caller.signal);t.after(()=>p.destroy());return{p,backend,session,calls,caller,source,open};
}
for(const mode of ['native','hybrid','software'])test(`actual ${mode} application preserves post-open effect order`,async t=>{
 const attachment={text:'one',format:'srt'},text={src:'https://media.test/captions',label:'captions',attachmentId:'native-1'},f=fixture(t,{mode,preserve:true,quality:{mode:'auto',maxHeight:720},output:'speaker',attachments:[attachment],nativeTracks:[text],settings:{sid:'8'}});await f.open();const post=f.calls.slice(f.calls.findIndex(call=>call[0]==='open')+1).filter(call=>!['destroy','settled'].includes(call[0]));assert.deepEqual(post.map(call=>call[0]),mode==='native'?['quality','output','metadata','attachment','text','track','track','subtitles']:['quality','output','metadata','attachment','track']);assert.equal(post.find(call=>call[0]==='attachment')[1],attachment);if(mode==='native')assert.deepEqual(post.find(call=>call[0]==='text'),['text',text,'native-1']);assert.equal(f.p.current,f.session);
});
for(const kind of ['quality','output','metadata','attachment','text'])test(`actual cancellation during post-open ${kind} prevents later effects`,async t=>{
 const f=fixture(t,{preserve:true,quality:{mode:'auto'},output:'speaker',attachments:[{text:'one',format:'srt'},{text:'two',format:'srt'}],nativeTracks:[{src:'one',label:'one'},{src:'two',label:'two'}],effect(name,args,p,caller){if(name===kind)caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});const at=f.calls.findIndex(call=>call[0]===kind);assert.ok(at>=0);assert.deepEqual(f.calls.slice(at+1).filter(call=>call[0]!=='destroy'),[]);assert.equal(f.p.sourceSerial,0);
});
test('actual cancellation from initial Native track selection prevents subtitles and readiness',async t=>{
 const f=fixture(t,{effect(kind,args,p,caller){if(kind==='track')caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});const at=f.calls.findIndex(call=>call[0]==='track');assert.deepEqual(f.calls.slice(at+1).filter(call=>call[0]!=='destroy'),[]);
});
test('actual unavailable output rejects before metadata or attachment replay',async t=>{
 const f=fixture(t,{output:'speaker'});delete f.backend.setAudioOutputDevice;await assert.rejects(f.open(),{code:'UNSUPPORTED_FEATURE'});assert.equal(f.calls.some(call=>call[0]==='metadata'),false);
});
test('actual output method getter retirement cannot invoke acquired stale function',async t=>{
 const f=fixture(t,{output:'speaker'});let closing,calls=0;Object.defineProperty(f.backend,'setAudioOutputDevice',{get(){closing??=f.p.close();return async()=>{calls++;};}});await assert.rejects(f.open(),{code:'ABORTED'});await closing;assert.equal(calls,0);assert.equal(f.calls.some(call=>call[0]==='metadata'),false);
});
test('actual late attachment completion after close cannot replay another attachment',async t=>{
 const hold=deferred(),entered=deferred(),f=fixture(t,{preserve:true,attachments:[{text:'one',format:'srt'},{text:'two',format:'srt'}],effect(kind){if(kind==='attachment'){entered.resolve();return hold.promise;}}});const opening=f.open(),rejected=assert.rejects(opening,{code:'ABORTED'});await entered.promise;const closing=f.p.close();hold.resolve();await rejected;await closing;assert.equal(f.calls.filter(call=>call[0]==='attachment').length,1);assert.equal(f.p.current,undefined);
});
test('actual policy enables captions before selection and publishes confirmed settings only at acceptance',async t=>{
 const f=fixture(t,{mode:'software',settings:{subtitles:false},policy:{subtitles:{default:{language:'fr'}}},tracks:[{id:'3',type:'sub',lang:'en'},{id:'4',type:'sub',lang:'fr'}]});await f.open();const post=f.calls.slice(f.calls.findIndex(call=>call[0]==='open')+1);assert.deepEqual(post.filter(call=>['subtitles','track','verify'].includes(call[0])),[['subtitles',true],['track','sub','4'],['verify','sub','4']]);assert.equal(f.p.settings.sid,'4');assert.equal(f.p.settings.subtitles,true);
});
test('actual cancellation from policy caption enabling cannot invoke track selection',async t=>{
 let opened=false;const f=fixture(t,{mode:'software',settings:{subtitles:false},policy:{subtitles:{default:{language:'fr'}}},tracks:[{id:'4',type:'sub',lang:'fr'}],effect(kind,args,p,caller){if(kind==='open')opened=true;if(opened&&kind==='subtitles')caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});const at=f.calls.findLastIndex(call=>call[0]==='subtitles');assert.deepEqual(f.calls.slice(at+1).filter(call=>call[0]!=='destroy'),[]);assert.equal(f.p.settings.subtitles,true);
});
test('actual public mapping retains selected source identity across replacement backend',async t=>{
 const f=fixture(t,{mode:'software',preserve:true,publicSelections:{audio:'audio:stream:6'},tracks:[{id:'9',type:'audio','ff-index':6}]});await f.open();assert.ok(f.calls.some(call=>call[0]==='track'&&call[1]==='audio'&&call[2]==='9'));assert.equal(f.p.settings.aid,'9');
});
test('composed source acceptance consumes application settings instead of a forged shell copy',()=>{
 const c=composed();c.send({type:'source.application.begin',attempt:c.attempt,facts:facts({settings:{...settings,volume:23}})});for(;;){const effect=c.send({type:'source.application.next',attempt:c.attempt}).applicationEffect;if(!effect)break;c.send({type:'source.application.completed',attempt:c.attempt,step:effect.step,observation:effect.kind==='metadata.inspect'?{kind:'support',available:false}:undefined});}c.send({type:'source.positioned',attempt:c.attempt});const accepted=c.send({type:'source.accept',attempt:c.attempt,operationEpoch:c.state.operations.epoch,settings:{...settings,volume:100},planMatches:true});assert.equal(accepted.accepted,true);assert.equal(c.state.settings.volume,23);
});
test('composed retirement histories reject completion and future effects at every application step',()=>{
 for(const retirement of ['cancel','close','destroy'])for(let index=0;index<6;index++){
  const c=composed();c.send({type:'source.application.begin',attempt:c.attempt,facts:facts({attachments:1})});let effect;for(let step=0;step<=index;step++){effect=c.send({type:'source.application.next',attempt:c.attempt}).applicationEffect;if(step<index)c.send({type:'source.application.completed',attempt:c.attempt,step:effect.step,observation:effect.kind==='metadata.inspect'?{kind:'support',available:false}:undefined});}
  c.send(retirement==='cancel'?{type:'operation.cancel',id:c.operation}:{type:'operation.retire',terminal:retirement==='destroy'});const state=c.state;assert.equal(c.send({type:'source.application.completed',attempt:c.attempt,step:effect.step,observation:{kind:'support',available:true}}).accepted,false);assert.equal(c.send({type:'source.application.next',attempt:c.attempt}).accepted,false);assert.equal(c.state,state);assert.equal(c.send({type:'source.finished',attempt:c.attempt}).accepted,true);
 }
});
test('actual acquired output invocation rechecks authority after a second method getter',async t=>{
 const f=fixture(t,{output:'speaker'});let reads=0,invocations=0,closing;Object.defineProperty(f.backend,'setAudioOutputDevice',{get(){if(++reads===2)closing=f.p.close();return async()=>{invocations++;};}});await assert.rejects(f.open(),{code:'ABORTED'});await closing;assert.equal(reads,2);assert.equal(invocations,0);
});
test('actual track-policy confirmation retirement prevents applying or accepting source',async t=>{
 const f=fixture(t,{mode:'software',policy:{audio:{default:{codec:'opus'}}},tracks:[{id:'2',type:'audio',codec:'opus'}],effect(kind,args,p,caller){if(kind==='verify')caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});assert.equal(f.p.sourceSerial,0);const at=f.calls.findIndex(call=>call[0]==='verify');assert.deepEqual(f.calls.slice(at+1).filter(call=>call[0]!=='destroy'),[]);
});
