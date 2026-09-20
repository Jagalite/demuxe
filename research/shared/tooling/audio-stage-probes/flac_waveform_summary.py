# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,math,array,subprocess,hashlib,time,statistics
from flac_predictive_bits import make,residual_bits,residuals,stream,parse as parse_frames
from flac_bits import Bits,crc,header
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);source=p/'source.flac';xs=[round(15000*math.sin(i*.011)+3000*math.sin(i*.037))for i in range(96000)];frames=[]
for i,at in enumerate(range(0,len(xs),4096)):
 block=xs[at:at+4096];frames.append(make(i,len(block),1,block[:1],residual_bits(residuals(block,1))))
source.write_bytes(stream(frames,1,16,len(xs),minblock=4096,maxblock=4096));identity=hashlib.sha256(source.read_bytes()).hexdigest()
(p/'protocol.json').write_text(json.dumps({'scope':'Actual fixed-order1 mono signed16 FLAC, real Rice-coded partition0 residuals,96000samples. Stream warmup+residual state into777sample count/min/max/sum/integer-energy bins without materializing full PCM or residual arrays. SourceCRC/identity and frame/sample counts required.','correctness':'Every124bin exact independent FFmpeg PCM oracle; bins cross actual4096sample frame boundaries. Relative-prefix summary composition and energy identities checked on actual coded residuals. Wrongwarmup, CRC/truncation/identity/cancel controls.','performance':'Five alternating complete cold read/hash/entropy parse/summary versus ordinary full source FFmpegdecode/PCM summary; identical integer output. <=0.9cost. Summary numeric payload separate from PythonRSS; no browser delivery claim.'},indent=2))
def summary(values,width=777):
 rows=[]
 for at in range(0,len(values),width):
  part=values[at:at+width];rows.append([len(part),min(part),max(part),sum(part),sum(x*x for x in part)])
 return rows
def summarize(data,claimed,wrong=False,cancel_after=None):
 if hashlib.sha256(data).hexdigest()!=claimed:raise ValueError('identity')
 if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('metadata')
 at=42;frame=0;rows=[];cell=[];count=0
 def emit(x):
  nonlocal cell,count
  if not -32768<=x<=32767:raise ValueError('sample bounds')
  if not cell:cell=[0,x,x,0,0]
  cell[0]+=1;cell[1]=min(cell[1],x);cell[2]=max(cell[2],x);cell[3]+=x;cell[4]+=x*x;count+=1
  if cell[0]==777:rows.append(cell);cell=[]
 while at<len(data):
  if cancel_after is not None and frame>=cancel_after:raise ValueError('cancelled')
  n=int.from_bytes(data[at+5:at+7],'big')+1
  if data[at:at+8]!=header(frame,n,1,16):raise ValueError('frame header')
  b=Bits.frombytes(data[at+8:])
  if b.read(8)!=18:raise ValueError('predictor')
  v=b.read(16);x=v-65536 if v&32768 else v
  if wrong:x=0 if wrong=='zero' else x+1
  emit(x)
  if b.read(2)or b.read(4):raise ValueError('Rice profile')
  k=b.read(4)
  if k==15:raise ValueError('escape')
  for _ in range(n-1):
   q=0
   while not b.read(1):
    q+=1
    if q>65536:raise ValueError('Rice bound')
   z=(q<<k)|b.read(k);x+=(z>>1)^-(z&1);emit(x)
  while b.at%8:
   if b.read(1):raise ValueError('padding')
  size=8+b.at//8+2;raw=data[at:at+size]
  if len(raw)!=size or int.from_bytes(raw[-2:],'big')!=crc(raw[:-2],16):raise ValueError('CRC')
  frame+=1;at+=size
 if cell:rows.append(cell)
 total=int.from_bytes(data[18:26],'big')&((1<<36)-1)
 if total!=count:raise ValueError('sample count')
 return rows
pcm=array.array('h');pcm.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','s16le','-'],stderr=subprocess.DEVNULL));assert list(pcm)==xs;reference=summary(pcm);actual=summarize(source.read_bytes(),identity);assert actual==reference
controls={};raw=source.read_bytes()
for name,bad,claim,kwargs in [('identity',raw,'wrong',{}),('CRC',raw[:-3]+bytes([raw[-3]^1])+raw[-2:],None,{}),('truncated',raw[:-1],None,{}),('cancel',raw,identity,{'cancel_after':2})]:
 try:summarize(bad,claim or hashlib.sha256(bad).hexdigest(),**kwargs);controls[name]=False
 except (ValueError,IndexError):controls[name]=True
try:summarize(raw,identity,wrong='zero');controls['zeroWarmupRejectedOrDiffers']=True
except ValueError as e:controls['zeroWarmupRejectedOrDiffers']=str(e)=='sample bounds'
wrong=summarize(raw,identity,wrong=True);assert wrong!=reference and all(controls.values())
def relative(res):
 s=0;out=[]
 for r in res:s+=r;out.append(s)
 return {'n':len(out),'last':s,'min':min(out),'max':max(out),'sum':sum(out),'energy':sum(x*x for x in out)}
def compose(a,b):return {'n':a['n']+b['n'],'last':a['last']+b['last'],'min':min(a['min'],a['last']+b['min']),'max':max(a['max'],a['last']+b['max']),'sum':a['sum']+b['sum']+b['n']*a['last'],'energy':a['energy']+b['energy']+2*a['last']*b['sum']+b['n']*a['last']**2}
proofs=0
for frame in parse_frames(raw):
 res=frame['res'];whole=relative(res)
 for cut in[1,len(res)//3,len(res)//2,len(res)-1]:assert compose(relative(res[:cut]),relative(res[cut:]))==whole;proofs+=1
 w=frame['warm'][0];values=[w+x for x in [sum(res[:i+1])for i in range(len(res))]];assert whole['energy']+2*w*whole['sum']+whole['n']*w*w==sum(x*x for x in values)
(p/'results.json').write_text(json.dumps({'bins':actual,'allBinsExact':True,'samples':len(pcm),'relativeCompositionCases':proofs,'controls':controls,'wrongWarmupDiffers':True,'summaryNumericPayloadBytes':len(actual)*5*8,'decodedPCMBytes':len(pcm)*2,'noPCMOrResidualArrayInCandidate':True},indent=2));times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();data=source.read_bytes();key=hashlib.sha256(data).hexdigest()
  if variant=='candidate':out=summarize(data,key)
  else:
   values=array.array('h');values.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','s16le','-'],stderr=subprocess.DEVNULL));out=summary(values)
  ms=(time.perf_counter_ns()-start)/1e6;assert out==reference
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_waveform_summary.py '+str(p)+'\nffmpeg -v error -i '+str(source)+' -f s16le -\n');print(cost)
