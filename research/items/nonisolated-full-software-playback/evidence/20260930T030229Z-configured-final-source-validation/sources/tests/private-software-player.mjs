// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrivateSoftwarePlayer} from '../web/generated/internal/private-software-player.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
function control(){
 const player=Object.create(PrivateSoftwarePlayer.prototype),messages=[];
 Object.assign(player,{ready:Promise.resolve(),generation:0,properties:new Map(),closing:false,options:{},worker:{postMessage:data=>messages.push(data)},request:async()=>({})});
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
 player.diagnostics.seeking=false;await load;assert.equal(resolved,true);
});
test('a superseded load cannot finish using metadata from its replacement',async()=>{
 const {player}=control();const first=player.load({file:{}});void first.catch(()=>{});await tick();
 const second=player.load({file:{}});await tick();
 player.properties.set('track-list',[{type:'video',selected:true}]);player.diagnostics={rendered:1,seeking:false};
 await assert.rejects(first,/replaced/);await second;assert.equal(player.generation,2);
});
