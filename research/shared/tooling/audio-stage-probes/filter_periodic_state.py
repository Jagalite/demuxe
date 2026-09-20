# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,math,time,statistics,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);EPS=1e-12;POLES=[.8,.98,.999,.9999];loop=[.2+.3*math.sin(2*math.pi*i/64)+.1*math.cos(6*math.pi*i/64)for i in range(64)];source=p/'loop.json';source.write_text(json.dumps(loop));identity=hashlib.sha256(source.read_bytes()).hexdigest()
(p/'protocol.json').write_text(json.dumps({'scope':'Controlled stable scalar binary64 IIR periodic initialization,64sample loop, poles.8/.98/.999/.9999. Derive one-loop affine M,b and solve state=b/(1-M), then render first10requested loops640samples. Explicit max abs tolerance1e-12 versus long iterated reference.','baseline':'Actually iterate loops until a posteriori state-error estimate |delta|/(1-a^64)<=1e-13 or state converges exactly, then render same10loops. No arbitrary fixed burnin count in measured baseline.','performance':'Five alternating cold source read/hash, state derivation or adaptive convergence, and full640sample output across four poles. <=0.9cost. Reference20000loop burnin excluded from both timed variants.','guards':'Reject nonstable/nearunit denominator<=1e-9, wrong source and cancellation. Zero initialization negative control; closure error separately measured.'},indent=2))
def run(samples,a,state):
 out=[]
 for x in samples:state=a*state+(1-a)*x;out.append(state)
 return state,out
def solve(samples,a):
 if not 0<=a<1 or 1-a**len(samples)<=1e-9:raise ValueError('unstable/illconditioned')
 b=run(samples,a,0)[0];return b/(1-a**len(samples))
def job(candidate,claimed=identity,cancelled=False):
 raw=source.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=claimed or cancelled:raise ValueError('source/cancel')
 samples=json.loads(raw);out=[];iterations=[]
 for a in POLES:
  if candidate:state=solve(samples,a);count=1
  else:
   state=0.;count=0
   while True:
    new=run(samples,a,state)[0];count+=1
    if abs(new-state)/(1-a**len(samples))<=1e-13:state=new;break
    state=new
    if count>1000000:raise ValueError('iteration budget')
  out.extend(run(samples*10,a,state)[1]);iterations.append(count)
 return out,iterations
rows=[];reference=[]
for a in POLES:
 state=0.
 for _ in range(20000):state=run(loop,a,state)[0]
 ideal=solve(loop,a);rendered=run(loop*10,a,ideal)[1];ref=run(loop*10,a,state)[1];zero=run(loop*10,a,0)[1];error=max(abs(x-y)for x,y in zip(rendered,ref));closure=abs(run(loop,a,ideal)[0]-ideal);wrong=max(abs(x-y)for x,y in zip(zero,ref));rows.append({'pole':a,'state':ideal,'maxError':error,'closureError':closure,'zeroInitializationError':wrong});reference.extend(ref)
assert all(r['maxError']<=EPS and r['closureError']<=EPS and r['zeroInitializationError']>EPS for r in rows);controls={}
for name,fn in [('unstable',lambda:solve(loop,1.01)),('nearUnit',lambda:solve(loop,1-1e-14)),('identity',lambda:job(True,'wrong')),('cancel',lambda:job(True,cancelled=True))]:
 try:fn();controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());actual,counts=job(False);assert max(abs(x-y)for x,y in zip(actual,reference))<=EPS;(p/'results.json').write_text(json.dumps({'rows':rows,'controls':controls,'baselineAdaptiveIterations':counts,'outputSamples':len(reference),'tolerance':EPS},indent=2));times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();out,counts=job(variant=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert max(abs(x-y)for x,y in zip(out,reference))<=EPS
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/filter_periodic_state.py '+str(p)+'\n');print(rows,counts,cost)
