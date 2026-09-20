# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,struct,bisect,time,statistics,sys,random
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T211800Z-timing-cost';r.mkdir(exist_ok=False)
plan=dict(workload='Actual96sample signed-CTTS MP4. Each fresh job parse timing tables then eight ordinal queries20,3,21,3,95,0,48,71. Eleven alternating pairs of200jobs, no source cache/index retained acrossjobs; resident source read common. Full96-query oracle before timing.',metric='Median paired latency saving at least5percent and measured retained Python object graph bytes at least10percent lower; source bytes common excluded. Include parse/preparation/index creation and queries. No FFmpeg memory integration or whole-player claim.',uncertainty='All eleven paired measurements plus deterministic bootstrap95percent median interval10000draws. Python component local costs only.')
(r/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');source=h/'evidence/20260919T200000Z-signed-timing-origins/source.mp4';b=source.read_bytes()
def parse():
 found={}
 def walk(a,z):
  while a<z:
   n,t=struct.unpack('>I4s',b[a:a+8]);e=a+n
   if n<8 or e>z:raise ValueError('bounds')
   if t in [b'moov',b'trak',b'mdia',b'minf',b'stbl']:walk(a+8,e)
   if t in [b'stts',b'ctts']:
    p=a+8;num=int.from_bytes(b[p+4:p+8],'big');rows=[];ordinal=clock=0
    if p+8+num*8!=e:raise ValueError('run bounds')
    for i in range(num):
     count,value=struct.unpack('>Ii' if t==b'ctts' and b[p]==1 else '>II',b[p+8+i*8:p+16+i*8]);rows.append((ordinal,clock,count,value));ordinal+=count;clock+=count*value
    found[t]=rows
   a=e
 walk(0,len(b));return found[b'stts'],found[b'ctts']
def prepare(kind):
 st,ct=parse();n=sum(x[2] for x in st)
 if kind=='candidate':return(st,ct,[x[0] for x in st],[x[0] for x in ct],n)
 # Sequential baseline expands each run once, no redundant binary searches.
 dur=[x[3] for x in st for _ in range(x[2])];cto=[x[3] for x in ct for _ in range(x[2])];out=[];clock=0
 for d,c in zip(dur,cto):out.append((clock,d,c));clock+=d
 return out
def query(kind,state,i):
 n=state[4] if kind=='candidate' else len(state)
 if not 0<=i<n:raise ValueError('ordinal')
 if kind=='baseline':return state[i]
 st,ct,ss,cs,_=state;s,clock,count,d=st[bisect.bisect_right(ss,i)-1];c=ct[bisect.bisect_right(cs,i)-1][3];return clock+(i-s)*d,d,c
packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(source)]))['packets'];checks={}
for kind in ['baseline','candidate']:
 state=prepare(kind);queries=[query(kind,state,i) for i in range(96)];shift=packets[0]['dts'];pshift=packets[0]['pts']-queries[0][2]
 assert all((d+shift,dur,d+c+pshift)==(p['dts'],p['duration'],p['pts']) for (d,dur,c),p in zip(queries,packets));checks[kind]=True
 for i in [-1,96]:
  try:query(kind,state,i);raise AssertionError('range')
  except ValueError:pass
 assert any(c<0 for _,_,c in queries)
def size(o,seen=None):
 seen=set() if seen is None else seen
 if id(o) in seen:return 0
 seen.add(id(o));return sys.getsizeof(o)+sum(size(v,seen) for v in o) if isinstance(o,(list,tuple)) else sys.getsizeof(o)
retained={k:size(prepare(k)) for k in ['baseline','candidate']};rows=[]
for pair in range(11):
 row={}
 for kind in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  start=time.perf_counter_ns()
  for rep in range(200):
   state=prepare(kind);got=[query(kind,state,i) for i in [20,3,21,3,95,0,48,71]]
  row[kind]=(time.perf_counter_ns()-start)/200
 row['saving']=1-row['candidate']/row['baseline'];rows.append(row)
savings=[x['saving'] for x in rows];random.seed(297);boot=sorted(statistics.median(random.choices(savings,k=11)) for _ in range(10000));median=statistics.median(savings);memory=1-retained['candidate']/retained['baseline'];result=dict(correctness=checks,samples=96,raw_nanoseconds_per_complete_job=rows,retainedPythonGraphBytes=retained,retainedSaving=memory,medianSaving=median,bootstrap95Median=[boot[250],boot[9749]],thresholds=dict(latency=.05,retention=.10),passed=median>=.05 and memory>=.10,source=str(source),limits='Actual source only; excludes shared input bytes, host FFprobe setup and file acquisition; no claimed Wasm/native FFmpeg allocation change.')
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
