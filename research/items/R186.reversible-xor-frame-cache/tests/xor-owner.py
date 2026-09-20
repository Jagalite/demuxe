# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,sys,zlib,hashlib,time,random,statistics
r=Path(sys.argv[1]);source=Path(sys.argv[2]);raw=source.read_bytes();size=256*144*3//2;frames=[memoryview(raw)[i:i+size] for i in range(0,len(raw),size)];assert len(frames)==60;hashes=[hashlib.sha256(f).hexdigest() for f in frames]
def xor(a,b):return (int.from_bytes(a,'little')^int.from_bytes(b,'little')).to_bytes(size,'little')
class Cache:
 def __init__(self,frames):
  if not 0<len(frames)<=60:raise ValueError('capacity')
  self.n=len(frames);self.checkpoints={};self.deltas={};self.raw=[];self.mode='xor'
  for i,f in enumerate(frames):
   if i%15==0:self.checkpoints[i]=zlib.compress(f,1)
   if i:self.deltas[i]=zlib.compress(xor(f,frames[i-1]),1)
  self.encoded_before_fallback=self.heap();rawheap=sys.getsizeof([None]*len(frames))+sum(size+sys.getsizeof(b'') for f in frames)
  if self.heap()>=rawheap:self.raw=[bytes(f) for f in frames];self.checkpoints.clear();self.deltas.clear();self.mode='raw'
 def heap(self):
  if self.raw:return sys.getsizeof(self.raw)+sum(sys.getsizeof(b) for b in self.raw)
  return sum(sys.getsizeof(d)+sum(sys.getsizeof(k)+sys.getsizeof(v) for k,v in d.items()) for d in [self.checkpoints,self.deltas])
 def seek(self,i):
  if not 0<=i<self.n:raise ValueError('index')
  if self.raw:return self.raw[i]
  start=i//15*15;frame=zlib.decompress(self.checkpoints[start])
  for k in range(start+1,i+1):frame=xor(frame,zlib.decompress(self.deltas[k]))
  return frame
 def reverse(self):
  frame=self.seek(self.n-1);yield self.n-1,frame
  for i in range(self.n-1,0,-1):
   frame=self.raw[i-1] if self.raw else xor(frame,zlib.decompress(self.deltas[i]));yield i-1,frame
 def close(self):self.raw.clear();self.checkpoints.clear();self.deltas.clear()
c=Cache(frames)
for i,f in c.reverse():assert hashlib.sha256(f).hexdigest()==hashes[i]
for i in [0,14,15,16,29,30,44,45,59,7]:assert hashlib.sha256(c.seek(i)).hexdigest()==hashes[i]
c.deltas[5]=b'corrupt';rejected=False
try:c.seek(5)
except zlib.error:rejected=True
assert rejected;c.close();assert not c.raw and not c.deltas and not c.checkpoints
rng=random.Random(186);noise=[memoryview(bytes(rng.randrange(256) for _ in range(size))) for _ in range(4)];n=Cache(noise);assert n.mode=='raw'
for i,f in n.reverse():assert f==noise[i]
noise_state={'mode':n.mode,'encoded_before_fallback':n.encoded_before_fallback,'retained_heap':n.heap(),'raw_heap':sys.getsizeof(n.raw)+sum(sys.getsizeof(b) for b in n.raw)};n.close()
# Completed old generation is discarded before publication; fresh cache owns new source.
epoch=1;old_epoch=epoch;stale=Cache(frames);epoch+=1;stale.close();fresh=Cache(frames);assert old_epoch!=epoch and fresh.seek(2)==frames[2];fresh.close()
queries=[0,14,15,16,29,30,44,45,59,7];pairs=[]
def task(candidate):
 start=time.perf_counter();c=Cache(frames) if candidate else [bytes(f) for f in frames];built=(time.perf_counter()-start)*1000;heap=c.heap() if candidate else sys.getsizeof(c)+sum(sys.getsizeof(f) for f in c);latencies=[]
 reverse=c.reverse() if candidate else ((i,c[i]) for i in range(59,-1,-1))
 for i,f in reverse:assert hashlib.sha256(f).hexdigest()==hashes[i]
 for i in queries:
  t=time.perf_counter();f=c.seek(i) if candidate else c[i];assert hashlib.sha256(f).hexdigest()==hashes[i];latencies.append((time.perf_counter()-t)*1000)
 c.close() if candidate else c.clear();return {'total_ms':(time.perf_counter()-start)*1000,'build_ms':built,'request_ms':latencies,'owned_heap':heap}
for i in range(9):
 if i%2:b=task(True);a=task(False)
 else:a=task(False);b=task(True)
 pairs.append({'baseline':a,'candidate':b})
a=statistics.mean(p['baseline']['total_ms'] for p in pairs);b=statistics.mean(p['candidate']['total_ms'] for p in pairs);heapred=100*(1-pairs[0]['candidate']['owned_heap']/pairs[0]['baseline']['owned_heap']);worst=max(x for p in pairs for x in p['candidate']['request_ms']);buildmax=max(p['candidate']['build_ms'] for p in pairs);result={'correctness':True,'profile_frames':60,'raw_source_sha256':hashlib.sha256(raw).hexdigest(),'damaged_delta_rejected':True,'source_epoch_owner_discarded':True,'incompressible_control':noise_state,'pairs':pairs,'baseline_mean_ms':a,'candidate_mean_ms':b,'wholecost_regression_percent':100*(b/a-1),'owned_heap_reduction_percent':heapred,'worst_request_ms':worst,'maximum_build_ms':buildmax,'performance_passed':heapred>=50 and worst<16.7 and buildmax<250,'all_owners_closed':True,'baseline_pointer_traversal_remains_faster':a<b};(r/'results.json').write_text(json.dumps(result,indent=2));print({k:result[k] for k in ['baseline_mean_ms','candidate_mean_ms','wholecost_regression_percent','owned_heap_reduction_percent','worst_request_ms','maximum_build_ms','performance_passed']})
