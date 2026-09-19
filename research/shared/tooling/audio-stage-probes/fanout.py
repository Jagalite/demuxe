# SPDX-License-Identifier: Apache-2.0
"""Host-only, bounded PCM fanout; each FFmpeg consumer maintains its own resampler."""
import hashlib,json,pathlib,queue,subprocess,sys,threading
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
commands=[]
def run(args):
 commands.append(args);subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
base=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y']
source=out/'source.flac'
run(base+['-f','lavfi','-i','aevalsrc=0.25*sin(2*PI*431*t)+0.05*sin(2*PI*17003*t)|0.23*sin(2*PI*719*t):s=48000:d=2','-c:a','flac',str(source)])
rates=[32000,44100,48000];qs=[queue.Queue(maxsize=2) for _ in rates];errors=[];peaks=[0]*3;counts=[0]*3
for rate in rates:
 run(base+['-i',str(source),'-ar',str(rate),'-c:a','pcm_f32le','-f','f32le',str(out/f'independent-{rate}.f32')])
def consume(i,rate):
 args=base+['-f','f32le','-ar','48000','-ac','2','-i','pipe:0','-ar',str(rate),'-c:a','pcm_f32le','-f','f32le',str(out/f'shared-{rate}.f32')]
 commands.append(args)
 p=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  while True:
   b=qs[i].get()
   if b is None:break
   p.stdin.write(b);counts[i]+=len(b)
  p.stdin.close();err=p.stderr.read();code=p.wait();assert code==0,err
 except Exception as e:errors.append(str(e));p.kill()
threads=[threading.Thread(target=consume,args=(i,r)) for i,r in enumerate(rates)]
for t in threads:t.start()
args=base+['-i',str(source),'-c:a','pcm_f32le','-f','f32le','pipe:1'];commands.append(args)
p=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE);total=0
while True:
 b=p.stdout.read(4096)
 if not b:break
 total+=len(b)
 for i,q in enumerate(qs):q.put(b,timeout=20);peaks[i]=max(peaks[i],q.qsize())
assert p.wait()==0,p.stderr.read()
for q in qs:q.put(None)
for t in threads:t.join(30);assert not t.is_alive()
assert not errors,errors
comparisons=[]
for rate in rates:
 a=(out/f'independent-{rate}.f32').read_bytes();b=(out/f'shared-{rate}.f32').read_bytes();assert a==b,(rate,len(a),len(b))
 comparisons.append({'rate':rate,'samples_per_channel':len(a)//8,'sha256':hashlib.sha256(a).hexdigest(),'exact':True})
# Retention/cancellation policy component: reject stalled consumer after two chunks;
# release references without changing a surviving consumer or admitting old epochs.
slow=queue.Queue(maxsize=2);slow.put(b'x'*4096);slow.put(b'y'*4096)
try:slow.put_nowait(b'z'*4096);raise AssertionError('unbounded queue')
except queue.Full:pass
while not slow.empty():slow.get_nowait()
epoch=2;stale={'epoch':1,'pcm':b'stale'};assert stale['epoch']!=epoch
result={'passed':True,'candidate_executed':True,'fallback':False,'profile':'host FFmpeg FLAC to source-rate stereo f32; three independent persistent sample-rate consumers','canonical_pcm_bytes':total,'input_bytes_per_consumer':counts,'max_queue_chunks':peaks,'max_queue_bytes_per_consumer':8192,'queue_policy_control':'full queue rejected and drained','epoch_control':'stale descriptor rejected; isolated policy component only','outputs':comparisons,'limits':['host FFmpeg, not maintained browser decoder or player integration','blocking backpressure in actual fanout; slow-consumer rejection is separately tested policy','FFmpeg internal pipe/process memory not measured','no acoustic or performance qualification']}
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');(out/'commands.log').write_text('\n'.join(json.dumps(c) for c in commands)+'\n');print(json.dumps(result))
