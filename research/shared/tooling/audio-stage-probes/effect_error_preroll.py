# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,math,random,time,statistics,hashlib
from fractions import Fraction
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);Q=1<<24
(p/'protocol.json').write_text(json.dumps({'scope':'Opt-in Q24 integer first-order controlled lowpass y=floor((255*y+x)/256), source |x|<=1 and state |y|<=1. Explicit permitted normalized absolute output error1e-4, not exact seek semantics.','proof':'Ideal recurrence pole a=(D-1)/D, state uncertainty E=2. Each fixed-point step adds signed error magnitude<1/Q. One implemented trajectory differs from ideal <=D/Q; two trajectories <=2D/Q. Thus every post-preroll output differs <=2*a**N+2D/Q. Choose sufficient N using upward verification; reject if arithmetic floor already consumes tolerance or N exceeds100000.','correctness':'Compare all2048 samples after targets20000/80000/160000 across bounded seeded noise, negative DC and worst positive DC. Analytic rounding and input/state bounds mandatory; near-unit pole/unknown source bound/wrong identity/cancel reject. Zero-preroll negative control.','performance':'Five alternating full cold source read/identity/bounds/certificate and three repeated seeks versus full-prefix replay same fixed-point filter. Candidate<=0.9baseline. Source generation and immutable reference excluded, all candidate setup included.'},indent=2))
def certificate(D,epsilon,source_bound=1):
 if source_bound!=1 or D<2:raise ValueError('bound/config')
 arithmetic=2*D/Q
 if epsilon<=arithmetic:raise ValueError('rounding floor')
 a=(D-1)/D;N=max(0,math.ceil(math.log((epsilon-arithmetic)/2)/math.log(a)))
 while 2*a**N+arithmetic>epsilon:N+=1
 if N>100000:raise ValueError('near-unit excessive preroll')
 exact=Fraction(2*(D-1)**N,D**N)+Fraction(2*D,Q)
 while exact>Fraction(str(epsilon)):
  N+=1;exact=Fraction(2*(D-1)**N,D**N)+Fraction(2*D,Q)
 return {'D':D,'epsilon':epsilon,'N':N,'arithmeticBound':arithmetic,'totalBound':float(exact),'exactRationalBoundVerified':exact<=Fraction(str(epsilon))}
def process(xs,state=0,D=256):
 out=[]
 for x in xs:state=((D-1)*state+x)//D;out.append(state)
 return out
rng=random.Random(122341);fixtures={'noise':[rng.randint(-Q,Q)for _ in range(165000)],'positive':[Q]*165000,'negative':[-Q]*165000};targets=[20000,80000,160000];cert=certificate(256,1e-4);rows=[]
for name,xs in fixtures.items():
 ref=process(xs);N=cert['N']
 for target in targets:
  got=process(xs[target-N:target+2048])[N:];error=max(abs(a-b)/Q for a,b in zip(got,ref[target:target+2048]));wrong=process(xs[target:target+2048]);bad=max(abs(a-b)/Q for a,b in zip(wrong,ref[target:target+2048]));rows.append({'fixture':name,'target':target,'maxError':error,'noPrerollError':bad,'bound':cert['totalBound'],'passed':error<=cert['totalBound']})
controls={}
for name,args in [('roundingFloor',(65536,1e-4)),('nearUnit',(65536,.01)),('unknownBound',(256,1e-4,2))]:
 try:certificate(*args);controls[name]=False
 except ValueError:controls[name]=True
source=p/'source.json';source.write_text(json.dumps(fixtures['noise']));identity=hashlib.sha256(source.read_bytes()).hexdigest()
def seek(candidate,claimed=identity,cancelled=False):
 data=source.read_bytes()
 if hashlib.sha256(data).hexdigest()!=claimed:raise ValueError('identity')
 xs=json.loads(data)
 if max(map(abs,xs))>Q:raise ValueError('input bound')
 c=certificate(256,1e-4)if candidate else None;out=[]
 for target in targets:
  if cancelled:raise ValueError('cancelled')
  start=max(0,target-c['N'])if candidate else 0;out.append(process(xs[start:target+2048])[target-start:])
 return out
for name,kw in [('identity',{'claimed':'wrong'}),('cancel',{'cancelled':True})]:
 try:seek(True,**kw);controls[name]=False
 except ValueError:controls[name]=True
passed=all(x['passed']for x in rows)and all(controls.values())and any(x['noPrerollError']>1e-4 for x in rows);result={'certificate':cert,'rows':rows,'controls':controls,'correctnessPassed':passed};(p/'results.json').write_text(json.dumps(result,indent=2));assert passed,result
reference=seek(False);times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();out=seek(variant=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert all(max(abs(a-b)/Q for a,b in zip(row,ref))<=1e-4 for row,ref in zip(out,reference))
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/effect_error_preroll.py '+str(p)+'\n');print(result);print(cost)
