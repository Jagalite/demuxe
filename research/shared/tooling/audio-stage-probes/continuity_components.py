# SPDX-License-Identifier: Apache-2.0
import math,struct,hashlib,json,pathlib,sys,time,statistics,random
out=pathlib.Path(sys.argv[1]);N=48000;x=[.3*math.sin(2*math.pi*(431*i/48000+270*(i/48000)**2))+(0.8 if i in [0,12345,47999] else 0) for i in range(N)]
def packed(xs):return struct.pack('<'+'d'*len(xs),*xs)
def bank(rate):
 g=math.gcd(48000,rate);up=rate//g;down=48000//g;cut=.45*min(1,rate/48000);table=[]
 for phase in range(up):
  frac=phase/up;w=[]
  for k in range(-8,9):
   t=k-frac;s=2*cut if t==0 else math.sin(2*math.pi*cut*t)/(math.pi*t);w.append(s*(.5+.5*math.cos(math.pi*t/9)))
  total=sum(w);table.append([v/total for v in w])
 return up,down,table
# Oracle uses absolute source addressing over entire immutable source.
def continuous(rate,B):
 up,down,table=B;ys=[]
 for j in range(N*rate//48000):
  at,phase=divmod(j*down,up);v=0.
  for k,w in zip(range(-8,9),table[phase]):
   i=at+k;v+=(x[i] if 0<=i<N else 0.)*w
  ys.append(v)
 return ys
# Job sees only its copied finite halo and global output interval.
def job(a,b,B,reset=False,nohalo=False):
 up,down,table=B
 if a==b:return []
 lo=max(0,a*down//up-(0 if nohalo else 8));hi=min(N,(b-1)*down//up+9);local=x[lo:hi];ys=[]
 for j in range(a,b):
  at,phase=divmod(j*down,up)
  if reset:phase=((j-a)*down)%up
  v=0.
  for k,w in zip(range(-8,9),table[phase]):
   ii=at+k-lo;v+=(local[ii] if 0<=ii<len(local) else 0.)*w
  ys.append(v)
 return ys
res=[]
for rate in [44100,32000]:
 t=time.perf_counter();B=bank(rate);setup=time.perf_counter()-t;ref=continuous(rate,B);ends=[0];rng=random.Random(233)
 while ends[-1]<len(ref):ends.append(min(len(ref),ends[-1]+rng.randint(1,1301)))
 def chunks():return [v for a,b in zip(ends,ends[1:]) for v in job(a,b,B)]
 got=chunks();assert packed(got)==packed(ref);assert job(1,1,B)==[]
 randomRanges=[]
 for _ in range(20):
  a=rng.randrange(len(ref)-128);b=a+128;exact=packed(job(a,b,B))==packed(ref[a:b]);assert exact;randomRanges.append({'start':a,'end':b,'exact':exact})
 wrongPhase=any(job(a,b,B,reset=True)!=ref[a:b] for a,b in zip(ends,ends[1:])) if B[0]>1 else None;wrongHalo=any(job(a,b,B,nohalo=True)!=ref[a:b] for a,b in zip(ends,ends[1:]));assert wrongHalo and (wrongPhase is True or B[0]==1)
 rows=[]
 for pair in range(-1,5):
  for mode in (['candidate','baseline'] if pair%2 else ['baseline','candidate']):
   t=time.perf_counter();ys=chunks() if mode=='candidate' else continuous(rate,B);wall=time.perf_counter()-t;assert packed(ys)==packed(ref);rows.append({'pair':pair,'mode':mode,'wallSeconds':wall})
 bm=statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['mode']=='baseline');cm=statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['mode']=='candidate');res.append({'rate':rate,'samples':len(ref),'jobCount':len(ends)-1,'partition':ends,'randomRanges':randomRanges,'pcmSHA256':hashlib.sha256(packed(ref)).hexdigest(),'correctnessPassed':True,'wrongPhaseDetected':wrongPhase,'missingHaloDetected':wrongHalo,'rows':rows,'bankSeconds':setup,'baselineMedianSeconds':bm,'candidateMedianSeconds':cm,'ratio':cm/bm,'coldRatio':(cm+setup)/(bm+setup),'performancePassed':cm<=1.2*bm})
