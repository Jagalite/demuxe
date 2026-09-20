# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,math,random,time,statistics,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);B=128;A=.98;EPS=1e-12
(p/'protocol.json').write_text(json.dumps({'scope':'Controlled scalar stable binary64 recurrence y=a*y+(1-a)*x, a=.98, blocks128,96000source samples. Cache affine block and prefix state maps;35reordered100-block edit-plan end states and300seek states must produce128actual subsequent output samples. Explicit abs tolerance1e-12, not bitwise identity.','baseline':'Cold full-source exact recurrence checkpoints for ordinary seeks; actual sample replay through reordered plans. Candidate charges full affine cache construction and source read/hash. Both render identical continuation128samples after every state query.','performance':'Five alternating complete cold fixture read/hash/cache preparation,35plan and300seek requests with output. Candidate<=0.9baseline; cache serialized double payload separate from total process memory.','controls':'Wrong source, filter coefficient, invalid offset/cancellation reject; reversed transform composition must change output. No production filter-state interface assumed.'},indent=2))
rng=random.Random(191);xs=[.3*math.sin(i*.07)+rng.uniform(-.2,.2)for i in range(96000)];source=p/'source.json';source.write_text(json.dumps(xs));identity=hashlib.sha256(source.read_bytes()).hexdigest();plans=[[rng.randrange(len(xs)//B)for _ in range(100)]for _ in range(35)];seeks=[rng.randrange(len(xs)-B)for _ in range(300)];continuation=[.2*math.sin(i*.031)for i in range(B)]
def filter_samples(samples,state=0,a=A):
 out=[]
 for x in samples:state=a*state+(1-a)*x;out.append(state)
 return state,out
def job(candidate,claimed=identity,a=A,cancelled=False,wrong=False):
 data=source.read_bytes()
 if hashlib.sha256(data).hexdigest()!=claimed or a!=A:raise ValueError('source/filter')
 samples=json.loads(data)
 if cancelled:raise ValueError('cancelled')
 checkpoints=[0.];transforms=[];state=0.;m=a**B
 for at in range(0,len(samples),B):
  block=samples[at:at+B]
  if candidate:
   end,_=filter_samples(block);transforms.append((m,end));state=m*state+end
  else:state,_=filter_samples(block,state)
  checkpoints.append(state)
 outputs=[]
 for plan in plans:
  state=0.
  for block in plan:
   if candidate:
    m,b=transforms[block];state=(state+b)*m if wrong else m*state+b
   else:state,_=filter_samples(samples[block*B:(block+1)*B],state)
  outputs.extend(filter_samples(continuation,state)[1])
 for target in seeks:
  if not 0<=target<=len(samples)-B:raise ValueError('offset')
  block=target//B;state=filter_samples(samples[block*B:target],checkpoints[block])[0];outputs.extend(filter_samples(samples[target:target+B],state)[1])
 return outputs
ref=job(False);actual=job(True);error=max(abs(a-b)for a,b in zip(actual,ref));wrong=max(abs(a-b)for a,b in zip(job(True,wrong=True),ref));assert error<=EPS and wrong>EPS;controls={}
for name,kw in [('source',{'claimed':'wrong'}),('filter',{'a':.99}),('cancel',{'cancelled':True})]:
 try:job(True,**kw);controls[name]=False
 except ValueError:controls[name]=True
old=seeks[0];seeks[0]=-1
try:job(True);controls['offset']=False
except ValueError:controls['offset']=True
seeks[0]=old;assert all(controls.values());(p/'results.json').write_text(json.dumps({'outputSamples':len(actual),'maxError':error,'tolerance':EPS,'wrongCompositionError':wrong,'controls':controls,'candidateCacheDoublePayloadBytes':(750*2+751)*8,'baselineCheckpointDoublePayloadBytes':751*8,'sourceSHA256':identity},indent=2));times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();out=job(variant=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert max(abs(a-b)for a,b in zip(out,ref))<=EPS
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(result,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/filter_affine_seek.py '+str(p)+'\n');print(error,wrong,result)
