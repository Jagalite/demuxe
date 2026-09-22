# SPDX-License-Identifier: MIT
from browser_common import *
JS='async arg=>{'+JS_COMMON+r'''
 const out={name:arg.name,frames:[],checks:[],events:[],capture:[],headBytes:arg.head};
 const v=document.createElement('video');v.muted=false;v.volume=1;v.width=192;v.height=112;document.body.append(v);
 const ms=new MediaSource();const url=URL.createObjectURL(ms);let sb,sbs=[],ctx,node,proc,cb;let t0=performance.now(),tail=false,firstAudio=null;
 const pushEv=n=>out.events.push({type:n,wall:performance.now()-t0,time:v.currentTime});
 for(const n of ['playing','waiting','stalled','ended','loadeddata'])v.addEventListener(n,()=>pushEv(n));
 const ranges=()=>Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]);
 const append=async b=>{let w=ev(sb,'updateend',2500);sb.appendBuffer(b);await w;if(v.error)throw Error(v.error.message)};
 let capture=[],samples=0;
 try{
  const open=ev(ms,'sourceopen');v.src=url;await open;if(arg.split){sbs=arg.split.map(x=>ms.addSourceBuffer(x.mime));sb=sbs[0]}else{sb=ms.addSourceBuffer(arg.mime);sbs=[sb]}
  ctx=new AudioContext({sampleRate:48000});await ctx.resume();node=ctx.createMediaElementSource(v);proc=ctx.createScriptProcessor(256,2,2);
  proc.onaudioprocess=e=>{const a=e.inputBuffer.getChannelData(0),b=e.inputBuffer.getChannelData(1);let pk=0;
   for(let i=0;i<a.length;i++)pk=Math.max(pk,Math.abs(a[i]),Math.abs(b[i]));
   if(pk>1e-5 && firstAudio===null)firstAudio={wall:performance.now()-t0,time:v.currentTime,peak:pk,beforeTail:!tail};
   if(samples<240000){capture.push([Array.from(a),Array.from(b)]);samples+=a.length;}
   for(let c=0;c<e.outputBuffer.numberOfChannels;c++)e.outputBuffer.getChannelData(c).fill(0);
  };node.connect(proc);proc.connect(ctx.destination);
  const onframe=(now,m)=>{if(out.frames.length<100)out.frames.push({time:m.mediaTime,beforeTail:!tail,picture:snap(v,v.videoWidth,v.videoHeight)});cb=v.requestVideoFrameCallback(onframe)};
  cb=v.requestVideoFrameCallback(onframe);
  if(arg.split){for(let i=0;i<sbs.length;i++){sb=sbs[i];await append(bytes(arg.split[i].init))}}else await append(bytes(arg.init));
  const data=arg.split?null:bytes(arg.frag);
  t0=performance.now();const full=arg.head===null;
  if(full){tail=true;if(arg.split){for(let i=0;i<sbs.length;i++){sb=sbs[i];await append(bytes(arg.split[i].frag))}}else await append(data);ms.endOfStream();await v.play();}
  else{
   if(arg.split){for(let i=0;i<sbs.length;i++){sb=sbs[i];await append(bytes(arg.split[i].frag).subarray(0,arg.split[i].head))}}else await append(data.subarray(0,arg.head));v.play().catch(e=>out.playError=String(e));
   await nap(500);out.beforeTail={time:v.currentTime,readyState:v.readyState,buffered:ranges(),frameCount:out.frames.length,firstAudio};
   tail=true;if(arg.split){for(let i=0;i<sbs.length;i++){sb=sbs[i];await append(bytes(arg.split[i].frag).subarray(arg.split[i].head))}}else await append(data.subarray(arg.head));ms.endOfStream();
  }
  if(!v.ended)await ev(v,'ended',6500);out.ended=true;out.duration=v.duration;out.buffered=ranges();out.firstAudio=firstAudio;
  proc.disconnect();node.disconnect();v.cancelVideoFrameCallback(cb);
  let raw=new Float32Array(samples*2),p=0;for(const block of capture){for(let i=0;i<block[0].length;i++){raw[p++]=block[0][i];raw[p++]=block[1][i]}}
  let u=new Uint8Array(raw.buffer),str='';for(let i=0;i<u.length;i+=8192)str+=String.fromCharCode(...u.subarray(i,i+8192));out.audio={data:btoa(str),sampleRate:ctx.sampleRate,frames:samples};
  for(const t of [.10,.46,.90,1.50,2.10,2.86,.30])out.checks.push(await seek(v,t));
 }catch(e){out.error=String(e);out.mediaError=v.error?{code:v.error.code,message:v.error.message}:null;out.buffered=ranges()}
 finally{if(proc)proc.disconnect();if(node)node.disconnect();if(ctx)await ctx.close();v.cancelVideoFrameCallback(cb);v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);out.cleaned=true;}
 return out;
}'''
def main():
 m=json.loads((E/'manifest.json').read_text());head=m['layouts']['quarter']['first_three_quarters_prefix_bytes'];out={}
 print('head',head,'init',m['init_bytes'],flush=True)
 with sync_playwright() as p:
  br=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=br.new_page();page.set_content('<!doctype html><body></body>')
  for name,layout,n in [('grouped_full','grouped',None),('interleaved_full','quarter',None),('grouped_partial','grouped',head),('interleaved_partial','quarter',head)]:
   r=page.evaluate(JS,dict(name=name,head=n,mime=m['mime'],init=b64('av.init'),frag=b64(layout+'.m4s')));out[name]=pack_raw(r,name);save('browser_av.json',out)
   print(name,'before',r.get('beforeTail'),'frames',len(r['frames']),'checks',len(r['checks']),'dur',r.get('duration'),'err',r.get('error'),flush=True)
  # Same input against browser whole-file decoder: complete length and every f32 sample.
  decoder=r'''async a=>{const ctx=new OfflineAudioContext(2,1,48000);const results=[];for(const s of a){try{let x=Uint8Array.from(atob(s),c=>c.charCodeAt(0));let b=await ctx.decodeAudioData(x.buffer);let raw=new Float32Array(b.length*b.numberOfChannels);for(let i=0;i<b.length;i++)for(let c=0;c<b.numberOfChannels;c++)raw[i*b.numberOfChannels+c]=b.getChannelData(c)[i];let q=new Uint8Array(raw.buffer),st='';for(let i=0;i<q.length;i+=8192)st+=String.fromCharCode(...q.subarray(i,i+8192));results.push({data:btoa(st),frames:b.length,channels:b.numberOfChannels,rate:b.sampleRate})}catch(e){results.push({error:String(e)})}}return results}'''
  dec=page.evaluate(decoder,[b64(x+'.mp4') for x in ['source','grouped','quarter']]);save('browser_whole_audio.json',pack_raw(dec,'whole_audio'));br.close()
def split_main():
 m=json.loads((E/'manifest.json').read_text());out=json.loads((E/'browser_av_split.json').read_text()) if (E/'browser_av_split.json').exists() else {}
 with sync_playwright() as p:
  br=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);page=br.new_page();page.set_content('<!doctype html><body></body>')
  import sys
  jobs=[('split_full',None),('split_partial',1),('split_video_only_head',1)]
  if '--control-only' in sys.argv:jobs=[('split_video_only_head',1)]
  for name,n in jobs:
   tracks=[dict(x,init=b64(x['init']),frag=b64(x['frag'])) for x in m['split']]
   if name=='split_video_only_head':tracks[1]['head']=0
   r=page.evaluate(JS,dict(name=name,head=n,split=tracks));out[name]=pack_raw(r,name);save('browser_av_split.json',out)
   print(name,'before',r.get('beforeTail'),'frames',len(r['frames']),'checks',len(r['checks']),'duration',r.get('duration'),'error',r.get('error'),flush=True)
  br.close()
if __name__=='__main__':
 import sys
 if '--split' in sys.argv:split_main()
 else:main()
