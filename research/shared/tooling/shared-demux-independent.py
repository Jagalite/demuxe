# SPDX-License-Identifier: Apache-2.0
import av,io,pathlib,sys,json,hashlib,time,statistics,random,subprocess
out=pathlib.Path(sys.argv[1]);source='results/full-completion/r59/selected-reference.mp4';sha=lambda b:hashlib.sha256(b).hexdigest()
def clone(p,stream,offset):
 q=av.Packet(bytes(p));q.is_keyframe=p.is_keyframe;q.is_corrupt=p.is_corrupt;q.pts=None if p.pts is None else p.pts+int(offset/p.time_base);q.dts=None if p.dts is None else p.dts+int(offset/p.time_base);q.duration=p.duration;q.time_base=p.time_base;q.stream=stream
 for sd in p.iter_sidedata():q.set_sidedata(sd)
 return q
class Consumer:
 def __init__(self,streams,offset):
  self.buf=io.BytesIO();self.out=av.open(self.buf,'w',format='mp4',options={'movflags':'frag_keyframe+delay_moov+default_base_moof'});self.streams={s.index:self.out.add_stream_from_template(s) for s in streams};self.offset=offset;self.count=0;self.closed=False
 def accept(self,p,copy=True):
  if self.closed:raise RuntimeError('consumer closed')
  if copy:q=clone(p,self.streams[p.stream.index],self.offset)
  else:
   q=p;stream=self.streams[p.stream.index];delta=int(self.offset/p.time_base);q.pts=None if q.pts is None else q.pts+delta;q.dts=None if q.dts is None else q.dts+delta;q.stream=stream
  self.out.mux(q);self.count+=1
 def close(self):
  if not self.closed:self.out.close();self.closed=True
  return self.buf.getvalue()
def run(shared,adverse=None,verify=False):
 results=[];demuxed=0;negative={};opened=[]
 try:
  if shared:
   with av.open(source) as src:
    a,b=[Consumer(src.streams,offset) for offset in [0,2]];opened=[a,b];queue=[]
    for p in src.demux():
     if not p.size:continue
     demuxed+=1;before=(p.pts,p.dts,p.duration,p.stream.index,sha(bytes(p))) if verify else None;a.accept(p)
     if adverse=='slow':
      if not b.closed:
       queue.append(p)
       if len(queue)>8:b.close();queue.clear();negative['explicitSlowConsumerFailure']=True
     elif adverse=='cancel' and demuxed>=10:
      if not b.closed:b.close();negative['cancelledAtPacket']=demuxed
     else:b.accept(p)
     if verify:assert before==(p.pts,p.dts,p.duration,p.stream.index,sha(bytes(p))),'source record mutated'
    results=[a.close(),None if adverse else b.close()]
    if adverse:
     try:b.accept(p);raise AssertionError('stale consumer accepted')
     except RuntimeError:negative['staleRejected']=True
  else:
   for offset in [0,2]:
    with av.open(source) as src:
     c=Consumer(src.streams,offset);opened.append(c)
     for p in src.demux():
      if p.size:c.accept(p,copy=False);demuxed+=1
     results.append(c.close())
  return results,demuxed,negative
 finally:
  for c in opened:c.close()
def probe(path):
 d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',str(path)]));return {'packets':[{k:p.get(k) for k in ['stream_index','pts','dts','duration','data_hash','side_data_list','flags']} for p in d['packets']],'streams':[{k:s.get(k) for k in ['codec_name','codec_type','time_base','extradata_hash','sample_rate','channels','width','height']} for s in d['streams']]}
def decode(path,kind):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:'+kind+':0',*(['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo'] if kind=='v' else ['-f','f32le']),'-'])
result={'plan':json.loads((out/'plan.json').read_text()),'runtime':{'pyav':av.__version__,'libraries':{k:list(v) for k,v in av.library_versions.items()}},'controls':{},'rows':[]}
try:
 base,n,_=run(False,verify=True);candidate,m,_=run(True,verify=True);refs=[]
 for i,(a,b) in enumerate(zip(base,candidate)):
  pa=out/f'baseline-{i}.mp4';pb=out/f'candidate-{i}.mp4';pa.write_bytes(a);pb.write_bytes(b);x,y=probe(pa),probe(pb);assert x==y,'packet/config/timing equality';checks=[]
  for kind in ['v','a']:
   aa,bb=decode(pa,kind),decode(pb,kind);assert aa==bb,'decoded output';checks.append({'kind':kind,'bytes':len(aa),'sha256':sha(aa)})
  refs.append({'consumer':i,'offsetSeconds':i*2,'packets':len(x['packets']),'oracle':checks,'packetConfigTimingExact':True})
 result['correctness']=refs;result['demuxPackets']={'baseline':n,'candidate':m}
 for adverse in ['cancel','slow']:
  outputs,count,negative=run(True,adverse,verify=True);assert outputs[0]==base[0] and outputs[1] is None;assert negative['staleRejected'];result['controls'][adverse]=negative
 for pair in range(11):
  row={'pair':pair}
  for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
   start=time.perf_counter();outputs,count,_=run(mode=='candidate');ms=(time.perf_counter()-start)*1000;assert outputs==base;row[mode]={'ms':ms,'demuxPackets':count,'outputBytes':sum(map(len,outputs))}
  result['rows'].append(row)
 vals=[1-r['candidate']['ms']/r['baseline']['ms'] for r in result['rows']];rng=random.Random(334);bs=sorted(statistics.median(rng.choices(vals,k=11)) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(vals),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.05};result['passed']=True
except Exception as e:result['error']=str(e)
finally:(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'analysis':result.get('analysis'),'error':result.get('error')}))
