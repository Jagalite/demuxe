/* SPDX-License-Identifier: MIT */
function cmpFloat(a,b){let n=Math.min(a.length,b.length),mis=0,first=null,max=0;for(let i=0;i<n;i++){if(a[i]!==b[i]){mis++;if(first===null)first=i;max=Math.max(max,Math.abs(a[i]-b[i]));}}return{length_a:a.length,length_b:b.length,compared:n,mismatches:mis,first,max_abs:max,exact:a.length===b.length&&mis===0}}
window.vorbisWindows=async function(m){
 let ctx=new OfflineAudioContext(2,1,48000),o={jobs:[]},buffers=[];
 const decode=async f=>await ctx.decodeAudioData((await loadFile(f)).buffer);
 try{
 const ref=await decode(m.source),reb=await decode('vorbis_rebuilt.ogg');o.sourceFrames=ref.length;o.sourceChannels=ref.numberOfChannels;o.sampleRate=ref.sampleRate;
 o.rebuilt=Array.from({length:2},(_,c)=>cmpFloat(reb.getChannelData(c),ref.getChannelData(c)));
 for(const j of m.jobs){let q={file:j.file,frames:j.frames};
  try{const a=await decode(j.file);buffers.push(a);q.decodedFrames=a.length;q.decodedChannels=a.numberOfChannels;
   q.whole_window=Array.from({length:2},(_,c)=>cmpFloat(a.getChannelData(c),ref.getChannelData(c).subarray(j.base,j.b)));
   q.selected=Array.from({length:2},(_,c)=>cmpFloat(a.getChannelData(c).subarray(j.slice_start,j.slice_start+j.frames),ref.getChannelData(c).subarray(j.a,j.b)));
   q.candidatePCMHash=Array.from({length:2},(_,c)=>hash(a.getChannelData(c)));
   const w=await decode(j.wrong);q.wrong=Array.from({length:2},(_,c)=>cmpFloat(w.getChannelData(c).subarray(j.slice_start,j.slice_start+j.frames),ref.getChannelData(c).subarray(j.a,j.b)));
  }catch(e){q.error=String(e)}o.jobs.push(q);
 }
 const length=m.jobs.reduce((a,j)=>a+j.frames,0),render=new OfflineAudioContext(2,length,48000);let cursor=0;
 for(let i=0;i<m.jobs.length;i++){const j=m.jobs[i],node=render.createBufferSource();node.buffer=buffers[i];node.connect(render.destination);node.start(cursor/48000,j.slice_start/48000,j.frames/48000);cursor+=j.frames;}
 const output=await render.startRendering();o.scheduled_frames=output.length;o.scheduled=[];
 for(let c=0;c<2;c++){const expected=new Float32Array(length);let at=0;for(const j of m.jobs){expected.set(ref.getChannelData(c).subarray(j.a,j.b),at);at+=j.frames;}o.scheduled.push(cmpFloat(output.getChannelData(c),expected));}
 }catch(e){o.error=String(e)}
 o.offlineOnly=true;o.cleaned=true;ctx=null;return o
}
