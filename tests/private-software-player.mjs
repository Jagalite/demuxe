// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrivateSoftwarePlayer} from '../web/generated/internal/private-software-player.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
function control(){
 const player=Object.create(PrivateSoftwarePlayer.prototype),messages=[];
 Object.assign(player,{ready:Promise.resolve(),generation:0,presentedDraws:0,properties:new Map(),closing:false,options:{},worker:{postMessage:data=>messages.push(data)},request:async()=>({})});
 return {player,messages};
}
test('authorization requests from a replaced source cannot invoke the current callback',async()=>{
 const {player,messages}=control();player.generation=2;let calls=0;
 player.refresh=async()=>{calls++;return {headers:{Authorization:'fixture'}};};
 player.receive({type:'refresh',generation:1,refreshId:'old'});await tick();assert.equal(calls,0);assert.match(messages[0].error,/replaced/);
 player.receive({type:'refresh',generation:2,refreshId:'current'});await tick();assert.equal(calls,1);assert.equal(messages[1].update.headers.Authorization,'fixture');
});
test('idle render and an empty track list cannot satisfy source readiness',async()=>{
 const {player}=control();let resolved=false;
 const load=player.load({file:{}}).then(()=>{resolved=true;});await tick();
 player.properties.set('track-list',[]);player.diagnostics={rendered:5,seeking:false};await tick();assert.equal(resolved,false);
 player.properties.set('track-list',[{type:'video',selected:true}]);player.diagnostics.seeking=true;await tick();assert.equal(resolved,false);
 player.diagnostics.seeking=false;player.presentedDraws=1;await load;assert.equal(resolved,true);
});
test('a superseded load cannot finish using metadata from its replacement',async()=>{
 const {player}=control();const first=player.load({file:{}});void first.catch(()=>{});await tick();
 const second=player.load({file:{}});await tick();
 player.properties.set('track-list',[{type:'video',selected:true}]);player.diagnostics={rendered:1,seeking:false};
 player.presentedDraws=1;await assert.rejects(first,/replaced/);await second;assert.equal(player.generation,2);
});
test('audio-only readiness requires decoded PCM and cannot borrow idle RGB output',async()=>{
 const {player}=control();let resolved=false;
 const load=player.load({file:{}}).then(()=>{resolved=true;});await tick();
 player.properties.set('track-list',[{type:'audio',selected:true}]);player.diagnostics={rendered:5,seeking:false,audio:{header:[0,0]}};
 await tick();assert.equal(resolved,false);assert.equal(player.startupEvidence().videoPresented,false);assert.equal(player.startupEvidence().decoderOutput,false);
 player.diagnostics.audio.header[0]=2048;await load;await player.verifyOutput();assert.equal(player.outputVerified,true);
});
test('verification requires an actual selected media owner',async()=>{
 const {player}=control(),abort=new AbortController();player.properties.set('track-list',[]);player.diagnostics={rendered:5};
 const verification=player.verifyOutput(abort.signal);await tick();abort.abort();await assert.rejects(verification,/abort/i);
 assert.equal(player.outputVerified,undefined);
});
test('presented bitmap precedes readiness and releases ownership exactly once',()=>{
 const {player,messages}=control(),calls=[];
 player.generation=1;player.presentation={canvas:{width:320,height:180},drawImage:bitmap=>calls.push(bitmap)};
 const bitmap={width:320,height:180,closed:0,close(){this.closed++;}};
 player.receive({type:'picture',generation:1,pictureId:7,rendered:3,bitmap});
 assert.deepEqual(calls,[bitmap]);assert.equal(player.presentedDraws,3);assert.equal(bitmap.closed,1);
 assert.deepEqual(messages,[{op:'picture-presented',pictureId:7}]);
 const stale={...bitmap,closed:0};player.receive({type:'picture',generation:0,pictureId:8,rendered:4,bitmap:stale});
 assert.equal(calls.length,1);assert.equal(player.presentedDraws,3);assert.equal(stale.closed,1);
});
