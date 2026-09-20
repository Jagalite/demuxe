// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let Worklet;
vm.runInNewContext(fs.readFileSync('web/audio-worklet.js','utf8'),{
 AudioWorkletProcessor:class {constructor(){this.port={postMessage(){}};}},
 registerProcessor:(_name,C)=>{Worklet=C},Int32Array,Float32Array,Atomics,sampleRate:48000,currentFrame:0
});
const input=Float32Array.from({length:48000},(_,i)=>i<257?Math.sin(i*.1)*.3:0);
// Independent direct convolution oracle, then detect certified post-filter zero spans.
const taps=[.5,.25,.125,.0625];
const oracle=Float32Array.from(input,(_,i)=>taps.reduce((s,t,k)=>s+t*(input[i-k]||0),0));
function encode(a){const spans=[];for(let i=0;i<a.length;){let end=i+1;const zero=a[i]===0;while(end<a.length&&(a[end]===0)===zero)end++;spans.push(zero?{start:i,count:end-i,zero:true}:{start:i,count:end-i,pcm:a.slice(i,end)});i=end;}return spans;}
let spans=encode(oracle);
function playback(symbolic){
 const capacity=512,buffer=new SharedArrayBuffer(64+capacity*2*4),h=new Int32Array(buffer,0,16),pcm=new Float32Array(buffer,64);
 const w=new Worklet({processorOptions:{buffer,capacity,channels:2}});h[3]=1;w.process([],[[new Float32Array(128),new Float32Array(128)]]);h[2]=1;
 const out=[];for(let start=0;start<oracle.length;start+=128){
  for(let i=start;i<start+128;i++){let x=oracle[i];if(symbolic){const s=spans.find(s=>i>=s.start&&i<s.start+s.count);x=s.zero?0:s.pcm[i-s.start];}pcm[(i%capacity)*2]=x;pcm[(i%capacity)*2+1]=x;}
  h[0]=start+128;const channels=[new Float32Array(128),new Float32Array(128)];w.process([],[channels]);assert.deepEqual(channels[0],channels[1]);out.push(...channels[0]);
 }
 assert.equal(h[5],48000);assert.equal(h[6],0);
 // Empty ring gives silence but must NOT advance the media clock.
 w.process([],[[new Float32Array(128),new Float32Array(128)]]);assert.equal(h[5],48000);assert.equal(h[6],1);
 // Source/seek epoch acknowledgement: old buffered samples are not published.
 h[3]=2;h[0]=0;const changed=[new Float32Array(128),new Float32Array(128)];w.process([],[changed]);assert.ok(changed[0].every(x=>x===0));assert.equal(h[4],2);h[5]=0;
 w.port.onmessage({data:'close'});assert.equal(w.process([],[changed]),false);
 return Float32Array.from(out);
}
const baseline=playback(false),candidate=playback(true);assert.deepEqual(candidate,baseline);assert.deepEqual(candidate,oracle);
const bad=oracle.slice();bad.fill(0,257);const tailMismatches=bad.reduce((n,x,i)=>n+(x!==oracle[i]),0);assert.ok(tailMismatches>0);
assert.ok(oracle.slice(257,260).some(x=>x!==0));
const result={passed:true,profile:'post-FIR mono float32 spans duplicated to stereo; actual PCMOutput executed under Node worklet shim',candidate_executed:true,fallback:false,samples:48000,exact_output:true,span_count:spans.length,pcm_payload_bytes:spans.reduce((n,s)=>n+(s.pcm?.byteLength||0),0),baseline_pcm_payload_bytes:oracle.byteLength,descriptor_bytes_not_measured:true,tail_wrong_control_mismatches:tailMismatches,epoch_reset:true,close:true,underrun_not_media_silence:true,limits:['Node component, not browser AudioWorklet scheduling','zero detection scans materialized post-filter samples; no decoder allocation avoided','ring remains fully materialized and unchanged','no nonlinear/noise stage admitted','no runtime benchmark or production integration']};

const noise=Float32Array.from(oracle,x=>Math.fround(x+0.001));assert.ok(noise.slice(260).every(x=>x!==0));result.noiseStageMaterialized=true;
const rows=[];for(let pair=-2;pair<9;pair++){for(const mode of pair%2?['candidate','baseline']:['baseline','candidate']){const t=performance.now();if(mode==='candidate')spans=encode(oracle);const y=playback(mode==='candidate');const wallMs=performance.now()-t;assert.deepEqual(y,oracle);rows.push({pair,mode,wallMs});}}
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];const b=median(rows.filter(r=>r.pair>=0&&r.mode==='baseline').map(r=>r.wallMs)),c=median(rows.filter(r=>r.pair>=0&&r.mode==='candidate').map(r=>r.wallMs));result.rows=rows;result.baselineMedianMs=b;result.candidateMedianMs=c;result.ratio=c/b;result.performancePassed=c<=1.1*b&&result.pcm_payload_bytes<=result.baseline_pcm_payload_bytes/8;result.metadataDescriptorCount=spans.length;result.limits=result.limits.filter(s=>!s.includes('no runtime benchmark'));result.limits.push('Node shim wall cost only; metadata object overhead and opaque process memory not measured');fs.writeFileSync(process.argv[2]+'/results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({b,c,ratio:c/b,performancePassed:result.performancePassed}));

