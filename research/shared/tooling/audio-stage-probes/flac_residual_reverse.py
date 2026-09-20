# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,math,array,json,subprocess,time,statistics,hashlib
from flac_bits import Bits,crc,header,stream
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);N=257;WIDTH=17
(p/'protocol.json').write_text(json.dumps({'scope':'Signed16 fixed-order1 FLAC blocks257, escape-coded17bit residuals; derive last sample by warmup+sum(residual), emit new warmup and reversed-negated residuals. Reverse block order and regenerate truthful headers/CRCs/STREAMINFO; reject other predictor/residual/mode profiles.','correctness':'Independent full decode/reverse integer oracle, every host/native sample; involution, negative residuals, malformed CRC/truncation/order controls.','performance':'Five alternating cold source read/parse/transform/write plus destination decode versus full source decode/PCM reversal/ordinary FLAC encode plus destination decode. Required endpoint is standalone reversed lossless FLAC with exact PCM. <=0.9cost and <=1.25output bytes relative source; no implied superiority over a PCM-only playback endpoint.'},indent=2))
def signed(v,n):return v-(1<<n)if v&(1<<(n-1))else v
def make(i,warm,res):
 b=Bits();b.add(18,8);b.add(warm&65535,16);b.add(0,2);b.add(0,4);b.add(15,4);b.add(WIDTH,5)
 for r in res:
  if not -(1<<(WIDTH-1))<=r<(1<<(WIDTH-1)):raise ValueError('residual overflow')
  b.add(r&((1<<WIDTH)-1),WIDTH)
 body=header(i,N,1,16)+b.bytes();return body+struct.pack('>H',crc(body,16))
def transform(data):
 if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('metadata')
 at=42;units=[];size=8+(39+(N-1)*WIDTH+7)//8+2
 while at<len(data):
  body=data[at:at+size];i=len(units)
  if len(body)!=size or body[:8]!=header(i,N,1,16)or int.from_bytes(body[-2:],'big')!=crc(body[:-2],16):raise ValueError('frame profile/CRC')
  b=Bits.frombytes(body[8:-2])
  if b.read(8)!=18:raise ValueError('predictor')
  warm=signed(b.read(16),16)
  if [b.read(2),b.read(4),b.read(4),b.read(5)]!=[0,0,15,WIDTH]:raise ValueError('residual coding')
  res=[signed(b.read(WIDTH),WIDTH)for _ in range(N-1)];last=warm+sum(res)
  if not -32768<=last<=32767:raise ValueError('warmup overflow')
  units.append((last,[-x for x in reversed(res)]));at+=size
 return stream([make(i,*unit)for i,unit in enumerate(reversed(units))],1,16,len(units)*N,minblock=N,maxblock=N)
samples=[round(20000*math.sin(i*.021)+10000*math.sin(i*.053))for i in range(N*24)];samples[:4]=[-32768,32767,-1,0];frames=[]
for i in range(24):
 xs=samples[i*N:(i+1)*N];frames.append(make(i,xs[0],[b-a for a,b in zip(xs,xs[1:])]))
source=p/'source.flac';source.write_bytes(stream(frames,1,16,len(samples),minblock=N,maxblock=N));dest=p/'reversed.flac';dest.write_bytes(transform(source.read_bytes()))
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'],stderr=subprocess.DEVNULL)
expected=array.array('h',reversed(samples)).tobytes();assert decode(source)==array.array('h',samples).tobytes();assert decode(dest)==expected;assert transform(transform(source.read_bytes()))==source.read_bytes();controls={}
for name,data in [('truncation',source.read_bytes()[:-1]),('CRC',source.read_bytes()[:-5]+bytes([source.read_bytes()[-5]^1])+source.read_bytes()[-4:]),('predictor',source.read_bytes()[:50]+bytes([16])+source.read_bytes()[51:])]:
 try:transform(data);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());(p/'reference.s16').write_bytes(expected);subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','1','-i',str(p/'reference.s16'),'-c:a','flac',str(p/'reference.flac')],check=True)
(p/'results.json').write_text(json.dumps({'samples':len(samples),'hostExact':True,'involutionBytesExact':True,'controls':controls,'extremeBoundarySamples':samples[:4],'sourceBytes':source.stat().st_size,'outputBytes':dest.stat().st_size},indent=2));times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  if variant=='candidate':dest.write_bytes(transform(source.read_bytes()));got=decode(dest)
  else:
   raw=array.array('h');raw.frombytes(decode(source));raw.reverse();pcm=p/'timed.s16';pcm.write_bytes(raw.tobytes());encoded=p/'timed.flac';subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar','48000','-ac','1','-i',str(pcm),'-c:a','flac',str(encoded)],check=True);got=decode(encoded)
  ms=(time.perf_counter_ns()-start)/1e6;assert got==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];byteRatio=dest.stat().st_size/source.stat().st_size;cost={'timesMS':times,'medianMS':med,'ratio':ratio,'byteRatio':byteRatio,'passed':ratio<=.9 and byteRatio<=1.25};(p/'cost-results.json').write_text(json.dumps(cost,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_residual_reverse.py '+str(p)+'\nffmpeg -v error -i INPUT.flac -f s16le -\nffmpeg -v error -y -f s16le -ar 48000 -ac 1 -i INPUT.s16 -c:a flac OUTPUT.flac\n');print(cost)
