// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WebCodecsVideoDecoder,assertExternalVideoDecoder} from '../web/external-video-decoder.js';
import {WebGPUCodecRuntime} from '../web/webgpu/runtime.js';
import {WebGPUMailboxService} from '../web/webgpu/mailbox-service.js';
import {assertWebGPUCodecAdapter,configureWebGPUCodecAdapter} from '../web/webgpu/codecs/adapter.js';
import {webgpuDecoderSupported,webgpuSupportedCodecs} from '../web/webgpu/codecs/registry.js';
import {chooseExternalDecoderBackend,selectExternalDecoderBackend,selectExternalDecoderConfiguration,
  normalizeExternalDecodeIntent,EXACT_DECODE_INTENT} from '../web/generated/internal/external-decoder-selection.js';
import {hybridPreflight} from '../web/hybrid-preflight.js';
import {PLAYBACK_MODES} from '../web/generated/types.js';
import {PLAYBACK_PLANS} from '../web/generated/internal/playback-plans.js';
import {compatibilityFailure} from '../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../web/generated/internal/errors.js';

test('empty qualification registry preserves every production route',async()=>{
  assert.deepEqual(webgpuSupportedCodecs(),[]);
  for(const codec of ['prores','ffv1','dnxhr','h264','hevc','vp9','av1']){
    assert.equal(webgpuDecoderSupported(codec),false);
    assert.equal(selectExternalDecoderBackend(codec,true),'webcodecs');
    assert.equal(selectExternalDecoderBackend(codec,false),null);
  }
  assert.equal(chooseExternalDecoderBackend(true,true),'webcodecs');
  assert.equal(chooseExternalDecoderBackend(undefined,true),'webcodecs');
  assert.equal(chooseExternalDecoderBackend(false,true),'webgpu');
  assert.equal(chooseExternalDecoderBackend(false,false),null);
  assert.deepEqual(selectExternalDecoderConfiguration('h264',undefined,{qualityMode:'reduced'}),{backend:'webcodecs'});
  assert.deepEqual(selectExternalDecoderConfiguration('prores',false,{qualityMode:'reduced'}),{backend:null});
  assert.doesNotMatch(await readFile('src/types.ts','utf8'),/webgpuDecodeIntent|qualityMode/);
  const future=[{type:'video',codec:'prores'}];
  assert.equal(await hybridPreflight(future,undefined,200,codec=>codec==='prores'),undefined);
  assert.equal(future[0].webCodecsSupported,false);
  assert.deepEqual(PLAYBACK_MODES,['native','hybrid','software']);
  assert.ok(PLAYBACK_PLANS.every(plan=>plan.video!=='webgpu'));
  const tracks=[{type:'video',codec:'h264',browserConfig:{kind:1,width:640,height:360,description:new Uint8Array([1,66,0,30,255,225,0])}}];
  assert.match(await hybridPreflight(tracks,{isConfigSupported:async()=>({supported:false})}),/Hybrid browser configuration unsupported/);
  assert.equal(tracks[0].webCodecsSupported,false);
  const packageScript=await readFile('scripts/package-beta.py','utf8');
  assert.match(packageScript,/web\/webgpu\/codecs/);
  assert.match(packageScript,/registered\.values\(\)/);
  assert.throws(()=>assertWebGPUCodecAdapter({codec:'prores',queuedPackets:0},'prores'),/missing configure/);
  assert.equal(compatibilityFailure(Error('Hybrid WebGPU decoder: Error: WebGPU device lost')),true);
  assert.equal(compatibilityFailure(Error('Source transport: Hybrid WebGPU decoder: HTTP 403')),false);
  assert.equal(compatibilityFailure(new PlayerError('ASSET_LOAD_FAILED','Hybrid WebGPU decoder: codec adapter module missing')),false);
});

