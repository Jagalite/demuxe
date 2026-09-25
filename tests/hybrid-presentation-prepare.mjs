// SPDX-License-Identifier: Apache-2.0
// Mutate only a cloned asset snapshot for test-only presenter arms.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]??'build/hybrid-presentation/assets-20260923');
const workerFile=path.join(root,'demuxe/web/filter-retained-engine-worker.js');
const compiled=path.join(root,'demuxe/web/generated/internal/wasm-player.js');
const replace=(source,oldValue,newValue)=>{
  if(!source.includes(oldValue))throw Error('Snapshot patch anchor absent: '+oldValue.slice(0,80));
  return source.replace(oldValue,newValue);
};
let js=await fs.readFile(compiled,'utf8');
js=replace(js,"'web/filter-retained-engine-worker.js?mode=retained'","`web/filter-retained-engine-worker.js?mode=retained&arm=${globalThis.__hybridPresentationArm || 'production'}`");
await fs.writeFile(compiled,js);
let worker=await fs.readFile(workerFile,'utf8');
worker=replace(worker,"import {drawRetainedVideo} from './retained-video.js';","import {drawRetainedVideo} from './retained-video.js';\nimport {createPresenter} from './hybrid-presentation-gpu.mjs';\nlet arm=new URL(self.location.href).searchParams.get('arm')||'production';\nlet gpuPresenter;\nconst costs={drawMs:0,drawCalls:0,selectMs:0,receiveMs:0,subtitleMs:0};\nfunction presentFrame(frame,overlay){\n const start=performance.now();\n if(arm==='production'){drawRetainedVideo(context,frame,canvas,videoTrack);const at=performance.now();subtitles.draw(context,overlay);costs.subtitleMs+=performance.now()-at;}\n else if(arm==='canvas-minimal')context.drawImage(frame,0,0,canvas.width,canvas.height);\n else if(arm==='webgl2'||arm==='webgpu')gpuPresenter.draw(frame);\n else if(arm!=='no-draw')throw Error('Unknown presentation arm '+arm);\n costs.drawMs+=performance.now()-start;costs.drawCalls++;\n}\n");
worker=replace(worker,'function receiveFrame(message){\n presentation.received++;','function receiveFrame(message){\n const receiveStart=performance.now();\n presentation.received++;');
worker=replace(worker,' presentReady(key);\n}\nfunction presentReady',' presentReady(key);costs.receiveMs+=performance.now()-receiveStart;\n}\nfunction presentReady');
worker=replace(worker,'  drawRetainedVideo(context,frame,canvas,videoTrack);\n  subtitles.draw(context,request.overlay);','  presentFrame(frame,request.overlay);');
worker=replace(worker,'if(quality&&presentation.pixelChecks.length<2&&presentation.drawn%60===0)','if(quality&&context&&presentation.pixelChecks.length<2&&presentation.drawn%60===0)');
worker=replace(worker,'function presentSelected(){\n const serial=','function presentSelected(){\n const selectStart=performance.now();\n const serial=');
worker=replace(worker,'drawRetainedVideo(context,heldFrame,canvas,videoTrack);subtitles.draw(context,overlay);presentation.redraws++;engine._web_presented();return;','presentFrame(heldFrame,overlay);presentation.redraws++;engine._web_presented();costs.selectMs+=performance.now()-selectStart;return;');
worker=replace(worker,' const overlay=subtitles.read(engine);',' const overlay=arm===\'production\'?subtitles.read(engine):null;');
worker=replace(worker,' for(const [pts,request] of pendingFrames)if(performance.now()-request.deadline>500){presentation.missing++;throw Error(`Retained frame ${pts} did not arrive`);}\n}',' for(const [pts,request] of pendingFrames)if(performance.now()-request.deadline>500){presentation.missing++;throw Error(`Retained frame ${pts} did not arrive`);}\n costs.selectMs+=performance.now()-selectStart;\n}');
worker=replace(worker,'presentation:{...presentation,lateMs:','presentation:{...presentation,arm,costs:{...costs},lateMs:');
worker=replace(worker,"context = canvas.getContext('2d', {alpha:false});","if(arm==='webgl2'||arm==='webgpu')gpuPresenter=await createPresenter(canvas,arm);\n      else context = canvas.getContext('2d', {alpha:false});");
worker=replace(worker,"    } else if (data.type === 'timing' && engine) {","    } else if (data.type === 'presentation-arm' && engine) {\n      if(!['production','canvas-minimal','no-draw'].includes(data.arm)||!context)throw Error('Incompatible test presenter arm');\n      arm=data.arm;\n    } else if (data.type === 'timing' && engine) {");
worker=replace(worker,'      post({type:\'destroyed\',decoderStats,','      gpuPresenter?.dispose();\n      post({type:\'destroyed\',decoderStats,');
await fs.writeFile(workerFile,worker);
await fs.copyFile(new URL('./hybrid-presentation-gpu.mjs',import.meta.url),path.join(root,'demuxe/web/hybrid-presentation-gpu.mjs'));
