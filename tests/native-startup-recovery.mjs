// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../web/generated/unified-player.js';
import {initialPlayerControl} from '../web/generated/internal/machine/state.js';
import {BrowserCaptionUnsupported} from '../web/generated/internal/plain-vtt.js';
import {NativeLoadTimeout} from '../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../web/generated/internal/errors.js';

function discovery(remuxFailure){
 const player=Object.create(Player.prototype),source={kind:'local',file:new File(['fixture'],'sample.mkv')};
 const settings={aid:'auto',sid:'auto',subtitles:true,vf:'',af:'',gain:1};
 const attempts=[],plans=[{id:'native-direct-mpv',mode:'native',eligible:true},{id:'native-remux-mpv',mode:'native',eligible:true},{id:'hybrid',mode:'hybrid',eligible:true}];
 Object.assign(player,{control:initialPlayerControl(),operationResources:new Map(),admissionContext:{},sourceInspection:{source,probe:{format:'matroska',tracks:[]}},publicSelections:new Map(),fonts:[],subtitleAssets:[],
  runtimeCapabilities:{begin(){},admission(){},update(){}},tierAttempts:{reason(){},failure(){}},
  assertOperation(){},admissible(){return plans;},record(){},acceptEvidence(){},inspectForQualifiedWebGPU:async()=>{},
  replace:async(_source,_mode,_settings,_preserve,_tracks,_target,_automatic,id,budget)=>{
   attempts.push({id,budget});
   if(id==='native-direct-mpv')throw new NativeLoadTimeout('loadeddata',budget??25000);
   if(id==='native-remux-mpv')throw remuxFailure;
  },
 });
 return {attempts,run:()=>player.discover(source,settings,false,[],undefined,true)};
}
test('shared subtitle failure skips the full direct retry and reaches Hybrid',async()=>{
 const d=discovery(new BrowserCaptionUnsupported('Subtitle packet deadline exceeded'));await d.run();
 assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv','hybrid']);
 assert.equal(d.attempts[0].budget,1500);
});
test('source permission remains terminal and never falls through to Hybrid',async()=>{
 const failure=new PlayerError('SOURCE_PERMISSION','Denied'),d=discovery(failure);
 await assert.rejects(d.run(),error=>error===failure);
 assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv']);
});
test('missing remux assets retain the full-budget original retry',async()=>{
 const d=discovery(new PlayerError('ASSET_LOAD_FAILED','Missing remux assets'));
 await assert.rejects(d.run(),NativeLoadTimeout);
 assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv','native-direct-mpv']);
 assert.equal(d.attempts[2].budget,25000);
});
