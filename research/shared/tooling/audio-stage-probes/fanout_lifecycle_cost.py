# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,threading,queue,json,time,sys,statistics,hashlib
out=pathlib.Path(sys.argv[1]);commands=[];base=['ffmpeg','-nostdin','-v','error','-y'];rates=[32000,44100,48000]
def pop(args,**kw):
 commands.append(args);return subprocess.Popen(args,stderr=subprocess.PIPE,**kw)
def independent(source,tag):
 ps=[]
 for r in rates:
  p=pop(base+['-i',str(source),'-ar',str(r),'-c:a','pcm_f32le','-f','f32le',str(out/f'{tag}-{r}.f32')],stdout=subprocess.DEVNULL);ps.append(p)
 for p in ps:assert p.wait()==0,p.stderr.read()
def shared(source,tag,epoch=1,stopafter=None,slow=False,stale=False):
 qs=[queue.Queue(maxsize=2) for _ in rates];cancel=[threading.Event() for _ in rates];ps=[];threads=[];errors=[];peaks=[0]*3;counts=[0]*3;dropped=[];staleRejected=False
 for i,r in enumerate(rates):
  ps.append(pop(base+['-f','f32le','-ar','48000','-ac','2','-i','pipe:0','-ar',str(r),'-c:a','pcm_f32le','-f','f32le',str(out/f'{tag}-{r}.f32')],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL))
 def worker(i):
  p=ps[i]
  try:
   if slow and i==2:cancel[i].wait(2)
   while not cancel[i].is_set():
    try:b=qs[i].get(timeout=.1)
    except queue.Empty:continue
    if b is None:break
    p.stdin.write(b);counts[i]+=len(b)
   p.stdin.close();code=p.wait();err=p.stderr.read()
   if code and not cancel[i].is_set():raise RuntimeError(err.decode())
  except Exception as e:
   if not cancel[i].is_set():errors.append(str(e))
  finally:
   if p.poll() is None:p.terminate();p.wait()
   while not qs[i].empty():qs[i].get_nowait()
 def publish(b,sourceepoch):
  if sourceepoch!=epoch:return False
  for i,q in enumerate(qs):
   if cancel[i].is_set():continue
   try:q.put(b,timeout=.05 if slow and i==2 else 10);peaks[i]=max(peaks[i],q.qsize())
   except queue.Full:cancel[i].set();ps[i].terminate();dropped.append(i)
  return True
 for i in range(3):
  t=threading.Thread(target=worker,args=(i,));t.start();threads.append(t)
 if stale:staleRejected=publish(b'\x7f'*4096,epoch-1) is False and all(q.empty() for q in qs)
 decoder=pop(base+['-i',str(source),'-c:a','pcm_f32le','-f','f32le','pipe:1'],stdout=subprocess.PIPE);chunks=0
 while True:
  b=decoder.stdout.read(4096)
  if not b:break
  assert publish(b,epoch);chunks+=1
  if stopafter and chunks>=stopafter:decoder.terminate();break
 decoder.stdout.close();decoder.wait();decoder.stderr.read()
 for i,q in enumerate(qs):
  if not cancel[i].is_set():q.put(None,timeout=10)
 for t in threads:t.join(20);assert not t.is_alive()
 assert not errors,errors
 return {'peakQueueChunks':peaks,'inputBytes':counts,'droppedConsumers':dropped,'stalePublishRejected':staleRejected,'ownedProcessesReaped':all(p.poll() is not None for p in ps+[decoder]),'threadsJoined':True,'sourceStoppedEarly':bool(stopafter),'chunks':chunks}
def same(a,b,rs=rates):
 rows=[]
 for r in rs:
  x=(out/f'{a}-{r}.f32').read_bytes();y=(out/f'{b}-{r}.f32').read_bytes();assert x==y,(a,b,r,len(x),len(y));rows.append({'rate':r,'bytes':len(x),'exact':True,'sha256':hashlib.sha256(x).hexdigest()})
 return rows
s1=pathlib.Path('research/shared/runs/20260919T_audio_fanout/source.flac');s2=out/'source2.flac';p=pop(base+['-f','lavfi','-i','aevalsrc=0.21*sin(2*PI*997*t)|0.17*sin(2*PI*1301*t):s=48000:d=2','-c:a','flac',str(s2)],stdout=subprocess.DEVNULL);assert p.wait()==0
independent(s1,'ref1');independent(s2,'ref2');normal=shared(s1,'normal');normal['outputs']=same('ref1','normal');slow=shared(s1,'slow',slow=True);slow['survivors']=same('ref1','slow',[32000,44100]);assert slow['droppedConsumers']==[2];old=shared(s1,'old',stopafter=12);new=shared(s2,'new',epoch=2,stale=True);new['outputs']=same('ref2','new');assert new['stalePublishRejected'];wrongSource=(out/'ref1-48000.f32').read_bytes()!=(out/'ref2-48000.f32').read_bytes();assert wrongSource
rows=[]
for pair in range(-1,5):
 for mode in (['candidate','baseline'] if pair%2 else ['baseline','candidate']):
  tag=f'{pair}-{mode}';t=time.perf_counter();detail=shared(s1,tag) if mode=='candidate' else independent(s1,tag);wall=time.perf_counter()-t;same('ref1',tag);rows.append({'pair':pair,'mode':mode,'wallSeconds':wall,'detail':detail})
b=statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['mode']=='baseline');c=statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['mode']=='candidate');d={'correctnessPassed':True,'lifecycle':{'normal':normal,'slow':slow,'source1Cancelled':old,'source2':new,'wrongSourceControlDetected':wrongSource},'rows':rows,'baselineMedianSeconds':b,'candidateMedianSeconds':c,'ratio':c/b,'performancePassed':c<=.9*b,'maxQueueBytesPerConsumer':8192};(out/'results.json').write_text(json.dumps(d,indent=2)+'\n');(out/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print(json.dumps({k:v for k,v in d.items() if k not in ['rows','lifecycle']}))
