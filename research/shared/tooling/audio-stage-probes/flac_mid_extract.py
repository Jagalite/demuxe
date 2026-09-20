# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,struct,array,subprocess,hashlib,time,statistics,random
from flac_bits import Bits,crc,header,subframe,stream,frame
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);N=257
(p/'protocol.json').write_text(json.dumps({'scope':'Authored real16bit FLAC fixed0 escape-residual all-mid-side blocks257. Explicit rounded integer mono floor((L+R)/2), including negative odd sums. Preserve complete mid coded subframe bits; regenerate mono framing/CRCs/STREAMINFO.','correctness':'Host and Chrome compare exact decoded integer-mono endpoint against independent source L/R arithmetic; changed channel assignment, corrupt CRC and truncated frame must reject. No silent admission of mixed-mode frames.','performance':'Five alternating source read/index/header/subframe parse+mono write+host decode versus original source host decode+integer rounded mix. <=0.9cost; identical PCM endpoint. Cold process costs included, generated fixture excluded.'},indent=2))
rng=random.Random(224);left=[rng.randint(-32000,32000)for _ in range(N*12)];right=[rng.randint(-32000,32000)for _ in left];left[:6]=[-2,-1,0,1,2,-32768];right[:6]=[-1,0,1,2,3,32767];expected=[(a+b)//2 for a,b in zip(left,right)]
def ms_frame(i,L,R):
 mids=[(a+b)//2 for a,b in zip(L,R)];sides=[a-b for a,b in zip(L,R)];subs=[subframe(mids,16,True),subframe(sides,17,True)];h=bytearray(header(i,len(L),2,16));h[3]=(10<<4)|(4<<1);h[-1]=crc(h[:-1],8);bits=Bits()
 for v,n in subs:bits.add(v,n)
 out=bytes(h)+bits.bytes();return out+struct.pack('>H',crc(out,16))
def extract(raw):
 if raw[:4]!=b'fLaC' or raw[4:8]!=b'\x80\0\0\x22':raise ValueError('metadata')
 at=42;frames=[];proofs=[];number=0
 while at<len(raw):
  h=raw[at:at+8]
  if len(h)!=8 or h[:3]!=b'\xff\xf8\x7a' or h[3]!=168 or h[4]!=number or h[5:7]!=struct.pack('>H',N-1) or h[-1]!=crc(h[:-1],8):raise ValueError('strict mid-side header')
  firstbits=23+N*16;secondbits=23+N*17;size=8+(firstbits+secondbits+7)//8+2;body=raw[at:at+size]
  if len(body)!=size or int.from_bytes(body[-2:],'big')!=crc(body[:-2],16):raise ValueError('CRC/bounds')
  b=Bits.frombytes(body[8:-2])
  for start,width in [(0,16),(firstbits,17)]:
   b.at=start
   if [b.read(8),b.read(2),b.read(4),b.read(4),b.read(5)]!=[16,0,0,15,width]:raise ValueError('fixed0 residual profile')
  mid=b.slice(0,firstbits);proofs.append(hashlib.sha256(Bits(firstbits,mid).bytes()).hexdigest());frames.append(frame(number,N,1,16,[(mid,firstbits)]));number+=1;at+=size
 return stream(frames,1,16,number*N,minblock=N,maxblock=N),proofs
frames=[ms_frame(i,left[i*N:(i+1)*N],right[i*N:(i+1)*N])for i in range(12)];source=p/'source.flac';source.write_bytes(stream(frames,2,16,len(left),minblock=N,maxblock=N));dest=p/'mono.flac';out,proofs=extract(source.read_bytes());dest.write_bytes(out)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'],stderr=subprocess.DEVNULL)
full=array.array('h');full.frombytes(decode(source));truth=array.array('h',(v for pair in zip(left,right)for v in pair));assert full==truth;mono=decode(dest);expectedbytes=array.array('h',expected).tobytes();assert mono==expectedbytes
controls={}
for name,raw in [('mixedMode',source.read_bytes()[:45]+bytes([24])+source.read_bytes()[46:]),('CRC',source.read_bytes()[:-3]+bytes([source.read_bytes()[-3]^1])+source.read_bytes()[-2:]),('truncated',source.read_bytes()[:-1])]:
 try:extract(raw);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());(p/'results.json').write_text(json.dumps({'sourceFrames':len(left),'hostExact':True,'controls':controls,'midSubframeSHA256':proofs,'negativeOddExamples':[{'L':a,'R':b,'mono':(a+b)//2}for a,b in zip(left[:6],right[:6])]},indent=2))
times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  if variant=='candidate':out,_=extract(source.read_bytes());dest.write_bytes(out);actual=decode(dest)
  else:
   raw=array.array('h');raw.frombytes(decode(source));actual=array.array('h',((raw[i]+raw[i+1])//2 for i in range(0,len(raw),2))).tobytes()
  ms=(time.perf_counter_ns()-start)/1e6;assert actual==expectedbytes
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];result={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(result,indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_mid_extract.py '+str(p)+'\nffmpeg -v error -i {source,mono}.flac -f s16le -\n');print(result)
