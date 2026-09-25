// SPDX-License-Identifier: Apache-2.0
// Count diagnostic Chrome trace events; event durations are not CPU attribution.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';

const root=path.resolve(process.env.TRACES??'results/hybrid-gap/20260924-traces');
const metadata=JSON.parse(await fs.readFile(path.join(root,'summary.json')));
const names=['MojoVideoDecoder::Decode','MojoVideoDecoder::OnVideoFrameDecoded','MojoVideoDecoderService::Decode',
 'VideoDecoder::Decode','VideoDecoder::Ouput','RasterDecoderImpl::DoRasterCHROMIUM','GPUTask',
 'GpuChannel::ExecuteDeferredRequest','VideoFrameSubmitter::SubmitFrame','Display::DrawAndSwap','CommitPresentedFrameToCA'];
const result={createdAt:new Date().toISOString(),seconds:metadata.seconds,notes:'Diagnostic event counts and synchronous FunctionCall spans. Nested/asynchronous trace durations are not additive CPU time.',arms:{}};
for(const arm of metadata.arms){
 const trace=JSON.parse(gunzipSync(await fs.readFile(path.join(root,`${arm.arm}-trace.json.gz`))));
 const events=trace.traceEvents??[],count=Object.fromEntries(names.map(name=>[name,0]));
 const functions={};
 for(const event of events){
  if(Object.hasOwn(count,event.name))count[event.name]++;
  if(event.name==='FunctionCall'&&event.ph==='X'){
   const url=event.args?.data?.url??'';
   if(!url.includes('/demuxe/web/'))continue;
   const key=url.split('/').at(-1).split('?')[0],entry=functions[key]??={calls:0,spanMs:0};
   entry.calls++;entry.spanMs+=(event.dur??0)/1000;
  }
 }
 const nativeProperties=arm.mediaEvents.filter(item=>item.event==='playerPropertiesChanged').flatMap(item=>item.data.properties??[]);
 const property=name=>nativeProperties.find(item=>item.name===name)?.value??null;
 result.arms[arm.arm]={route:arm.route,events:events.length,counts:count,
  nativeDecoderName:property('kVideoDecoderName'),nativePlatformDecoder:property('kIsPlatformVideoDecoder'),
  functions:Object.fromEntries(Object.entries(functions).map(([key,item])=>[key,{calls:item.calls,spanMs:+item.spanMs.toFixed(3)}]))};
}
await fs.writeFile(path.join(root,'analysis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
