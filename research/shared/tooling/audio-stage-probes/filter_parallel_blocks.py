# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,math,random,time,statistics,hashlib,os,concurrent.futures,multiprocessing
A=.98;CHUNK=4096;EPS=1e-12
def zero_block(samples):
 state=0.;out=[]
 for x in samples:state=A*state+(1-A)*x;out.append(state)
 return os.getpid(),out

def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);rng=random.Random(245);samples=[.3*math.sin(i*.023)+rng.uniform(-.2,.2)for i in range(96000)]+[0.]*4096;source=p/'source.json';source.write_text(json.dumps(samples));identity=hashlib.sha256(source.read_bytes()).hexdigest()
 (p/'protocol.json').write_text(json.dumps({'scope':'Controlled scalar stable IIR binary64, a=.98;96000samples plus4096zero tail, actual4-process zero-state block filtering then serial affine boundary composition and missing-history correction. Abs tolerance1e-12; complete output and tail retained.','performance':'Five alternating complete cold source-read/hash/parse, process startup, serialization, scheduling, zero-state work, transfer, correction, output aggregation and shutdown versus same serial recurrence. <=0.9cost. Worker count/PIDs and transient numeric payload reported, no hardware energy claim.','controls':'Wrong source/coeff/cancel rejected; omitted correction differs; actual queued future cancellation and owner shutdown verified.'},indent=2))
 def job(candidate,claimed=identity,a=A,cancelled=False):
  data=source.read_bytes()
  if hashlib.sha256(data).hexdigest()!=claimed or a!=A or cancelled:raise ValueError('source/filter/cancel')
  xs=json.loads(data)
  if not candidate:return zero_block(xs)[1],[]
  blocks=[xs[i:i+CHUNK]for i in range(0,len(xs),CHUNK)]
  with concurrent.futures.ProcessPoolExecutor(max_workers=4,mp_context=multiprocessing.get_context('spawn'))as executor:raw=list(executor.map(zero_block,blocks))
  out=[];state=0.
  for pid,block in raw:
   incoming=state;power=A
   for value in block:out.append(value+power*incoming);power*=A
   state=A**len(block)*incoming+block[-1]
  return out,sorted(set(pid for pid,_ in raw))
 reference,_=job(False);actual,pids=job(True);error=max(abs(a-b)for a,b in zip(actual,reference));wrong=[]
 for at in range(0,len(samples),CHUNK):wrong.extend(zero_block(samples[at:at+CHUNK])[1])
 wrongError=max(abs(a-b)for a,b in zip(wrong,reference));assert error<=EPS and wrongError>EPS and len(pids)>=2;controls={}
 for name,kw in [('source',{'claimed':'wrong'}),('filter',{'a':.99}),('cancel',{'cancelled':True})]:
  try:job(True,**kw);controls[name]=False
  except ValueError:controls[name]=True
 with concurrent.futures.ProcessPoolExecutor(max_workers=2,mp_context=multiprocessing.get_context('spawn'))as executor:
  futures=[executor.submit(zero_block,samples)for _ in range(16)];cancelled=sum(f.cancel()for f in futures)
 assert cancelled>0;controls['queuedFuturesCancelled']=cancelled;controls['ownerShutdownCompleted']=True
 (p/'results.json').write_text(json.dumps({'outputSamples':len(actual),'tailSamples':4096,'maxError':error,'tolerance':EPS,'omittedCorrectionError':wrongError,'workerPIDs':pids,'controls':controls,'lastOutputMagnitude':abs(actual[-1]),'sourceAndZeroBlockNumericPayloadBytes':len(samples)*8*2,'payloadNotRSS':True},indent=2));times={'candidate':[],'baseline':[]};workers=[]
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns();out,pids=job(variant=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert max(abs(a-b)for a,b in zip(out,reference))<=EPS
   if trial:times[variant].append(ms)
   if variant=='candidate':workers.append(pids)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9,'workerPIDsPerJob':workers};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/filter_parallel_blocks.py '+str(p)+'\n');print(error,pids,cost)
if __name__=='__main__':main()
