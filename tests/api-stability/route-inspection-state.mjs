// SPDX-License-Identifier: Apache-2.0
import {initialRemuxDeployment} from '../../web/generated/internal/machine/remux-deployment.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialInspection,transitionInspection,initialInspectionPolicy,fastInspectionAllowed,inspectionSelection,optionalInspectionFallback} from '../../web/generated/internal/machine/route-inspection.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {PlayerError} from '../../web/generated/internal/errors.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const probe=()=>({duration:12,format:'matroska',tracks:[{id:'1',index:0,type:'video',codec:'h264'},{id:'2',index:1,type:'audio',codec:'aac'},{id:'3',index:2,type:'audio',codec:'aac'},{id:'4',index:3,type:'sub',codec:'subrip'}]});
const settings={aid:'auto',sid:'auto',subtitles:true};
const policy=(extra={})=>initialInspectionPolicy({automatic:true,mode:'native',privateRemux:false,provider:false,canInspect:true,quality:'exact',adaptive:false,inspected:false,start:0,videoFilters:'',audioFilters:'',toneMapping:'off',...extra});
test('initial inspection distinguishes explicit private codec needs from optional Software quality metadata',()=>{
 assert.equal(policy({automatic:false,mode:'software'}).normal,false);
 assert.equal(policy({automatic:false,mode:'software'}).qualityForced,false);
 assert.equal(policy({automatic:false,mode:'software',quality:'balanced'}).qualityForced,true);
 assert.equal(policy({automatic:false,mode:'software',quality:'balanced',inspected:true}).qualityForced,false);
 for(const mode of ['software','hybrid'])assert.equal(policy({automatic:false,mode,privateRemux:true}).privateForced,true);
 assert.equal(policy({automatic:false,mode:'hybrid',privateRemux:true,provider:true,canInspect:false}).privateForced,false);
});
test('normal inspection preserves private filter probing and exact explicit demuxer versus remote manifest precedence',()=>{
 assert.equal(policy({videoFilters:'scale=10:10'}).normal,false);
 assert.equal(policy({videoFilters:'scale=10:10',privateRemux:true}).normal,true);
 assert.equal(policy({start:1}).normal,false);
 assert.equal(policy({localDemuxer:'rawvideo'}).manifest,true);
 assert.equal(policy({localDemuxer:'rawvideo',privateRemux:true}).manifest,false);
 assert.equal(policy({remoteDemuxer:'rawvideo',privateRemux:true}).manifest,false);
 assert.equal(policy({remoteFormat:'hls',privateRemux:true}).manifest,true);
 assert.equal(policy({remoteFormat:'file',privateRemux:true}).manifest,false);
});
const fast=(extra={})=>fastInspectionAllowed({local:true,privateDemuxer:false,preserve:false,componentRepairRetry:false,textTracks:0,aid:'auto',sid:'auto',filename:'movie.mkv',...extra});
test('fast inspection retains repair exception without bypassing transport, track, attachment or filename exclusions',()=>{
 assert.equal(fast(),true);assert.equal(fast({preserve:true}),false);assert.equal(fast({preserve:true,componentRepairRetry:true}),true);
 for(const extra of [{local:false},{privateDemuxer:true},{textTracks:1},{aid:'no'},{sid:'1'},{filename:'Movie.M2TS'},{filename:'track.OpUs'}])assert.equal(fast(extra),false,JSON.stringify(extra));
 assert.equal(fast({filename:'not-really-an-ogg.mp4'}),true);
});
test('preserved public stream identity maps by index and missing streams stay explicitly missing',()=>{
 const facts={settings,preserve:true,mode:'native',hasSource:true,textTracks:0,remuxTracks:false,publicAudio:'audio:stream:2',publicSubtitle:'sub:stream:3'};
 assert.deepEqual(inspectionSelection(probe(),facts),{aid:'3',sid:'4',subtitles:true});
 assert.deepEqual(inspectionSelection({tracks:[],duration:1},facts),{aid:'missing',sid:'missing',subtitles:true});
 assert.deepEqual(inspectionSelection(probe(),{...facts,preserve:false}),settings);
});
test('inspection track preflight preserves off, attached text and remux numeric identity behavior',()=>{
 const f={settings:{aid:'3',sid:'2',subtitles:false},preserve:true,mode:'native',hasSource:true,textTracks:0,remuxTracks:true};
 assert.deepEqual(inspectionSelection(probe(),f),{aid:'3',sid:'2',subtitles:false});
 assert.equal(inspectionSelection(probe(),{...f,textTracks:1}).sid,'no');
 assert.equal(inspectionSelection(probe(),{...f,mode:'hybrid',settings:{...f.settings,aid:'no'}}).aid,'no');
 assert.equal(inspectionSelection(probe(),{...f,mode:'hybrid'}).aid,'auto');
 assert.equal(inspectionSelection(probe(),{...f,preserve:false,hasSource:false}).aid,'3');
});
const fallback=(extra={})=>optionalInspectionFallback({privateRemux:true,policy:'auto',preserve:false,inspectOnly:false,remote:true,identity:false,aid:'auto',sid:'auto',provider:false,retired:false,assetFailure:true,terminalSource:false,rangeReturnedWhole:false,directAdmitted:true,...extra});
test('optional private inspection fallback remains a narrow initial plain URL exception',()=>{
 assert.equal(fallback(),true);
 for(const extra of [{privateRemux:false},{policy:'jspi'},{preserve:true},{inspectOnly:true},{remote:false},{identity:true},{aid:'no'},{sid:'no'},{provider:true},{retired:true},{assetFailure:false},{terminalSource:true},{directAdmitted:false}])assert.equal(fallback(extra),false,JSON.stringify(extra));
 assert.equal(fallback({assetFailure:false,terminalSource:true,rangeReturnedWhole:true}),true);
 assert.equal(fallback({assetFailure:false,terminalSource:true,rangeReturnedWhole:true,identity:true}),false);
});
test('inspection results detach caller graphs and reset all related admission flags atomically',()=>{
 const data=probe(),s=transitionInspection(initialInspection(),{kind:'probe',value:{source:7,probe:data,settings}});
 data.tracks[0].codec='caller-change';assert.equal(s.probe.probe.tracks[0].codec,'h264');assert.equal(Object.isFrozen(data),false);assert.equal(Object.isFrozen(s.probe.probe.tracks[0]),true);
 const assets=transitionInspection(s,{kind:'assets',value:{subtitleAssets:true,selectiveAssets:true,selectiveChecked:true,transcodeAssets:true,transcodeChecked:true,playbackAvailable:true,playbackAssets:{codecProfile:'playback-full',retainedDecoder:true,decoders:['h264']}}});
 const cleared=transitionInspection(assets,{kind:'reset',scope:'fallback'});assert.equal(cleared.probe,null);assert.equal(cleared.subtitleAssets,false);assert.equal(cleared.selectiveChecked,false);assert.equal(cleared.transcodeChecked,false);assert.equal(cleared.playbackAvailable,true);
 const reset=transitionInspection(assets,{kind:'reset',scope:'assets'});assert.equal(reset.probe,s.probe);assert.equal(reset.playbackAvailable,false);assert.equal(reset.playbackAssets,undefined);
});
test('composed inspection rejects stale, canceled and terminal completion without disturbing accepted evidence',()=>{
 let s=initialPlayerControl();const send=input=>{const d=transitionPlayer(s,input);s=d.state;return d;};
 const admitted=send({type:'operation.admit',kind:'opening'});send({type:'operation.start',id:admitted.id});
 const scope={epoch:s.operations.epoch,operation:admitted.id};
 assert.equal(send({type:'routing.inspection',...scope,change:{kind:'probe',value:{source:1,probe:probe(),settings}}}).accepted,true);
 const before=s.routing.inspection;send({type:'operation.cancel',id:admitted.id});
 assert.equal(send({type:'routing.inspection',...scope,change:{kind:'assets',value:{subtitleAssets:true}}}).accepted,false);assert.equal(s.routing.inspection,before);
 send({type:'operation.retire',terminal:false});assert.equal(send({type:'routing.inspection',...scope,change:{kind:'clear'}}).accepted,false);
 assert.equal(send({type:'routing.inspection',epoch:s.operations.epoch,operation:admitted.id,change:{kind:'restore',value:before}}).accepted,false);
 send({type:'source.clear'});assert.equal(s.routing.inspection.probe,null);
 send({type:'operation.retire',terminal:true});assert.equal(send({type:'routing.inspection',epoch:s.operations.epoch,operation:s.operations.active,change:{kind:'source.allocate'}}).accepted,false);
});
test('inspection rollback never rewinds opaque ID allocation',()=>{
 let s=transitionInspection(initialInspection(),{kind:'source.allocate'});const saved=s;
 s=transitionInspection(s,{kind:'source.allocate'});s=transitionInspection(s,{kind:'failure',failed:true});
 s=transitionInspection(s,{kind:'restore',value:saved});assert.equal(s.sourceSerial,2);assert.equal(s.errorSerial,1);assert.equal(s.playbackFailure,null);
 s=transitionInspection(s,{kind:'failure',failed:true});assert.equal(s.playbackFailure,2);
});
test('actual facade retains only inspection-owned physical sources and errors and restores admission metadata together',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const sources=Array.from({length:100},()=>({kind:'local',file:new ArrayBuffer(8)}));
 p.sourceInspection={source:sources[0],probe:probe(),settings};p.fastInspectedSource=sources[0];p.losslessInspection={source:sources[0]};p.privatePlaybackAssetsAvailable=true;p.selectiveAudioAssetsChecked=true;
 const error=new PlayerError('ASSET_LOAD_FAILED','private physical error');p.privatePlaybackAssetsFailure=error;const saved=p.captureInspection();
 for(const source of sources.slice(1))p.sourceInspection={source,probe:probe(),settings};
 assert.equal(p.inspectionSources.size,2);assert.equal(p.sourceInspection.source,sources.at(-1));assert.equal(p.fastInspectedSource,sources[0]);
 p.privatePlaybackAssetsFailure=new PlayerError('ASSET_LOAD_FAILED','replacement error');p.privatePlaybackAssetsAvailable=false;p.selectiveAudioAssetsChecked=false;
 p.restoreInspection(saved);assert.equal(p.inspectionSources.size,1);assert.equal(p.sourceInspection.source,sources[0]);assert.equal(p.privatePlaybackAssetsAvailable,true);assert.equal(p.selectiveAudioAssetsChecked,true);assert.equal(p.privatePlaybackAssetsFailure,error);assert.equal(p.inspectionErrors.size,1);
 assert.equal(JSON.stringify(p.control).includes('physical error'),false);
 await p.close();assert.equal(p.inspectionSources.size,0);assert.equal(p.inspectionErrors.size,0);assert.equal(p.fastInspectedSource,undefined);
});
test('canceled candidate open restores prior inspection and assets while the accepted source remains',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const old={kind:'local',file:new ArrayBuffer(4)};p.source=old;p.sourceInspection={source:old,probe:probe(),settings};p.fastInspectedSource=old;p.privatePlaybackAssetsAvailable=true;
 let started;const begun=new Promise(resolve=>started=resolve);p.select=async source=>{p.sourceInspection={source,probe:{duration:99,tracks:[]},settings};p.privatePlaybackAssetsAvailable=false;started();await p.interruptible(new Promise(()=>{}));};
 const controller=new AbortController(),action=p.open(new File(['candidate'],'candidate.mp4'),{signal:controller.signal});await begun;controller.abort();await assert.rejects(action,error=>error.code==='ABORTED');
 assert.equal(p.source,old);assert.equal(p.sourceInspection.source,old);assert.equal(p.sourceInspection.probe.duration,12);assert.equal(p.fastInspectedSource,old);assert.equal(p.privatePlaybackAssetsAvailable,true);assert.equal(p.inspectionSources.size,1);
});
test('close retirement cannot rebind a canceled open rollback to the newer operation epoch',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const old={kind:'local',file:new ArrayBuffer(4)};p.source=old;p.sourceInspection={source:old,probe:probe(),settings};
 let started,complete;const begun=new Promise(resolve=>started=resolve);p.select=async source=>{p.sourceInspection={source,probe:{duration:99,tracks:[]},settings};started();await new Promise(resolve=>complete=resolve);throw Error('late rejected candidate');};
 const action=p.open(new File(['candidate'],'candidate.mp4'));await begun;const closing=p.close();complete();await assert.rejects(action,error=>error.code==='ABORTED');await closing;
 assert.equal(p.sourceInspection,undefined);assert.equal(p.inspectionSources.size,0);assert.equal(p.control.routing.inspection.probe,null);
});
test('late successful physical asset check after close cannot repopulate inspection state',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());p.control={...p.control,routing:{...p.control.routing,deployment:initialRemuxDeployment({...p.remuxSelection,runtime:'pthread'})}};p.mpvSubtitles=true;p.fileServicesSource=()=>true;
 let answer,started;const begun=new Promise(resolve=>started=resolve);p.optionalAssetsAvailable=()=>{started();return new Promise(resolve=>answer=resolve);};
 const action=p.enqueue(()=>p.checkInspectedAssets({kind:'local',file:new ArrayBuffer(8)},probe(),settings,'auto',new AbortController()),'opening');
 await begun;const closing=p.close();answer(true);await assert.rejects(action,error=>error.code==='ABORTED');await closing;
 assert.equal(p.mpvSubtitleAssetsAvailable,false);assert.equal(p.control.routing.inspection.probe,null);
});
for(let seed=1;seed<=12;seed++)test(`inspection membership and asset lifetimes follow independent mixed history ${seed}`,()=>{
 let random=seed,s=initialInspection(),expectedSource=null,expectedSubtitle=false;const next=()=>random=(Math.imul(random,1664525)+1013904223)>>>0;
 for(let i=0;i<100;i++){
  const old=s,json=JSON.stringify(old),n=next()%5;
  if(n===0){expectedSource=next()%17;s=transitionInspection(s,{kind:'probe',value:{source:expectedSource,probe:probe(),settings}});}
  else if(n===1){expectedSubtitle=!!(next()%2);s=transitionInspection(s,{kind:'assets',value:{subtitleAssets:expectedSubtitle}});}
  else if(n===2){expectedSource=null;expectedSubtitle=false;s=transitionInspection(s,{kind:'reset',scope:'initial'});}
  else if(n===3){expectedSource=null;expectedSubtitle=false;s=transitionInspection(s,{kind:'clear'});}
  else {expectedSubtitle=false;s=transitionInspection(s,{kind:'reset',scope:'assets'});}
  assert.equal(s.probe?.source??null,expectedSource);assert.equal(s.subtitleAssets,expectedSubtitle);assert.equal(JSON.stringify(old),json);
 }
});
