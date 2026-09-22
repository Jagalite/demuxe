# SPDX-License-Identifier: MIT
from common import *
import base64
from playwright.sync_api import sync_playwright

def b64(n):return base64.b64encode((F/n).read_bytes()).decode()
def pack_raw(result,prefix):
 # Preserve full raw byte evidence externally, report reproducible hashes.
 counter=0
 def visit(x):
  nonlocal counter
  if isinstance(x,dict):
   if 'data' in x and isinstance(x['data'],str):
    raw=base64.b64decode(x.pop('data'));suffix='f32' if isinstance(x.get('frames'),int) and ('sampleRate' in x or 'rate' in x) else 'rgba';fn=f'{prefix}_{counter:04}.{suffix}';counter+=1;(E/fn).write_bytes(raw);x.update(file=fn,sha256=sha(raw),bytes=len(raw))
   for v in list(x.values()):visit(v)
  elif isinstance(x,list):
   for v in x:visit(v)
 visit(result);return result
JS_COMMON=r'''
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const ev=(obj,type,ms=2000)=>new Promise((resolve,reject)=>{
 const clean=()=>{clearTimeout(timer);obj.removeEventListener(type,ok);obj.removeEventListener('error',bad)};
 const ok=()=>{clean();resolve()};const bad=()=>{clean();reject(Error('error waiting for '+type))};
 const timer=setTimeout(()=>{clean();reject(Error(type+' timeout'))},ms);obj.addEventListener(type,ok,{once:true});obj.addEventListener('error',bad,{once:true});
});
const snap=(image,w,h,bg=null)=>{
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
 if(bg!==null){g.fillStyle=bg;g.fillRect(0,0,w,h)}
 g.drawImage(image,0,0,w,h);const data=g.getImageData(0,0,w,h).data;let b='';for(let i=0;i<data.length;i+=8192)b+=String.fromCharCode(...data.subarray(i,i+8192));return {width:w,height:h,data:btoa(b)};
};
const seek=async(v,t)=>{
 let id;const frame=new Promise(r=>id=v.requestVideoFrameCallback((n,m)=>r({mediaTime:m.mediaTime,width:m.width,height:m.height})));
 const ended=ev(v,'seeked',2300);v.currentTime=t;await ended;
 const f=await Promise.race([frame,nap(500).then(()=>null)]);if(!f)v.cancelVideoFrameCallback(id);
 return {request:t,frame:f,currentTime:v.currentTime,picture:snap(v,v.videoWidth,v.videoHeight)};
};
const same=(a,b)=>{let n=0,m=0;const x=bytes(a.data),y=bytes(b.data);if(x.length!==y.length)return{equal:false,differing:-1,max:-1};for(let i=0;i<x.length;i++){let d=Math.abs(x[i]-y[i]);if(d){n++;m=Math.max(m,d)}}return{equal:n===0,differing:n,max:m}};
'''