test('decode intent defaults to exact and reaches a dummy adapter without changing routing',async()=>{
  assert.deepEqual(normalizeExternalDecodeIntent(),EXACT_DECODE_INTENT);
  for(const invalid of [null,'reduced',{targetWidth:320},{qualityMode:'fast'},{allowApproximation:'yes'}])
    assert.throws(()=>normalizeExternalDecodeIntent(invalid),/Invalid external decode intent/);
  const received=[];
  const exactOnly={async configure(config){received.push(config.decodeIntent);}};
  const exact=await configureWebGPUCodecAdapter(exactOnly,{codec:'synthetic'});
  assert.deepEqual(exact.decodeIntent,EXACT_DECODE_INTENT);
  await assert.rejects(configureWebGPUCodecAdapter(exactOnly,{codec:'synthetic',decodeIntent:{qualityMode:'reduced'}}),/does not support requested decode intent/);
  await assert.rejects(configureWebGPUCodecAdapter(exactOnly,{codec:'synthetic',decodeIntent:{targetWidth:320,targetHeight:180}}),/does not support requested decode intent/);
  await assert.rejects(configureWebGPUCodecAdapter(exactOnly,{codec:'synthetic',decodeIntent:{allowApproximation:true}}),/does not support requested decode intent/);
  assert.equal(received.length,1);
  const adapter={supportsDecodeIntent:intent=>intent.qualityMode==='exact'&&!intent.allowApproximation,
    async configure(config){received.push(config.decodeIntent);}};
  const target={targetWidth:320,targetHeight:180,qualityMode:'exact',allowApproximation:false};
  await configureWebGPUCodecAdapter(adapter,{codec:'synthetic',decodeIntent:target});
  assert.deepEqual(received[1],target);
  await assert.rejects(configureWebGPUCodecAdapter(adapter,{codec:'synthetic',decodeIntent:{...target,qualityMode:'reduced'}}),/does not support requested decode intent/);
  assert.equal(received.length,2);
  assert.equal(selectExternalDecoderBackend('prores',false),null);
});

test('GPU mailbox forwards target intent with codec configuration and preserves it on reset',async()=>{
  const memory=new SharedArrayBuffer(80+8*1024*1024+1920*1080*3/2+64);
  const header=new Int32Array(memory,0,16),codecAt=80+8*1024*1024+1920*1080*3/2;
  new Uint8Array(memory,codecAt,9).set(new TextEncoder().encode('synthetic'));
  const engine={HEAPU8:new Uint8Array(memory),_web_decoder_ptr:()=>0};
  const intent={targetWidth:320,targetHeight:180,qualityMode:'exact',allowApproximation:false};
  const service=new WebGPUMailboxService(engine,{gpu:null,decodeIntent:intent});
  const seen=[];service.runtime.configure=async(codec,config)=>{seen.push({codec,config});return true;};
  try{
    header[0]=5;header[2]=1;header[4]=0;header[5]=1920;header[6]=1080;
    await service.pump();assert.equal(header[3],0);
    header[0]=9;header[2]=6;await service.pump();assert.equal(header[3],0);
    assert.equal(seen.length,2);
    for(const call of seen){assert.equal(call.codec,'synthetic');assert.deepEqual(call.config.decodeIntent,intent);}
  }finally{await service.close();}
});

