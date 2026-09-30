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
test('paused audio-only load waits for its decoder while output verification waits for PCM',async()=>{
 const {player}=control();let resolved=false;
 const load=player.load({file:{}}).then(()=>{resolved=true;});await tick();
 player.properties.set('track-list',[{type:'audio',selected:true}]);player.diagnostics={rendered:5,seeking:false,audio:{header:[0,0]}};
 await tick();assert.equal(resolved,false);assert.equal(player.startupEvidence().videoPresented,false);assert.equal(player.startupEvidence().decoderOutput,false);
 player.properties.set('audio-codec-name','pcm_s24le');await load;assert.equal(player.startupEvidence().audioDecoded,false);
 let verified=false;const verification=player.verifyOutput().then(()=>verified=true);await tick();assert.equal(verified,false);
 player.diagnostics.audio.header[0]=2048;await verification;assert.equal(player.outputVerified,true);
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
test('unsupported strict output layout closes its context before allocating a worker',async()=>{
 const originalAudio=globalThis.AudioContext,originalCanvas=globalThis.OffscreenCanvas;
 const contexts=[];globalThis.OffscreenCanvas=class{};
 globalThis.AudioContext=class{constructor(){this.destination={maxChannelCount:2};this.state='suspended';contexts.push(this);}close(){this.state='closed';return Promise.resolve();}};
 try{
  assert.throws(()=>new PrivateSoftwarePlayer({}, {runtime:'asyncify',assetBase:new URL('http://localhost/'),audioOutput:'7.1',audioFallback:'reject'}),/layout is unavailable/);
  assert.equal(contexts[0].state,'closed');
 }finally{globalThis.AudioContext=originalAudio;globalThis.OffscreenCanvas=originalCanvas;}
});

test('initialization asset identity errors remain terminal asset failures',async()=>{
 const {player}=control();let reject;const pending=new Promise((_,no)=>reject=no);
 player.pending=new Map([[19,{reject,resolve:()=>{},timer:setTimeout(()=>{},1000)}]]);
 player.receive({id:19,error:'Private mpv backend mismatch',code:'ASSET_LOAD_FAILED'});
 await assert.rejects(pending,error=>error.code==='ASSET_LOAD_FAILED');assert.equal(player.pending.size,0);
});

test('demuxer hints reach each load and do not leak into the next source',async()=>{
 const {player}=control(),loads=[];player.load=async data=>loads.push(data);
 await player.open(new File(['sbc'],'audio.sbc'));
 await player.open(new File(['container'],'video.mkv'));
 await player.open(new File(['container'],'unknown'),{demuxer:'matroska'});
 await player.openRemote({url:'https://example.test/media',demuxer:'sbc',format:'file'});
 assert.deepEqual(loads.map(load=>load.demuxer),['sbc','','matroska','sbc']);
 await assert.rejects(player.open(new File(['x'],'unknown'),{demuxer:'sbc,other'}),error=>error.code==='INVALID_ARGUMENT');
 await assert.rejects(player.openRemote({url:'https://example.test/media',demuxer:'../sbc'}),error=>error.code==='INVALID_ARGUMENT');
 await assert.rejects(player.open(new File(['x'],'unknown'),{demuxer:42}),error=>error.code==='INVALID_ARGUMENT');
 await player.open(new File(['container'],'video.mkv'),{demuxer:''});assert.equal(loads[4].demuxer,'');
 assert.equal(loads.length,5);
});
