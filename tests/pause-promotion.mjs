// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../web/generated/unified-player.js';
import {initialPlayerControl} from '../web/generated/internal/machine/state.js';

function pausedPlayer() {
 const p=Object.create(Player.prototype), source={kind:'local'};
 Object.assign(p,{control:initialPlayerControl(),operationResources:new Map(),automatic:true,source,current:{backend:{}},settings:{pause:true,aid:'auto',sid:'auto',subtitles:false},
  promotionEpoch:0,queue:Promise.resolve(),
  nativeTracks:[],subtitleAssets:[],publish(){},startWatchdogs(){},
  admissible:()=>[{id:'native-direct',eligible:true}]});
 Object.defineProperty(p,'diagnostics',{value:{plan:{id:'native-direct'}}});
 return p;
}
const turn=()=>new Promise(setImmediate);

test('pause preference inspection stays paused without a switching operation',async()=>{
 const p=pausedPlayer();let finish,started;
 const began=new Promise(resolve=>started=resolve);
 p.select=async()=>{started();await new Promise(resolve=>finish=resolve);p.sourceInspection={source:p.source,probe:{tracks:[]},settings:p.settings};};
 p.replace=async()=>assert.fail('Already preferred playback must not be replaced');
 p.schedulePromotion();await began;
 try {
  assert.equal(p.settings.pause,true);
  assert.equal(p.pendingOperation,null);
  assert.equal(p.activeOperation.kind,null);
 } finally {finish();await p.queue;}
 assert.equal(p.activeOperation,undefined);
 assert.equal(p.pendingOperation,null);
});

test('user input cancels slow pause inspection and releases the operation queue',async()=>{
 const p=pausedPlayer();let started;
 const began=new Promise(resolve=>started=resolve);
 p.select=()=>new Promise((resolve,reject)=>{
  p.inspection=new AbortController();p.inspection.signal.addEventListener('abort',()=>reject(new Error('Inspection canceled')),{once:true});started();
 });
 p.schedulePromotion();await began;
 let applied=false;
 await p.enqueue(async()=>{applied=true;});
 assert.equal(p.inspection.signal.aborted,true);
 assert.equal(applied,true);
 assert.equal(p.pendingOperation,null);
 assert.equal(p.activeOperation,undefined);
 await turn();
 assert.equal(p.queued,0);
});
