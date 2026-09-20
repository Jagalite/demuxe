# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,math,struct,array,json,subprocess,time,statistics,hashlib
from flac_bits import Bits,crc,header,stream
from flac_predictive_bits import residual_bits,signed
N=257

def subframe(warm,res,width):
 b=Bits();b.add(18,8);b.add(warm&((1<<width)-1),width);b.add(*residual_bits(res));return b.v,b.n

def make(i,subs,mid_side=False):
 h=bytearray(header(i,N,2,16))
 if mid_side:h[3]=0xa8;h[-1]=crc(h[:-1],8)
 b=Bits()
 for value,n in subs:b.add(value,n)
 raw=bytes(h)+b.bytes();return raw+struct.pack('>H',crc(raw,16))
def parse(data):
 if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('metadata')
 at=42;frames=[]
 while at<len(data):
  if data[at:at+8]!=header(len(frames),N,2,16):raise ValueError('independent stereo fixed header')
  b=Bits.frombytes(data[at+8:]);channels=[]
  for ch in range(2):
   if b.read(8)!=18:raise ValueError('fixed1 only')
   warm=signed(b.read(16),16)
   if b.read(2)or b.read(4):raise ValueError('Rice profile')
   k=b.read(4)
   if k==15:raise ValueError('escape')
   res=[]
   for _ in range(N-1):
    q=0
    while not b.read(1):
     q+=1
     if q>65536:raise ValueError('Rice bound')
    z=(q<<k)|b.read(k);res.append((z>>1)^-(z&1))
   channels.append((warm,res))
  while b.at%8:
   if b.read(1):raise ValueError('padding')
  size=8+b.at//8+2;raw=data[at:at+size]
  if len(raw)!=size or int.from_bytes(raw[-2:],'big')!=crc(raw[:-2],16):raise ValueError('CRC')
  frames.append(channels);at+=size
 return frames

def convert(data,wrong=False):
 frames=[]
 for i,((L,lres),(R,rres))in enumerate(parse(data)):
  mid=(L+R)//2;side=L-R;parity=(L+R)&1;mr=[];sr=[]
  for a,b in zip(lres,rres):
   following=(parity+a+b)&1;numerator=a+b-following+parity
   if numerator&1:raise ValueError('parity proof')
   mr.append((a+b)//2 if wrong else numerator//2);sr.append(a-b);parity=following
  frames.append(make(i,[subframe(mid,mr,16),subframe(side,sr,17)],True))
 return stream(frames,2,16,len(frames)*N,minblock=N,maxblock=N)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-'],stderr=subprocess.DEVNULL)
def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);L=[round(12000*math.sin(i*.045))for i in range(N*12)];R=[x+(i*7%11)-5 for i,x in enumerate(L)];L[:6]=[-32768,32767,-2,-1,0,1];R[:6]=[32767,-32768,-1,0,1,2];frames=[]
 (p/'protocol.json').write_text(json.dumps({'scope':'Real independent stereo signed16 FLAC fixed-order1 Rice-coded partition0. Advance one-bit sum parity; derive exact mid residual=(rL+rR-eNew+eOld)/2 and side residual=rL-rR without full L/R amplitude reconstruction. Mid warmup floor((L+R)/2), side17bits; truthful mid-side frames and CRC.','correctness':'All3084stereo frames exact host/native original PCM including negative odd sums and signed16 extrema. Dropped parity wrong-output control, coupled source/CRC/truncation reject.','performance':'Five alternating cold read/parse/parity transform/Rice encode/write/destination decode versus ordinary source decode/explicitmid_sideFLAC encode/destination decode. Standalonemid-side lossless stream endpoint; <=0.9cost and <=1.25source bytes.'},indent=2))
 for i in range(12):
  a=L[i*N:(i+1)*N];b=R[i*N:(i+1)*N];frames.append(make(i,[subframe(a[0],[y-x for x,y in zip(a,a[1:])],16),subframe(b[0],[y-x for x,y in zip(b,b[1:])],16)]))
 source=p/'source.flac';source.write_bytes(stream(frames,2,16,len(L),minblock=N,maxblock=N));raw=source.read_bytes();dest=p/'output.flac';dest.write_bytes(convert(raw));expected=array.array('h',(x for pair in zip(L,R)for x in pair)).tobytes();assert decode(source)==decode(dest)==expected;(p/'reference.s16').write_bytes(expected);(p/'reference.flac').write_bytes(raw);wrong=p/'wrong-no-parity.flac';wrong.write_bytes(convert(raw,True));badPCM=decode(wrong);wrongCount=sum(x!=y for x,y in zip(array.array('h',badPCM),array.array('h',expected)));assert wrongCount>0;controls={}
 for name,data in [('CRC',raw[:-3]+bytes([raw[-3]^1])+raw[-2:]),('truncated',raw[:-1]),('alreadyMidSide',dest.read_bytes())]:
  try:convert(data);controls[name]=False
  except ValueError:controls[name]=True
 assert all(controls.values());r=subprocess.run(['flac','-t',str(source),str(dest)],capture_output=True);assert r.returncode==0;(p/'independent-flac-validation.txt').write_bytes(r.stdout+r.stderr);(p/'results.json').write_text(json.dumps({'samples':len(L),'channels':2,'hostExact':True,'wrongParityDifferingSamples':wrongCount,'controls':controls,'sourceBytes':len(raw),'outputBytes':dest.stat().st_size,'initialIntegerPairs':list(zip(L[:6],R[:6]))},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/flac_parity_stereo.py '+str(p)+'\n');print({'hostExact':True,'wrongCount':wrongCount,'bytes':[len(raw),dest.stat().st_size]})
if __name__=='__main__':main()
