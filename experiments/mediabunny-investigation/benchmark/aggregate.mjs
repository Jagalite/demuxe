// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const names=['format-screen-final-20260925','extension-screen-20260925','real-fixture-screen-20260925','low-complexity-screen-20260925'];
const screens=[];
for(const name of names){const file=path.join(root,'notes',name+'.json');const bytes=await readFile(file);const data=JSON.parse(bytes);
  screens.push({name,raw:`notes/${name}.json`,sha256:createHash('sha256').update(bytes).digest('hex'),
    browserVersions:data.browserVersions??null,cases:data.results.map(x=>({browser:x.browser,fixture:x.fixture?.split('/').at(-1),
      videoCodec:x.result?.tracks.find(t=>t.type==='video')?.codec??null,audioCodec:x.result?.tracks.find(t=>t.type==='audio')?.codec??null,
      videoSupported:x.result?.videoSupport??null,audioSupported:x.result?.audioSupport??null,
      videoDecoded:x.result?.decode?.decoded??0,audioDecoded:x.result?.audioDecode?.decoded??0,
      extensionVideoDecoded:x.result?.extensionVideo?.decoded??0,extensionAudioDecoded:x.result?.extensionAudio?.decoded??0,
      metadataReadyMs:x.result?.measurements?.metadataReadyMs??null,firstPacketMs:x.result?.measurements?.firstPacketMs??null,
      firstPresentedMs:x.result?.decode?.firstPresentedMs??null,requestCount:x.requestCount??null,transferredBytes:x.bytes??null,
      attachments:x.result?.attachments??[],errors:[x.error,...(x.result?.errors??[]),x.result?.decode?.error,x.result?.audioDecode?.error,x.result?.extensionVideo?.error,x.result?.extensionAudio?.error].filter(Boolean)}))});}
const playbackTrials=[];
for(const [name,admission] of [['realtime-abba-20260925','exploratory-ungated'],['realtime-abba-transmitted-20260925','exploratory-ungated'],
  ['realtime-gated-abba-20260925','gated-limited'],['realtime-gated-presentation-20260925','gated-limited']]){
  const file=path.join(root,'notes',name+'.json'),bytes=await readFile(file),data=JSON.parse(bytes);
  playbackTrials.push({name,admission,raw:`notes/${name}.json`,sha256:createHash('sha256').update(bytes).digest('hex'),
    browserVersion:data.browserVersion,startupGate:data.browserIdentity?.startupReadiness?.status??'not-run',fixture:data.fixture,seconds:data.seconds,
    arms:data.arms.map(x=>({arm:x.arm,cpuOneCorePercent:x.cpu?.oneCorePercent??null,processIdsStable:x.cpu?.processIdsStable??null,
      rendererPercent:x.cpu?.roles?.renderer??null,gpuPercent:x.cpu?.roles?.gpu??null,gate:x.gate??null,
      requestCount:x.requests?.length??null,serverBodyBytes:name==='realtime-abba-20260925'?null:x.transferredBytes??null,
      note:name==='realtime-abba-20260925'?'Original server counter recorded planned response lengths, not sent bytes.':undefined,error:x.error??null}))});
}
const result={schema:2,createdAt:new Date().toISOString(),mediabunnyVersion:'1.60.0',
  verdict:'Gated H.264/AAC main-thread PoC used less Chrome CPU in one bracket, but worker-presenter control overlapped Hybrid and did not establish a demux-attributable playback gain. Category 4 research infrastructure candidate; categories 2/3 unproven.',
  measurementScope:'Finite format/component screen plus one narrow real-time H.264/AAC A/V lane and a worker-presentation ablation. No complete correctness/fidelity, allocation/GC, seek-to-present, or multi-format matched CPU qualification.',
  screens,playbackTrials};
await writeFile(path.join(root,'result.json'),JSON.stringify(result,null,2)+'\n');
