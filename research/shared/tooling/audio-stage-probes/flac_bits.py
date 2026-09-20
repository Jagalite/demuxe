# SPDX-License-Identifier: Apache-2.0
import struct,hashlib

def table(poly,bits):
 out=[]
 for i in range(256):
  c=i<<(bits-8)
  for _ in range(8):c=((c<<1)^poly if c&(1<<(bits-1)) else c<<1)&((1<<bits)-1)
  out.append(c)
 return out
T8=table(7,8);T16=table(0x8005,16)
def crc(data,bits):
 c=0;tab=T8 if bits==8 else T16
 for b in data:c=((c<<8)^tab[((c>>(bits-8))^b)&255])&((1<<bits)-1)
 return c
class Bits:
 def __init__(self,n=0,v=0):self.n=n;self.v=v;self.at=0
 def add(self,v,n):assert 0<=v<1<<n;self.v=(self.v<<n)|v;self.n+=n
 def read(self,n):
  if self.at+n>self.n:raise ValueError('truncated bits')
  v=(self.v>>(self.n-self.at-n))&((1<<n)-1);self.at+=n;return v
 def slice(self,start,n):
  if start+n>self.n:raise ValueError('slice')
  return (self.v>>(self.n-start-n))&((1<<n)-1)
 def bytes(self):return (self.v<<(-self.n%8)).to_bytes((self.n+7)//8,'big')
 @staticmethod
 def frombytes(b):return Bits(len(b)*8,int.from_bytes(b,'big'))
def utf8(v):
 if v<128:return bytes([v])
 if v<2048:return bytes([0xc0|(v>>6),0x80|(v&63)])
 raise ValueError('bounded frame number')
def header(frame,n,ch,bps):
 if ch not in range(1,9) or bps not in [16,20,24]:raise ValueError('profile')
 h=b'\xff\xf8'+bytes([0x7a,((ch-1)<<4)|({16:4,20:5,24:6}[bps]<<1)])+utf8(frame)+struct.pack('>H',n-1);return h+bytes([crc(h,8)])
def frame(frameid,n,ch,bps,subframes):
 h=header(frameid,n,ch,bps);bits=Bits()
 for value,length in subframes:bits.add(value,length)
 b=h+bits.bytes();return b+struct.pack('>H',crc(b,16))
def stream(frames,ch,bps,total,md5=b'\0'*16,minblock=4096,maxblock=4096):
 si=struct.pack('>HH',minblock,maxblock)+b'\0'*6+((48000<<44)|((ch-1)<<41)|((bps-1)<<36)|total).to_bytes(8,'big')+md5;return b'fLaC\x80\x00\x00\x22'+si+b''.join(frames)
def subframe(samples,bps,fixed=False):
 b=Bits();b.add(16 if fixed else 2,8)
 if fixed:b.add(0,2);b.add(0,4);b.add(15,4);b.add(bps,5)
 for x in samples:b.add(x&((1<<bps)-1),bps)
 return b.v,b.n

def parse_frame(data):
 if len(data)<10 or data[:2]!=b'\xff\xf8' or data[2]!=0x7a:raise ValueError('profile header')
 assignment=data[3]>>4;bps={4:16,5:20,6:24}.get((data[3]>>1)&7)
 if assignment>7 or not bps:raise ValueError('dependent channel/bps')
 at=4;first=data[at];at+=1
 if first<128:num=first
 elif first&0xe0==0xc0:
  if data[at]&0xc0!=0x80:raise ValueError('frame number')
  num=((first&31)<<6)|(data[at]&63);at+=1
 else:raise ValueError('frame number')
 n=int.from_bytes(data[at:at+2],'big')+1;at+=2
 if data[at]!=crc(data[:at],8) or int.from_bytes(data[-2:],'big')!=crc(data[:-2],16):raise ValueError('CRC')
 at+=1;b=Bits.frombytes(data[at:-2]);subs=[]
 for ch in range(assignment+1):
  start=b.at;h=b.read(8)
  if h&128:raise ValueError('subframe padding')
  wasted=0
  if h&1:
   wasted=1
   while b.read(1)==0:
    wasted+=1
    if wasted>=bps:raise ValueError('wasted bits')
  kind=(h>>1)&63;effective=bps-wasted
  if kind==1:payload=effective*n
  elif kind==8:
   method=b.read(2);order=b.read(4);param=b.read(4);width=b.read(5)
   if method or order or param!=15 or width!=effective:raise ValueError('residual profile')
   payload=width*n
  else:raise ValueError('subframe coding')
  b.read(payload);subs.append({'bits':b.slice(start,b.at-start),'length':b.at-start,'wasted':wasted,'kind':kind})
 while b.at<b.n:
  if b.read(1):raise ValueError('alignment')
 return {'frame':num,'n':n,'channels':assignment+1,'bps':bps,'subframes':subs}
def promote(data):
 r=parse_frame(data)
 if r['channels']!=1 or r['bps']!=20 or r['subframes'][0]['kind']!=8 or r['subframes'][0]['wasted']:raise ValueError('promotion profile')
 s=r['subframes'][0];b=Bits();b.add((s['bits']>>(s['length']-8))|1,8);b.add(1,4);b.add(s['bits']&((1<<(s['length']-8))-1),s['length']-8);return frame(r['frame'],r['n'],1,24,[(b.v,b.n)])
def select(data,channels):
 r=parse_frame(data)
 if len(set(channels))!=len(channels) or any(c<0 or c>=r['channels'] for c in channels):raise ValueError('channel selection')
 return frame(r['frame'],r['n'],len(channels),r['bps'],[(r['subframes'][c]['bits'],r['subframes'][c]['length']) for c in channels])
def join_mono(inputs):
 rs=[parse_frame(data) for data,start in inputs]
 if not rs or any(r['channels']!=1 for r in rs):raise ValueError('mono sources')
 first=rs[0]
 if any((r['n'],r['bps'],r['frame'],start)!=(first['n'],first['bps'],first['frame'],inputs[0][1])for r,(_,start)in zip(rs,inputs)):raise ValueError('block/position mismatch')
 return frame(first['frame'],first['n'],len(rs),first['bps'],[(r['subframes'][0]['bits'],r['subframes'][0]['length']) for r in rs])