test('WebCodecs backend keeps bounded submission, drain and epoch invalidation',async()=>{
  let instance,closed=0;const output=[];
  class Decoder{
    constructor(callbacks){this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';instance=this;}
    addEventListener(){}configure(){this.state='configured';}
    decode(){this.decodeQueueSize++;}flush(){return Promise.resolve();}
    close(){this.state='closed';closed++;}
  }
  const backend=new WebCodecsVideoDecoder({Decoder,output:frame=>output.push(frame),error:()=>{}});
  assert.equal(assertExternalVideoDecoder(backend),backend);
  backend.configure({codec:'vp9'});
  for(let i=0;i<8;i++)assert.equal(backend.submit({}),true);
  assert.equal(backend.submit({}),false);
  await backend.drain();
  const stale=instance;
  backend.reset();
  stale.callbacks.output({close(){closed++;}});
  assert.equal(output.length,0);
  backend.configure({codec:'vp9'});
  instance.callbacks.output({close(){closed++;}});
  assert.equal(output.length,1);
  backend.destroy();assert.equal(backend.queuedPackets,0);assert.equal(closed,3);
});

test('GPU runtime is constructible with no codecs and releases bounded resources',async()=>{
  let resolveLoss,destroyedBuffers=0,destroyedTextures=0,destroyedDevice=0,lost=[];
  const device={lost:new Promise(resolve=>resolveLoss=resolve),createBuffer:()=>({destroy(){destroyedBuffers++;}}),
    createTexture:()=>({destroy(){destroyedTextures++;}}),destroy(){destroyedDevice++;}};
  const gpu={requestAdapter:async()=>({requestDevice:async()=>device})};
  const runtime=new WebGPUCodecRuntime({gpu,maxSurfaces:1,maxSurfaceBytes:4,maxPooledBufferBytes:64,
    maxLiveBufferBytes:128,maxPipelines:1,onDeviceLost:reason=>lost.push(reason)});
  assert.equal(assertExternalVideoDecoder(runtime),runtime);
  assert.equal(await runtime.configure('prores',{}),false);
  assert.equal(runtime.diagnostics.selected,false);
  assert.equal(runtime.diagnostics.decodeIntent,null);
  await runtime.acquireDevice();runtime.buffer({size:64,usage:8});runtime.pipeline('test',()=>({}));
  assert.throws(()=>runtime.pipeline('second',()=>({})),/pipeline cache bound/);
  assert.throws(()=>runtime.acquireSurface({size:[3,3],format:'r8unorm',usage:4}),/surface byte bound/);
  const surface=runtime.acquireSurface({size:[2,2],format:'r8unorm',usage:4});
  runtime.releaseSurface(surface);
  assert.equal(runtime.acquireSurface({size:[2,2],format:'r8unorm',usage:4}),surface);
  assert.throws(()=>runtime.acquireSurface({size:[3,3],format:'r8unorm',usage:4}),/surface pool bound/);
  const scratch=runtime.acquireBuffer('scratch',{size:64,usage:8});runtime.releaseBuffer(scratch);runtime.releaseBuffer(scratch);
  assert.equal(runtime.diagnostics.liveBufferBytes,128);
  assert.throws(()=>runtime.acquireBuffer('input',{size:1,usage:8}),/live buffer byte bound/);
  assert.equal(runtime.diagnostics.pipelineCount,1);
  let closed=0,reset=0,destroyed=0,index=0;
  runtime.adapter={queuedPackets:8,receiveFrame:()=>({pts:index++,duration:1,generation:runtime.generation,
    surface:{planes:[1,2,3]},width:2,height:2,pixelFormat:'I420',color:{matrix:'bt709'},close(){closed++;}}),
    async submitPacket(){assert.fail('Bounded packet queue must decline this submission');},
    async reset(){reset++;},async destroy(){destroyed++;}};
  assert.equal(await runtime.submit({bytes:new Uint8Array([1]),key:true,pts:0,duration:1,generation:runtime.generation}),false);
  const frame=runtime.receiveFrame();assert.equal(runtime.diagnostics.liveSurfaces,1);
  assert.throws(()=>runtime.receiveFrame(),/surface bound/);assert.equal(closed,1);
  frame.close();frame.close();assert.equal(closed,2);
  await runtime.reset();assert.equal(reset,1);assert.equal(destroyed,1);assert.equal(runtime.diagnostics.liveSurfaces,0);
  assert.equal(runtime.diagnostics.liveBufferBytes,0);
  assert.equal(destroyedTextures,1);assert.equal(destroyedBuffers,2);
  resolveLoss({message:'synthetic device loss'});await Promise.resolve();await Promise.resolve();
  assert.equal(runtime.diagnostics.deviceLost,true);assert.deepEqual(lost,['synthetic device loss']);
  await runtime.destroy();assert.equal(destroyedBuffers,2);assert.equal(destroyedDevice,1);
  assert.equal(runtime.diagnostics.pipelineCount,0);
});

test('device-local mailbox declines an unregistered codec without a frame or device',async()=>{
  const memory=new SharedArrayBuffer(80+8*1024*1024+1920*1080*3/2+64);
  const header=new Int32Array(memory,0,16),errors=[];const codecAt=80+8*1024*1024+1920*1080*3/2;
  new Uint8Array(memory,codecAt,6).set(new TextEncoder().encode('prores'));
  const engine={HEAPU8:new Uint8Array(memory),_web_decoder_ptr:()=>0};
  const service=new WebGPUMailboxService(engine,{gpu:null,onError:error=>errors.push(error),onFrame:()=>assert.fail('No GPU frame is possible')});
  try{
    header[0]=5;header[2]=1;header[4]=0;header[5]=640;header[6]=360;
    await service.pump();
    assert.equal(header[0],6);assert.equal(header[3],-29);
    assert.match(errors[0],/No qualified WebGPU decoder/);
    assert.equal(service.diagnostics.selected,false);
    header[0]=9;header[3]=0;
    await service.close();
    assert.equal(header[0],10);assert.equal(header[3],-29);
  }finally{await service.close();}
});
