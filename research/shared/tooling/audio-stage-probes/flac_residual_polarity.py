# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,array,json,subprocess,math,time,statistics
from flac_bits import Bits,crc,header,stream
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);N=257;WIDTH=21;COEF=[[],[1],[2,-1],[3,-3,1],[4,-6,4,-1]]
(p/'protocol.json').write_text(json.dumps({'scope':'Actual signed16 FLAC fixed predictors0..4,21bit escape residuals. Negate warmups/residuals, regenerate frame CRCs. Streaming recurrence validates safe sample headroom with at most4sample history; do not claim avoidance of all sample reconstruction work. Reject -32768 anywhere and residual overflow; general shifted LPC excluded.','correctness':'Independent host/native integer polarity oracle for all five orders, full-stream double inversion, negative controls minvalue in warmup and predicted body for everyorder, invalid CRC/order/truncation.','performance':'Five alternating full source read/parse/headroom validation/coded transform/write/destination decode versus ordinary source decode/PCM negate/FLAC encode/destination decode. Standalone lossless FLAC plus exact PCM endpoint, <=0.9cost and <=1.25source bytes.'},indent=2))
def signed(v,n):return v-(1<<n)if v&(1<<(n-1))else v
def make(i,order,warm,res):
 b=Bits();b.add(16+order*2,8)
 for x in warm:b.add(x&65535,16)
 b.add(0,2);b.add(0,4);b.add(15,4);b.add(WIDTH,5)
 for x in res:
  if not -(1<<(WIDTH-1))<=x<(1<<(WIDTH-1)):raise ValueError('residual overflow')
  b.add(x&((1<<WIDTH)-1),WIDTH)
 raw=header(i,N,1,16)+b.bytes();return raw+struct.pack('>H',crc(raw,16))
def authored(i,order,xs):
 res=[]
 for k in range(order,len(xs)):res.append(xs[k]-sum(c*xs[k-j-1]for j,c in enumerate(COEF[order])))
 return make(i,order,xs[:order],res)
def invert(data):
 if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('metadata')
 at=42;frames=[]
 while at<len(data):
  if data[at:at+8]!=header(len(frames),N,1,16):raise ValueError('frame header')
  kind=data[at+8];order=(kind-16)//2
  if kind not in[16,18,20,22,24]:raise ValueError('fixed predictor')
  size=8+(23+order*16+(N-order)*WIDTH+7)//8+2;body=data[at:at+size]
  if len(body)!=size or int.from_bytes(body[-2:],'big')!=crc(body[:-2],16):raise ValueError('CRC/bounds')
  b=Bits.frombytes(body[8:-2]);b.get= b.read;b.get(8);warm=[signed(b.get(16),16)for _ in range(order)]
  if [b.get(2),b.get(4),b.get(4),b.get(5)]!=[0,0,15,WIDTH]:raise ValueError('residual profile')
  res=[signed(b.get(WIDTH),WIDTH)for _ in range(N-order)];history=list(warm)
  if any(x==-32768 for x in warm):raise ValueError('headroom')
  for r in res:
   x=r+sum(c*history[-j-1]for j,c in enumerate(COEF[order]))
   if not -32767<=x<=32767:raise ValueError('headroom')
   if order:history=(history+[x])[-order:]
  frames.append(make(len(frames),order,[-x for x in warm],[-x for x in res]));at+=size
 return stream(frames,1,16,len(frames)*N,minblock=N,maxblock=N)
samples=[round(15000*math.sin(i*.37))for i in range(N*10)];frames=[authored(i,i%5,samples[i*N:(i+1)*N])for i in range(10)];source=p/'source.flac';source.write_bytes(stream(frames,1,16,len(samples),minblock=N,maxblock=N));dest=p/'reversed.flac';dest.write_bytes(invert(source.read_bytes()))
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'],stderr=subprocess.DEVNULL)
expected=array.array('h',(-x for x in samples)).tobytes();assert decode(source)==array.array('h',samples).tobytes();assert decode(dest)==expected;assert invert(invert(source.read_bytes()))==source.read_bytes();controls=[]
for order in range(5):
 for pos in [0,100]:
  xs=[0]*N;xs[pos]=-32768;bad=stream([authored(0,order,xs)],1,16,N,minblock=N,maxblock=N)
  try:invert(bad);raise RuntimeError('minimum accepted')
  except ValueError as e:assert str(e)=='headroom';controls.append({'order':order,'minimumAt':pos,'rejected':True})
(p/'reference.s16').write_bytes(expected);subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','1','-i',str(p/'reference.s16'),'-c:a','flac',str(p/'reference.flac')],check=True);(p/'results.json').write_text(json.dumps({'orders':[0,1,2,3,4],'samples':len(samples),'hostExact':True,'doubleInversionBytesExact':True,'controls':controls,'headroomValidationHistorySamplesMaximum':4},indent=2));times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  if variant=='candidate':dest.write_bytes(invert(source.read_bytes()));actual=decode(dest)
  else:
   raw=array.array('h');raw.frombytes(decode(source));pcm=p/'timed.s16';pcm.write_bytes(array.array('h',(-x for x in raw)).tobytes());f=p/'timed.flac';subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','1','-i',str(pcm),'-c:a','flac',str(f)],check=True);actual=decode(f)
  ms=(time.perf_counter_ns()-start)/1e6;assert actual==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'byteRatio':dest.stat().st_size/source.stat().st_size,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(result,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_residual_polarity.py '+str(p)+'\nffmpeg -v error -i INPUT.flac -f s16le -\nffmpeg -v error -y -f s16le -ar48000 -ac1 -i INPUT.s16 -c:a flac OUTPUT.flac\n');print(result)
