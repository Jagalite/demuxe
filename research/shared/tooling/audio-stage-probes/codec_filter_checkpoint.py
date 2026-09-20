# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,hashlib,subprocess,array,random,time,statistics,copy
from ima_wav_logical import parse,advance
FIXTURE=pathlib.Path('research/shared/runs/20260919T232859Z-ima-fixture/2ch.wav')
RECIPE={'decoder':'IMA-WAV-per-shift-v1','runtime':'original-logical-reference-v1','rate':8000,'channels':2,'mix':'floor((L+R)/2)','resample':'pair-average-floor-2to1-phase0','filter':'integer-y=floor((15*y+x)/16)','outputRate':4000,'epoch':1}
def initial():return {'input':0,'output':0,'block':0,'position':0,'pred':[0,0],'index':[0,0],'pending':None,'filter':0}
def step(parsed,state):
 if state['block']>=len(parsed['blocks']):return None,False
 block=parsed['blocks'][state['block']];pos=state['position']
 if pos==0:
  state['pred']=[x[0]for x in block['headers']];state['index']=[x[1]for x in block['headers']]
 else:
  for ch in range(2):state['pred'][ch],state['index'][ch]=advance(state['pred'][ch],state['index'][ch],block['codes'][ch][pos-1])
 sample=sum(state['pred'])//2;state['input']+=1;state['position']+=1
 if state['position']==parsed['samplesPerBlock']:state['position']=0;state['block']+=1
 if state['pending']is None:state['pending']=sample;return None,True
 value=(state['pending']+sample)//2;state['pending']=None;state['filter']=(15*state['filter']+value)//16;state['output']+=1;return state['filter'],True

def checkpoint(state,identity):
 body={'source':identity,'recipe':RECIPE,'state':copy.deepcopy(state)};body['sha256']=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest();return body
def restore(cp,identity,recipe=RECIPE,cancelled=False):
 if cancelled or cp['source']!=identity or cp['recipe']!=recipe:raise ValueError('source/runtime/recipe/epoch/cancel')
 body={k:v for k,v in cp.items()if k!='sha256'}
 if hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest()!=cp['sha256']:raise ValueError('checkpoint identity')
 state=copy.deepcopy(cp['state'])
 if any(not 0<=i<=88 for i in state['index'])or any(not -32768<=v<=32767 for v in state['pred'])or state['output']!=state['input']//2 or (state['pending']is None)!=(state['input']%2==0):raise ValueError('logical shape')
 return state

def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);source=FIXTURE.read_bytes();identity=hashlib.sha256(source).hexdigest();parsed=parse(source);rng=random.Random(329);targets=[0,1,63,1000,2000,3930]+[rng.randrange(3940)for _ in range(29)]
 (p/'protocol.json').write_text(json.dumps({'scope':'Real stereo IMA-WAV logical decoder state plus requested integer stereo mix, exact pair-average2to1 resampler phase/pending sample, and integer IIR state. Serialize only versioned logical values/positions, source+runtime+recipe+epoch identity and checksum, no pointers/raw decoder memory.8136decoded stereo inputframes→4068output4k frames.','correctness':'Restored continuations exact independent FFmpeg8.1.2 decode then ordinary pipeline oracle, including odd-input pending resampler phase, block resets, nearEOF; wrong codec-only/filter-only restores differ. Reject source/runtime/recipe/epoch/corrupted snapshot/cancel.','performance':'Five alternating cold source read/hash/parse, complete checkpoint-building pass, JSONserialization/write/read and35seek/output128 jobs versus same source setup+ordinary prefix replay for35queries. Candidate<=0.9; cachebytes separately measured.'},indent=2))
 host=array.array('h');host.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(FIXTURE),'-f','s16le','-'],stderr=subprocess.DEVNULL));mixed=[(host[i]+host[i+1])//2 for i in range(0,len(host),2)];resampled=[(mixed[i]+mixed[i+1])//2 for i in range(0,len(mixed),2)];reference=[];y=0
 for x in resampled:y=(15*y+x)//16;reference.append(y)
 state=initial();whole=[];checkpoints=[checkpoint(state,identity)]
 while True:
  value,ok=step(parsed,state)
  if not ok:break
  if value is not None:whole.append(value)
  if state['input']%257==0:checkpoints.append(checkpoint(state,identity))
 assert whole==reference
 def query(parsed,state,target):
  out=[]
  while state['output']<target+128:
   value,ok=step(parsed,state)
   if not ok:break
   if value is not None and state['output']>target:out.append(value)
  return out
 rows=[]
 for target in targets:
  cp=max((c for c in checkpoints if c['state']['input']<=target*2),key=lambda c:c['state']['input']);out=query(parsed,restore(cp,identity),target);assert out==reference[target:target+128];rows.append({'target':target,'checkpointInput':cp['state']['input'],'pendingPhase':cp['state']['pending']is not None,'exact':True})
 cp=checkpoints[8];bad=restore(cp,identity);bad['filter']=0;wrongFilter=query(parsed,bad,bad['output']);expected=reference[cp['state']['output']:cp['state']['output']+128];assert wrongFilter!=expected
 cpOdd=checkpoints[7];bad=restore(cpOdd,identity);bad['pending']=0;wrongPhase=query(parsed,bad,bad['output']);assert wrongPhase!=reference[cpOdd['state']['output']:cpOdd['state']['output']+128];controls={}
 for name,kwargs in [('source',{'identity':'wrong'}),('runtime',{'identity':identity,'recipe':dict(RECIPE,runtime='wrong')}),('filter',{'identity':identity,'recipe':dict(RECIPE,filter='changed')}),('epoch',{'identity':identity,'recipe':dict(RECIPE,epoch=2)}),('cancel',{'identity':identity,'cancelled':True})]:
  try:restore(checkpoints[4],**kwargs);controls[name]=False
  except ValueError:controls[name]=True
 corrupt=copy.deepcopy(checkpoints[4]);corrupt['state']['pred'][0]+=1
 try:restore(corrupt,identity);controls['snapshotChecksum']=False
 except ValueError:controls['snapshotChecksum']=True
 assert all(controls.values());cache=p/'checkpoints.json';cache.write_text(json.dumps(checkpoints));(p/'results.json').write_text(json.dumps({'inputFrames':len(host)//2,'outputFrames':len(reference),'fullPipelineExact':True,'queries':rows,'controls':controls,'filterStateOmissionDiffers':True,'resamplerPhaseOmissionDiffers':True,'cacheBytes':cache.stat().st_size,'checkpoints':len(checkpoints),'logicalFieldsOnly':True,'sourceSHA256':identity},indent=2))
 def job(candidate):
  raw=FIXTURE.read_bytes();key=hashlib.sha256(raw).hexdigest();decoder=parse(raw);cps=[]
  if candidate:
   state=initial();cps=[checkpoint(state,key)]
   while True:
    _,ok=step(decoder,state)
    if not ok:break
    if state['input']%257==0:cps.append(checkpoint(state,key))
   cache.write_text(json.dumps(cps));cps=json.loads(cache.read_text())
  out=[]
  for target in targets:
   state=restore(max((c for c in cps if c['state']['input']<=target*2),key=lambda c:c['state']['input']),key)if candidate else initial();out.extend(query(decoder,state,target))
  return out
 expected=[x for target in targets for x in reference[target:target+128]];times={'candidate':[],'baseline':[]}
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns();out=job(variant=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert out==expected
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/codec_filter_checkpoint.py '+str(p)+'\nffmpeg -v error -i '+str(FIXTURE)+' -f s16le -\n');print(cost)
if __name__=='__main__':main()
