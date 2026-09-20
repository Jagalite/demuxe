# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,subprocess,hashlib,time,statistics,random
r=Path(sys.argv[1]);w,h=256,144;size=w*h*3//2;src=bytearray()
for n in range(60):
 y=bytearray([80])*(w*h)
 for yy in range(64,80):y[yy*w+n*3:yy*w+n*3+16]=bytes([210])*16
 src.extend(y+bytes([128])*(w*h//2))
(r/'input.yuv').write_bytes(src)
commands=[['ffmpeg','-v','error','-f','rawvideo','-pixel_format','yuv420p','-video_size','256x144','-framerate','30','-i',str(r/'input.yuv'),'-c:v','mpeg2video','-q:v','2','-g','12','-bf','2',str(r/'source.mpg')],['ffmpeg','-v','error','-i',str(r/'source.mpg'),'-f','rawvideo','-pix_fmt','yuv420p',str(r/'decoded.yuv')]]
for cmd in commands:subprocess.run(cmd,check=True)
raw=(r/'decoded.yuv').read_bytes();assert len(raw)==60*size;frames=[memoryview(raw)[i*size:(i+1)*size] for i in range(60)];oracles=[hashlib.sha256(f).hexdigest() for f in frames];geometry=[(0,w,h,16),(w*h,w//2,h//2,8),(w*h*5//4,w//2,h//2,8)]
class Tiles:
 def __init__(self):self.frames=[]
 def push(self,raw):
  blocks=[];prev=self.frames[-1] if self.frames else None;k=0
  for offset,pw,ph,t in geometry:
   for y in range(0,ph,t):
    for x in range(0,pw,t):
     b=b''.join(raw[offset+(y+yy)*pw+x:offset+(y+yy)*pw+x+t] for yy in range(t));blocks.append(prev[k] if prev and b==prev[k] else b);k+=1
  self.frames.append(tuple(blocks));self.frames=self.frames[-3:]
 def flatten(self,f=None):
  f=self.frames[-1] if f is None else f;output=[];k=0
  for offset,pw,ph,t in geometry:
   for y in range(0,ph,t):
    row=f[k:k+pw//t];k+=pw//t
    for yy in range(t):output.append(b''.join(b[yy*t:(yy+1)*t] for b in row))
  return b''.join(output)
 def heap(self):
  unique={id(b):b for f in self.frames for b in f};return sys.getsizeof(self.frames)+sum(sys.getsizeof(f) for f in self.frames)+sum(sys.getsizeof(b) for b in unique.values())
 def clear(self):self.frames.clear()
c=Tiles()
for f,expected in zip(frames,oracles):c.push(f);assert hashlib.sha256(c.flatten()).hexdigest()==expected and len(c.frames)<=3
heap=c.heap();old=c.frames[-1];before=c.flatten(old);tile=bytes([old[0][0]^1])+old[0][1:];edited=(tile,)+old[1:];after=c.flatten(edited);assert c.flatten(old)==before and after==bytes([before[0]^1])+before[1:];c.clear();assert not c.frames
rng=random.Random(152);noisy=bytes(rng.randrange(256) for _ in range(size));c.push(memoryview(noisy));assert c.flatten()==noisy;noiseheap=c.heap();c.clear();assert not c.frames
pairs=[]
def task(candidate):
 start=time.perf_counter();owner=Tiles() if candidate else []
 for f,oracle in zip(frames,oracles):
  if candidate:owner.push(f);output=owner.flatten()
  else:owner.append(bytes(f));owner=owner[-3:];output=owner[-1]
  assert hashlib.sha256(output).hexdigest()==oracle
 owned=owner.heap() if candidate else sys.getsizeof(owner)+sum(sys.getsizeof(b) for b in owner)
 owner.clear();return (time.perf_counter()-start)*1000,owned
for i in range(9):
 if i%2:b,bh=task(True);a,ah=task(False)
 else:a,ah=task(False);b,bh=task(True)
 pairs.append({'baseline_ms':a,'candidate_ms':b,'baseline_owned_heap':ah,'candidate_owned_heap':bh})
a=statistics.mean(p['baseline_ms'] for p in pairs);b=statistics.mean(p['candidate_ms'] for p in pairs);rng=random.Random(152);boot=[]
for _ in range(10000):
 ss=rng.choices(pairs,k=9);boot.append(100*(sum(p['candidate_ms'] for p in ss)/sum(p['baseline_ms'] for p in ss)-1))
boot.sort();reduction=100*(1-bh/ah);result={'correctness':True,'frames':60,'full_frame_sha256':oracles,'cow_edit_preserves_previous':True,'eviction_max_frames':3,'source_clear_and_noise_exact':True,'all_owners_cleared':True,'baseline_owned_heap_bytes':ah,'candidate_owned_heap_bytes':bh,'owned_heap_reduction_percent':reduction,'incompressible_one_frame_heap':noiseheap,'raw_one_frame_heap':sys.getsizeof(noisy),'pairs':pairs,'baseline_mean_ms':a,'candidate_mean_ms':b,'cost_regression_percent':100*(b/a-1),'regression_bootstrap95':[boot[250],boot[9749]],'performance_passed':reduction>=25 and boot[9749]<=10,'decoder_internal_savings_claim':False};(r/'results.json').write_text(json.dumps(result,indent=2));(r/'commands.json').write_text(json.dumps(commands,indent=2));print({k:result[k] for k in ['owned_heap_reduction_percent','baseline_mean_ms','candidate_mean_ms','cost_regression_percent','regression_bootstrap95','performance_passed']})
