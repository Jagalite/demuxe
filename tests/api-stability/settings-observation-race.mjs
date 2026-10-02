// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';

test('an accepted volume update preserves a policy pause observed while its backend effect is pending',async t=>{
  const player=unitPlayer(),backend=new EventTarget();let complete,started,pauses=0;
  const waiting=new Promise(resolve=>started=resolve);
  Object.assign(backend,{
    properties:new Map(),diagnostics:{plan:'direct'},destroy:async()=>{},play:async()=>{},
    pause:async()=>{pauses++;},volume:()=>{started();return new Promise(resolve=>complete=resolve);},
  });
  player.current={backend,surface:{remove(){}}};
  player.source={kind:'local',file:new Blob(),trackPolicy:{audio:{allowed:[]}}};
  acceptSourceIdentity(player,1);
  player.observeBackend(player.current,player.control.source.acceptedSession);
  player.updateSettings({pause:false});
  t.after(()=>player.destroy());
  const update=player.volume(25);await waiting;
  const tracks=[{type:'audio',id:1,selected:true,codec:'aac'}];
  backend.properties.set('track-list',tracks);
  backend.dispatchEvent(new CustomEvent('mpv',{detail:{event:'property-change',name:'track-list',data:tracks}}));
  assert.equal(player.settings.pause,true);assert.equal(pauses,1);
  assert.equal(player.sessionError.code,'UNSUPPORTED_FEATURE');
  complete();await update;
  assert.equal(player.settings.volume,25);
  assert.equal(player.settings.pause,true,'volume settlement overwrote the independent policy pause');
  assert.equal(pauses,1);
  assert.equal(player.sessionError.code,'UNSUPPORTED_FEATURE');
});
