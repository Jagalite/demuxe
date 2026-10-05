// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {checkSequenceModel} from './sequence-model.mjs';

// Exercise the maintained serialized harness itself with controlled bad output.
// These tests qualify failure reporting, not browser/media playback.
async function failureReport({seed,pixelChange=false,timeout=false,openError,diagnosticsError,native=false,continued=false,clockDrift=false,boundaryClockDrift=false,expectSuccess=false}={}) {
  let now=0,player,reads=0,frames=0;const cleanup=[];
  class HTMLVideoElement {paused=true;}
  const state=values=>Object.freeze({status:'paused',playbackIntent:'pause',sourceId:1,currentTime:0,duration:10,
    activeMode:native?'native':'hybrid',automaticSelection:false,volume:1,muted:false,playbackRate:1,pendingOperation:null,error:null,
    mediaInfo:Object.freeze({}),...values});
  class Player {
    constructor(){player=this;this.state=state();Object.defineProperty(this,'diagnostics',{get(){if(diagnosticsError)throw diagnosticsError;return {plan:{id:native?'native-direct':'hybrid-private'}};}});this.surface=native?new HTMLVideoElement():{};}
    async open(){if(openError)throw openError;}
    async destroy(){cleanup.push('destroy');this.state=state({status:'idle',sourceId:null,error:null});}
  }
  const binding=p=>({
    async play(){p.state=state({...p.state,status:'playing',playbackIntent:'play'});},
    async setVolume(volume){p.state=state({...p.state,volume});},
    async dispose(){cleanup.push('dispose');},
  });
  let source=checkSequenceModel.toString()
    .replace("const {Player}=await import('/web/generated/index.js');",'')
    .replace("const {bindPlayer}=await import('/web/generated/integration/index.js');",'');
  if(native)source=source.replace(/const actions=\[[^;]+;/,"const actions=['volume'];");
  const run=vm.runInNewContext('('+source+')',{
    Player,HTMLVideoElement,requestAnimationFrame(callback){frames++;now+=16;if(boundaryClockDrift)player.state=state({...player.state,currentTime:.2});callback(now);},bindPlayer:binding,File:class {},fetch:async()=>({blob:async()=>({})}),
    document:{querySelector:()=>({}),createElement:()=>({getContext:()=>({drawImage(){},getImageData(){return {data:new Uint8ClampedArray(16).fill(native?(reads++===0?0:continued&&reads>2?20:10):pixelChange&&reads++?10:0)};}})})},
    performance:{now:()=>now},setTimeout(callback,ms){now+=ms;if(clockDrift)player.state=state({...player.state,currentTime:.2});if(timeout)player.state=state({...player.state,status:'error',currentTime:.25,
      error:{code:'NETWORK_TIMEOUT',message:'Decoder deadline https://user:password@example.test/private?token=secret\nAuthorization: Bearer credential\n'+ 'x'.repeat(1500),scope:'session',retryable:true}});callback();},
  });
  let error,result;try{result=await run({mode:native?'native':'hybrid',seed,rounds:1});}catch(cause){error=cause;}
  if(!expectSuccess)assert.ok(error,'Controlled bad output must fail the original assertions');else assert.equal(error,undefined);
  assert.deepEqual(cleanup,['dispose','destroy']);assert.equal(player.state.status,'idle');
  return expectSuccess?{trace:result.trace,frames}:{message:error.message,trace:JSON.parse(error.message.split(' trace=')[1]),frames};
}

test('playing failure retains measured clock/pixels and pre-destruction error state',async()=>{
  const {message,trace}=await failureReport({seed:24301,timeout:true}),last=trace.at(-1);
  assert.match(message,/Playing intent without advancing video output/);
  assert.equal(last.action,'play');assert.equal(last.output.clockDelta,.25);assert.equal(last.output.pixelChange,0);
  assert.equal(last.failure.state.status,'error');assert.equal(last.failure.state.playbackIntent,'play');
  assert.equal(last.failure.state.sourceId,1);assert.equal(last.failure.state.plan,'hybrid-private');
  assert.equal(last.failure.state.error.code,'NETWORK_TIMEOUT');assert.ok(last.failure.state.error.message.length<=768);
  assert.doesNotMatch(message,/password|example\.test|token=secret|Bearer credential/);
  assert.match(last.failure.state.error.message,/\[URL\]/);assert.match(last.failure.state.error.message,/\[redacted\]/);
});

test('paused pixel failure retains measured values before the assertion',async()=>{
  const {message,trace}=await failureReport({seed:1,pixelChange:true}),last=trace.at(-1);
  assert.match(message,/Paused video kept changing/);assert.equal(last.action,'volume');
  assert.equal(last.output.clockDelta,0);assert.equal(last.output.pixelChange,10);
  assert.equal(last.failure.state.status,'paused');assert.equal(last.failure.state.playbackIntent,'pause');
});

test('initialization failure records bounded sanitized error before cleanup',async()=>{
  const {message,trace}=await failureReport({seed:1,openError:Error('Asset deadline https://private.test/media?secret=yes\nfile:///private/movie.mkv blob:https://private.test/id\nBearer hidden\n'+'a'.repeat(2000))});
  assert.equal(trace.length,1);assert.equal(trace[0].action,'initialization');
  assert.ok(trace[0].failure.message.length<=768);assert.doesNotMatch(message,/private\.test|private\/movie|secret=yes|Bearer hidden/);
});

test('broken diagnostic access does not replace the original failure',async()=>{
  const {message,trace}=await failureReport({seed:1,openError:Error('Original open failure'),diagnosticsError:Error('Diagnostic read failed')});
  assert.match(message,/^Error: Original open failure mode=/);assert.equal(trace[0].failure.state,null);
  assert.equal(trace[0].failure.diagnosticError,'Error: Diagnostic read failed');
});


test('native paused observation retains queued paint evidence and then checks stable output',async()=>{
  const {trace,frames}=await failureReport({seed:1,native:true,expectSuccess:true});
  assert.equal(frames,2);assert.equal(trace[0].output.preBoundaryPixelChange,10);
  assert.equal(trace[0].output.pixelChange,0);assert.equal(trace[0].output.clockDelta,0);
});
test('native continued output after the presentation boundary still fails',async()=>{
  const {message,trace}=await failureReport({seed:1,native:true,continued:true});
  assert.match(message,/Paused video kept changing/);assert.equal(trace[0].output.pixelChange,10);
});
for(const timing of ['clockDrift','boundaryClockDrift'])test(`native paused clock drift during ${timing} still fails`,async()=>{
  const {message,trace}=await failureReport({seed:1,native:true,[timing]:true});
  assert.match(message,/Paused clock kept moving/);assert.equal(trace[0].output.clockDelta,.2);
});
