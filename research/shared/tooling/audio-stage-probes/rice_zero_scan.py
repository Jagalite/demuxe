# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,array,subprocess,time,statistics,hashlib,concurrent.futures,random
from flac_predictive_bits import make,residual_bits,parse
from flac_bits import stream

def summarize(bits):
 ends=[i for i,b in enumerate(bits)if b=='1']
 if not ends:return {'size':len(bits),'runs':[],'tail':len(bits)}
 return {'size':len(bits),'runs':[ends[0]]+[b-a-1 for a,b in zip(ends,ends[1:])],'tail':len(bits)-1-ends[-1]}
def combine(rows):
 out=[];carry=0
 for row in rows:
  runs=row['runs']
  if runs:out.extend([carry+runs[0]]+runs[1:]);carry=row['tail']
  else:carry+=row['tail']
 if carry:raise ValueError('incomplete terminal code')
 return [-(x//2)-1 if x&1 else x//2 for x in out]
def serial(bits):
 out=[];q=0
 for b in bits:
  if b=='0':q+=1
  else:out.append(-(q//2)-1 if q&1 else q//2);q=0
 if q:raise ValueError('incomplete')
 return out

def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);rng=random.Random(231);xs=[0]
 for i in range(60000):xs.append(xs[-1]+rng.choice([-1,0,1]))
 res=[b-a for a,b in zip(xs,xs[1:])];bits=''.join('0'*(2*x if x>=0 else -2*x-1)+'1'for x in res);(p/'rice.bits').write_text(bits);identity=hashlib.sha256(bits.encode()).hexdigest()
 # One actual FLAC fixed1 frame, Rice parameter0. Header representation handled by shared coded helper.
 frame=make(0,len(xs),1,[xs[0]],residual_bits(res,0));source=stream([frame],1,16,len(xs),minblock=len(xs),maxblock=len(xs));(p/'source.flac').write_bytes(source)
 actual=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'source.flac'),'-f','s16le','-']);assert actual==array.array('h',xs).tobytes()
 (p/'protocol.json').write_text(json.dumps({'scope':'Actual fixed1 FLAC Rice0 residual entropy payload,60000symbols. Unary chunk summary stores internal completed runs plus leading carry-dependent first run and trailing carry; compose in order. Explicit parameter0 profile, not general Ricek parser.','cost':'Five alternating cold payloadread/hash, four spawned worker summaries, ordered carry composition and cleanup versus serial unary loop; output same signed60000residuals. Include process transfer/startup; <=0.9median.'},indent=2))
 controls=[]
 for width in [1,7,251,8191]:
  rows=[summarize(bits[i:i+width])for i in range(0,len(bits),width)];assert combine(rows)==res;controls.append({'width':width,'exact':True})
 assert combine([summarize('000'),summarize('001')])==[-3]
 try:combine([summarize('000')]);truncated=False
 except ValueError:truncated=True
 assert truncated
 wrong=[]
 for i in range(0,len(bits),251):wrong.extend(combine([summarize(bits[i:i+251]+'1')]))
 assert wrong!=res
 times={'candidate':[],'baseline':[]};pids=[]
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns();raw=(p/'rice.bits').read_bytes();assert hashlib.sha256(raw).hexdigest()==identity;b=raw.decode()
   if variant=='candidate':
    width=(len(b)+3)//4
    with concurrent.futures.ProcessPoolExecutor(max_workers=4)as pool:rows=list(pool.map(summarize,[b[i:i+width]for i in range(0,len(b),width)]))
    got=combine(rows)
   else:got=serial(b)
   ms=(time.perf_counter_ns()-start)/1e6;assert got==res
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'samples':len(xs),'residuals':len(res),'codedBits':len(bits),'independentPCMExact':True,'chunkControls':controls,'truncationRejected':truncated,'omittedCarryWrong':True,'profile':'Rice0 only; no general Ricek or maintained decoder speed claim'},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/rice_zero_scan.py '+str(p)+'\nffmpeg -v error -i '+str(p/'source.flac')+' -f s16le -\n');print(med,ratio)
if __name__=='__main__':main()