# IIR independent continuous oracle, written separately from query executor.
coef=(.06745527,.13491054,.06745527,-1.1429805,.4128016);b0,b1,b2,a1,a2=coef;oracle=[];s1=s2=0.
for v in x:
 y=b0*v+s1;s1=b1*v-a1*y+s2;s2=b2*v-a2*y;oracle.append(y)
identity={'source':hashlib.sha256(packed(x)).hexdigest(),'coefficients':coef,'precision':'IEEE754binary64','order':'DFII-transposed b0*x+z1; b1*x-a1*y+z2; b2*x-a2*y','denormal':'Python host preserved, no explicit flushing'};key=hashlib.sha256(json.dumps(identity,sort_keys=True).encode()).hexdigest()
def step(v,state):
 z1,z2=state;y=coef[0]*v+z1;return y,(coef[1]*v-coef[3]*y+z2,coef[2]*v-coef[4]*y)
def build():
 cache={};state=(0.,0.)
 for i,v in enumerate(x):
  if i%1024==0:cache[i]=state
  _,state=step(v,state)
 return {'key':key,'states':cache,'open':True}
def query(a,b,c=None,k=key):
 if c is None:at=0;state=(0.,0.)
 else:
  if not c['open'] or c['key']!=k:raise ValueError('closed or incompatible checkpoint')
  at=(a//1024)*1024;state=c['states'][at]
 result=[];count=0
 for i in range(at,b):
  y,state=step(x[i],state);count+=1
  if i>=a:result.append(y)
 return result,count
rng=random.Random(321);queries=[(0,64),(1,65),(1023,1087),(1024,1088),(N-64,N)]+[(a,a+64) for a in [rng.randrange(N-64) for _ in range(75)]];cache=build()
for a,b in queries:assert packed(query(a,b,cache)[0])==packed(oracle[a:b]) and packed(query(a,b)[0])==packed(oracle[a:b])
wrong=build();wrong['states'][12288]=(0.,0.);assert query(12345,12409,wrong)[0]!=oracle[12345:12409];keyRejected=False
try:query(1,65,cache,'changed coefficients')
except ValueError:keyRejected=True
cache['open']=False;closedRejected=False
try:query(1,65,cache)
except ValueError:closedRejected=True
assert keyRejected and closedRejected
rows=[]
for pair in range(-1,5):
 for mode in (['candidate','baseline'] if pair%2 else ['baseline','candidate']):
  t=time.perf_counter();c=build() if mode=='candidate' else None;count=N if c else 0;outputs=[]
  for a,b in queries:y,n=query(a,b,c);outputs.append(y);count+=n
  if c:c['states'].clear();c['open']=False
  wall=time.perf_counter()-t
  for (a,b),y in zip(queries,outputs):assert packed(y)==packed(oracle[a:b])
  rows.append({'pair':pair,'mode':mode,'wallSeconds':wall,'processedSamplesIncludingBuild':count})
bm=statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['mode']=='baseline');cm=statistics.median(r['wallSeconds'] for r in rows if r['pair']>=0 and r['mode']=='candidate');iir={'correctnessPassed':True,'queries':queries,'rows':rows,'identity':identity,'checkpointPayloadBytes':len(build()['states'])*16,'wrongStateDetected':True,'incompatibleKeyRejected':keyRejected,'closedHandleRejected':closedRejected,'baselineMedianSeconds':bm,'candidateMedianSeconds':cm,'ratio':cm/bm,'performancePassed':cm<=.8*bm,'scope':'Exact same scalar recurrence and coefficient profile only; cache payload excludes Python object overhead'};d={'resampler':res,'iir':iir};(out/'results.json').write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({'resampler':[{k:v for k,v in r.items() if k in ['rate','ratio','correctnessPassed','performancePassed']} for r in res],'iir':{k:v for k,v in iir.items() if k in ['ratio','correctnessPassed','performancePassed']}}))
