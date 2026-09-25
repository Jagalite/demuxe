// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {MediaCapabilityQueries} from '../web/generated/internal/media-capabilities.js';
import {nativeBrowserCapabilities} from '../web/generated/internal/browser-media-capability.js';
const source={duration:10,format:'matroska',tracks:[{index:0,id:'1',type:'video',codec:'h264',codecString:'avc1.640028',width:1920,height:1080,bitrate:5000000,framerate:30},{index:1,id:'1',type:'audio',codec:'aac',aacObject:2,channels:2,sampleRate:48000}]};
const capabilities=p=>nativeBrowserCapabilities(p,'auto',{canPlayType:()=> 'probably',isTypeSupported:()=>true});
test('query uses exact source metadata, separate file/MSE requests and cached API inputs',async()=>{
 const calls=[];const queries=new MediaCapabilityQueries(async c=>{calls.push(c);return {supported:true,smooth:true,powerEfficient:false};});
 const cap=capabilities(source);
 const first=await queries.inspect(cap.direct,source);await queries.inspect(cap.direct,source);
 assert.equal(calls.length,2);assert.equal(first.queries.length,2);assert.equal(first.queries[0].configuration.video.framerate,30);assert.equal(first.queries[0].configuration.video.bitrate,5000000);
 assert.equal(first.queries[1].configuration.audio.samplerate,48000);assert.equal(first.queries[1].configuration.audio.contentType,'audio/matroska; codecs="mp4a.40.2"');
 assert.equal(first.scope,'advisory');assert.equal(first.queries[0].powerEfficient,false);
 await queries.inspect(cap.remux,source);assert.equal(calls.length,4);assert.equal(calls[2].type,'media-source');
 const changed={...source,tracks:source.tracks.map(t=>t.type==='audio'?{...t,sampleRate:44100}:t)};
 await queries.inspect(capabilities(changed).direct,changed);assert.equal(calls.length,5);
});
test('missing video rate/bitrate is recorded without invented defaults',async()=>{
 const p={...source,tracks:source.tracks.map(t=>t.type==='video'?{...t,framerate:undefined,bitrate:undefined}:t)};
 const q=new MediaCapabilityQueries(async()=>({supported:true,smooth:true,powerEfficient:true}));
 const r=await q.inspect(capabilities(p).direct,p);assert.deepEqual(r.unqueriedTracks,[0]);assert.equal(r.queries.length,1);
});
test('false predictions remain advisory and do not replace route support',async()=>{
 const cap=capabilities(source).direct;
 const r=await new MediaCapabilityQueries(async()=>({supported:false,smooth:false,powerEfficient:false})).inspect(cap,source);
 assert.equal(cap.status,'supported');assert.ok(r.queries.every(q=>q.supported===false));
});
test('missing API, rejection and timeout preserve bounded unknown evidence',async()=>{
 const cap=capabilities(source).direct;
 for(const [decode,status] of [[undefined,'unavailable'],[async()=>{throw Error('invalid');},'error'],[()=>new Promise(()=>{}),'timeout']]){
  const result=await new MediaCapabilityQueries(decode,5).inspect(cap,source);assert.ok(result.queries.every(q=>q.status===status));assert.ok(result.queries.every(q=>q.supported===undefined));
 }
});
test('late answers replace timeout evidence and notify reconsideration without a second query',async()=>{
 let finish,updates=0,calls=0;
 const queries=new MediaCapabilityQueries(()=>{calls++;return new Promise(resolve=>finish=resolve);},5,()=>updates++);
 const p={...source,tracks:[source.tracks[1]]},cap=capabilities(p).direct;
 const first=await queries.inspect(cap,p);assert.equal(first.queries[0].status,'timeout');
 finish({supported:true,smooth:true,powerEfficient:false});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(updates,1);assert.equal(queries.cached(cap,p).queries[0].late,true);
 const next=await queries.inspect(cap,p);assert.equal(next.queries[0].status,'answered');assert.equal(next.queries[0].supported,true);assert.equal(calls,1);
 assert.equal(first.queries[0].status,'timeout','Previously returned snapshots stay intact');
});
test('late rejection is handled without converting a timeout to unsupported',async()=>{
 let fail,updates=0;
 const queries=new MediaCapabilityQueries(()=>new Promise((_,reject)=>fail=reject),5,()=>updates++);
 const p={...source,tracks:[source.tracks[1]]},cap=capabilities(p).direct;
 await queries.inspect(cap,p);fail(Error('late failure'));await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(updates,0);assert.equal(queries.cached(cap,p).queries[0].status,'timeout');
});

test('a late answer arriving before sibling queries settle survives publication',async()=>{
 const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout,timers=[],resolvers=[];
 globalThis.setTimeout=f=>(timers.push(f),timers.length);globalThis.clearTimeout=()=>{};
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
 try{
  const queries=new MediaCapabilityQueries(()=>new Promise(resolve=>resolvers.push(resolve))),cap=capabilities(source).direct;
  const pending=queries.inspect(cap,source);await flush();timers[0]();await flush();
  resolvers[0]({supported:true,smooth:true,powerEfficient:true});await flush();timers[1]();await flush();
  const result=await pending;assert.equal(result.queries[0].status,'answered');assert.equal(result.queries[0].late,true);
  assert.equal(queries.cached(cap,source).queries[0].status,'answered');assert.equal(result.queries[1].status,'timeout');
 }finally{globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;}
});
