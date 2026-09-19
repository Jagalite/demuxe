# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,math
r=Path(__file__).parent;runtime=json.load(open('results/top100/independent-audio-result.json'));anchor=runtime['probe']['rows'][2]['outputTimestamp']
def fit(x,y):
 mx=sum(x)/len(x);my=sum(y)/len(y);slope=sum((a-mx)*(b-my) for a,b in zip(x,y))/sum((a-mx)**2 for a in x);offset=my-slope*mx;err=sum((b-offset-slope*a)**2 for a,b in zip(x,y));return slope,offset,err
def classify(stamps):
 origin=stamps[0]['performanceTime'];x=[(s['performanceTime']-origin)/1000 for s in stamps];y=[s['contextTime']-t for s,t in zip(stamps,x)];slope,offset,error=fit(x,y);best=None
 for k in range(8,len(x)-8):
  groups=[(x[:k],y[:k]),(x[k:],y[k:])];means=[(sum(a)/len(a),sum(b)/len(b)) for a,b in groups];num=sum(sum((a-mx)*(b-my) for a,b in zip(xs,ys)) for (xs,ys),(mx,my) in zip(groups,means));den=sum(sum((a-mx)**2 for a in xs) for (xs,ys),(mx,my) in zip(groups,means));s=num/den;cs=[my-s*mx for mx,my in means];e=sum(sum((b-c-s*a)**2 for a,b in zip(xs,ys)) for (xs,ys),c in zip(groups,cs));row=(e,k,s,cs[1]-cs[0])
  if best is None or e<best[0]:best=row
 if abs(best[3])>=.02 and best[0]<error*.1:return {'kind':'latency-step-plus-drift','stepIndex':best[1],'driftPPM':best[2]*1e6,'latencyStepSeconds':-best[3]}
 return {'kind':'drift-only','driftPPM':slope*1e6,'latencyStepSeconds':0}
rows=[]
for name,drift,step,delivery in [('drift',100e-6,0,0),('step',0,.05,0),('both',100e-6,.05,0),('delayed-callback',100e-6,0,.12)]:
 stamps=[]
 for i in range(120):
  t=i*.5;noise=math.sin(i*1.7)*.00002;stamps.append({'contextTime':anchor['contextTime']+t*(1+drift)+noise,'performanceTime':anchor['performanceTime']+t*1000+(step*1000 if i>=60 else 0),'arrivalTime':anchor['performanceTime']+t*1000+(delivery*1000 if i>=60 else 0)})
 actual=classify(stamps);assert abs(actual['driftPPM']-drift*1e6)<2;assert abs(actual['latencyStepSeconds']-step)<.0001
 rows.append({'name':name,'expectedDriftPPM':drift*1e6,'expectedLatencyStep':step,'actual':actual})
(r/'classification-result.json').write_text(json.dumps({'scope':'Controlled clock-observation component with real AudioContext timestamp schema/anchor. Injected60-second rate/jump/callback-delay traces; not observed physical device latency changes or drift.','rows':rows,'outputTimestampRuntimeEvidence':'../independent-audio-result.json','passed':True},indent=2)+'\n')
