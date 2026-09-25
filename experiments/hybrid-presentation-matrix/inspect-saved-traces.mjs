// SPDX-License-Identifier: Apache-2.0
// Offline forensic analysis. Reads saved traces; never launches Chrome.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=path.resolve(process.env.TRACES??'results/hybrid-gap/20260924-traces');
const output=path.resolve(process.env.OUTPUT??'results/hybrid-presentation-matrix/saved-trace-forensics.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const names=[
  'MojoVideoDecoder::OnVideoFrameDecoded','MojoVideoFrameHandleReleaser::ReleaseVideoFrame',
  'VideoFrameSubmitter::SubmitFrame','VideoResourceUpdater::CreateForHardwareFrame',
  'SharedImageStub::OnCreateSharedImage','SharedImageStub::OnDestroySharedImage',
  'RasterDecoderImpl::DoBeginRasterCHROMIUM','RasterDecoderImpl::DoRasterCHROMIUM',
  'RasterDecoderImpl::DoEndRasterCHROMIUM','RasterDecoderImpl::DoEndRasterCHROMIUM::Flush',
  'GpuChannel::ExecuteDeferredRequest','GPUTask','WebGPU','Display::DrawAndSwap',
  'IOSurfaceImageBacking::WaitForCommandsToBeScheduled::Dawn','CommitPresentedFrameToCA',
  'RasterDecoderImpl::DoReadbackARGBImagePixelsINTERNAL','RasterDecoderImpl::DoReadbackYUVImagePixelsINTERNAL',
];
const result={schema:1,method:'Offline inspection of existing six-second diagnostic traces; no new playback runs.',
  timingCaution:'Event spans overlap and cover only instrumented work. Thread duration fields are retained as trace data, not an additive budget or a substitute for the separate 20-second CPU measurements.',arms:{}};
for(const arm of (process.env.ARMS??'A,B,C').split(',')){
  const file=path.join(root,`${arm}-trace.json.gz`),bytes=await fs.readFile(file);
  const events=JSON.parse(gunzipSync(bytes)).traceEvents;
  const decoded=events.filter(e=>e.name==='MojoVideoDecoder::OnVideoFrameDecoded');
  const descriptors={};
  for(const event of decoded){
    const descriptor=String(event.args?.frame).replace(/timestamp:\d+/,'timestamp:<var>');
    descriptors[descriptor]=(descriptors[descriptor]??0)+1;
  }
  const allocations={};
  for(const event of events.filter(e=>e.name==='SharedImageStub::OnCreateSharedImage')){
    const key=`${event.args.width}x${event.args.height}`;allocations[key]=(allocations[key]??0)+1;
  }
  const profilerThreads=events.filter(e=>e.name==='thread_name'&&e.args?.name==='v8:ProfEvntProc');
  const profilerCpuSpans=profilerThreads.map(thread=>{
    const timed=events.filter(e=>e.pid===thread.pid&&e.tid===thread.tid&&e.tts!==undefined);
    return {pid:thread.pid,tid:thread.tid,threadClockSpanMs:timed.length?
      (Math.max(...timed.map(e=>e.tts+(e.tdur??0)))-Math.min(...timed.map(e=>e.tts)))/1000:null};
  });
  result.arms[arm]={source:path.relative(process.cwd(),file),sha256:sha(bytes),
    profilerOverhead:{threads:profilerCpuSpans,totalThreadClockSpanMs:profilerCpuSpans.reduce((n,t)=>n+(t.threadClockSpanMs??0),0),
      caveat:'Sum of first-to-last observed thread CPU-clock spans, not a synchronized complete process CPU window. Diagnostic profiling was absent from CPU trials.'},
    decodedFrameDescriptors:descriptors,sharedImageCreationSizes:allocations,
    events:Object.fromEntries(names.map(name=>{
      const matches=events.filter(e=>e.name===name);
      return [name,{count:matches.length,completeEvents:matches.filter(e=>e.ph==='X').length,
        threadDurationMs:matches.reduce((n,e)=>n+(e.tdur??0),0)/1000,
        example:matches[0]?{phase:matches[0].ph,pid:matches[0].pid,tid:matches[0].tid,args:matches[0].args}:null}];
    }))};
}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.arms).map(([arm,data])=>[arm,{
  decoded:Object.values(data.decodedFrameDescriptors).reduce((a,b)=>a+b,0),
  descriptors:Object.keys(data.decodedFrameDescriptors).length,allocations:data.sharedImageCreationSizes,
  raster:data.events['RasterDecoderImpl::DoRasterCHROMIUM'].count}]))));
