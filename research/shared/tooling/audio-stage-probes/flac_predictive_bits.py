# SPDX-License-Identifier: Apache-2.0
import struct
from flac_bits import Bits,crc,header,stream
COEFF={1:[1],2:[2,-1],3:[3,-3,1],4:[4,-6,4,-1]}
def signed(x,n):return x-(1<<n)if x&(1<<(n-1))else x
def residuals(xs,order):return [xs[i]-sum(c*xs[i-j-1]for j,c in enumerate(COEFF[order]))for i in range(order,len(xs))]
def residual_bits(res,k=None):
 zig=[2*x if x>=0 else -2*x-1 for x in res]
 if k is None:k=min(range(15),key=lambda k:sum((x>>k)+1+k for x in zig))
 b=Bits();b.add(0,2);b.add(0,4);b.add(k,4)
 for x in zig:b.add(1,(x>>k)+1);b.add(x&((1<<k)-1),k)
 return b.v,b.n

def make(index,n,order,warm,resbits,lpc=False,coeff=None,shift=0):
 b=Bits();b.add((32+order-1)*2 if lpc else (8+order)*2,8)
 for x in warm:
  if not -32768<=x<=32767:raise ValueError('warmup bounds')
  b.add(x&65535,16)
 if lpc:
  b.add(4,4);b.add(shift&31,5)
  for c in coeff or COEFF[order]:b.add(c&31,5)
 b.add(*resbits);raw=header(index,n,1,16)+b.bytes();return raw+struct.pack('>H',crc(raw,16))
def parse(data):
 if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('metadata profile')
 frames=[];at=42
 while at<len(data):
  start=at
  if data[at:at+4]!=b'\xff\xf8\x7a\x08':raise ValueError('frame profile')
  index=data[at+4]
  if index>=128 or index!=len(frames):raise ValueError('number')
  n=int.from_bytes(data[at+5:at+7],'big')+1
  if data[at+7]!=crc(data[at:at+7],8):raise ValueError('header CRC')
  b=Bits.frombytes(data[at+8:]);subheader=b.read(8)
  if subheader&129:raise ValueError('padding/wasted bits')
  kind=subheader//2
  if 9<=kind<=12:order=kind-8;lpc=False
  elif 32<=kind<=35:order=kind-31;lpc=True
  else:raise ValueError('predictor profile')
  warm=[signed(b.read(16),16)for _ in range(order)];coeff=None;shift=0
  if lpc:
   precision=b.read(4)+1
   if precision!=5:raise ValueError('coefficient precision')
   shift=signed(b.read(5),5);coeff=[signed(b.read(5),5)for _ in range(order)]
  resStart=b.at
  if b.read(2)!=0 or b.read(4)!=0:raise ValueError('Rice method/partition')
  k=b.read(4)
  if k==15:raise ValueError('escape outside profile')
  res=[]
  for _ in range(n-order):
   q=0
   while b.read(1)==0:
    q+=1
    if q>65536:raise ValueError('Rice bound')
   z=(q<<k)|b.read(k);res.append((z>>1)^-(z&1))
  resbits=(b.slice(resStart,b.at-resStart),b.at-resStart)
  while b.at%8:
   if b.read(1):raise ValueError('padding')
  size=8+b.at//8+2;frame=data[start:start+size]
  if len(frame)!=size or int.from_bytes(frame[-2:],'big')!=crc(frame[:-2],16):raise ValueError('frame CRC')
  frames.append({'index':index,'n':n,'order':order,'warm':warm,'res':res,'resbits':resbits,'lpc':lpc,'coeff':coeff,'shift':shift,'k':k});at+=size
 return frames
def validate(order,warm,res):
 history=list(warm);lo=min(warm);hi=max(warm)
 for r in res:
  x=r+sum(c*history[-j-1]for j,c in enumerate(COEFF[order]));lo=min(lo,x);hi=max(hi,x)
  if not -32768<=x<=32767:raise ValueError('sample headroom')
  history=(history+[x])[-order:]
 return lo,hi
