# SPDX-License-Identifier: MIT
"""Restricted PGS -> indexed PNG scene constructor. No general PGS claim.
Bounds: one current palette, at most two nonoverlapping objects, no crop/forced flags,
neutral black/white palette, fixed canvas; display commits only on END.
"""
from common import *
import zlib,struct

def be(n,k):return int(n).to_bytes(k,'big')
def chunk(t,b):return be(len(b),4)+t+b+be(zlib.crc32(t+b)&0xffffffff,4)
def png(index,w,h,pal):
 data=zlib.compress(b''.join(b'\x00'+index[y*w:(y+1)*w] for y in range(h)),6)
 return png_from_idat(data,w,h,pal),data

def png_from_idat(data,w,h,pal):
 keys=list(range(max(pal)+1))
 if any(k not in pal for k in keys):raise ValueError('sparse palette unsupported')
 plte=b''.join(bytes(pal[k][:3]) for k in keys);trns=bytes(pal[k][3] for k in keys)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,3,0,0,0))+chunk(b'PLTE',plte)+chunk(b'tRNS',trns)+chunk(b'IDAT',data)+chunk(b'IEND',b'')

def rle_decode(b,w,h):
 if not(0<w<=2048 and 0<h<=2048) or w*h>1048576:raise ValueError('object bound')
 out=bytearray();i=0;x=0;y=0
 while i<len(b):
  c=b[i];i+=1;n=1
  if not c:
   if i>=len(b):raise ValueError('short run')
   fl=b[i];i+=1;n=fl&63
   if fl&64:
    if i>=len(b):raise ValueError('short long run')
    n=n*256+b[i];i+=1
   if fl&128:
    if i>=len(b):raise ValueError('missing run color')
    c=b[i];i+=1
   if not n:
    if fl!=0 or x!=w:raise ValueError('bad line boundary')
    x=0;y+=1
    if y>h:raise ValueError('too many lines')
    continue
  if y>=h or x+n>w:raise ValueError('run exceeds row')
  out+=bytes([c])*n;x+=n
 if y!=h or x or len(out)!=w*h:raise ValueError('incomplete image')
 return bytes(out)

def segments(b):
 p=0
 while p<len(b):
  if p+13>len(b) or b[p:p+2]!=b'PG':raise ValueError('bad SUP segment')
  t=int.from_bytes(b[p+2:p+6],'big');k=b[p+10];n=int.from_bytes(b[p+11:p+13],'big')
  if p+13+n>len(b):raise ValueError('truncated SUP payload')
  yield t,k,b[p+13:p+13+n],p
  p+=13+n

class Parser:
 def __init__(self,source_hash):
  self.source_hash=source_hash;self.epoch=-1;self.objects={};self.pending={};self.palette={};self.window=None;self.pcs=None;self.events=[];self.rle_decodes=0
 def feed(self,t,k,b,source_hash):
  if source_hash!=self.source_hash:raise ValueError('source identity mismatch')
  if k!=0x16 and (self.pcs is None or self.pcs['pts']!=t):raise ValueError('segment not in current display set')
  if k==0x16:
   if len(b)<11:raise ValueError('short PCS')
   w=int.from_bytes(b[:2],'big');h=int.from_bytes(b[2:4],'big');state=b[7];count=b[10]
   if (w,h)!=(128,64) or count>2 or b[9]!=0 or state not in [0,128]:raise ValueError('unsupported PCS')
   if len(b)!=11+8*count:raise ValueError('PCS length')
   if state==128:self.epoch+=1;self.objects={};self.pending={};self.palette={};self.window=None
   if self.epoch<0:raise ValueError('missing epoch checkpoint')
   refs=[]
   for j in range(count):
    x=b[11+j*8:19+j*8]
    if x[2] or x[3]:raise ValueError('window/crop/forced unsupported')
    refs.append({'id':int.from_bytes(x[:2],'big'),'x':int.from_bytes(x[4:6],'big'),'y':int.from_bytes(x[6:8],'big')})
   self.pcs={'pts':t,'epoch':self.epoch,'refs':refs,'palette_update':bool(b[8]&128)}
  elif k==0x17:
   if len(b)!=10 or b[:2]!=b'\x01\x00' or tuple(int.from_bytes(b[i:i+2],'big') for i in [2,4,6,8])!=(0,0,128,64):raise ValueError('window unsupported')
   self.window=(0,0,128,64)
  elif k==0x14:
   if len(b)<2 or (len(b)-2)%5 or b[0]!=0:raise ValueError('bad palette')
   for i in range(2,len(b),5):
    idx,y,cr,cb,a=b[i:i+5]
    if y not in [16,235] or cr!=128 or cb!=128:raise ValueError('unqualified chroma/luma')
    v=0 if y==16 else 255;self.palette[idx]=(v,v,v,a)
   self.palette_version=b[1]
  elif k==0x15:
   if len(b)<4:raise ValueError('short ODS')
   oid=int.from_bytes(b[:2],'big');ver=b[2];fl=b[3]
   if fl not in [0,64,128,192]:raise ValueError('invalid ODS flags')
   if fl&128:
    if len(b)<11:raise ValueError('short first ODS')
    length=int.from_bytes(b[4:7],'big')-4;w=int.from_bytes(b[7:9],'big');h=int.from_bytes(b[9:11],'big')
    if not(0<length<=1048576):raise ValueError('RLE size cap')
    if oid not in self.objects and len(self.objects)+len(self.pending)>=16:raise ValueError('object-count cap')
    self.pending[oid]={'version':ver,'w':w,'h':h,'length':length,'rle':bytearray(b[11:])}
   else:
    if oid not in self.pending or self.pending[oid]['version']!=ver:raise ValueError('orphan/wrong-version fragment')
    self.pending[oid]['rle']+=b[4:]
   p=self.pending[oid]
   if len(p['rle'])>p['length']:raise ValueError('RLE overrun')
   if fl&64:
    if len(p['rle'])!=p['length']:raise ValueError('incomplete final ODS')
    idx=rle_decode(bytes(p['rle']),p['w'],p['h']);self.rle_decodes+=1
    data=zlib.compress(b''.join(b'\x00'+idx[y*p['w']:(y+1)*p['w']] for y in range(p['h'])),6)
    self.objects[oid]={'id':oid,'version':ver,'width':p['w'],'height':p['h'],'index':idx,'idat':data,'identity':sha(bytes(p['rle']))};del self.pending[oid]
  elif k==0x80:
   if b or not self.pcs or self.pcs['pts']!=t:raise ValueError('unbound display END')
   draws=[]
   for ref in self.pcs['refs']:
    if self.window is None or ref['id'] in self.pending or ref['id'] not in self.objects or not self.palette:raise ValueError('incomplete display dependencies')
    obj=self.objects[ref['id']]
    if ref['x']+obj['width']>128 or ref['y']+obj['height']>64 or any(i not in self.palette for i in obj['index']):raise ValueError('layout/palette mismatch')
    if any(ref['x']<q['x']+q['width'] and ref['x']+obj['width']>q['x'] and ref['y']<q['y']+q['height'] and ref['y']+obj['height']>q['y'] for q in draws):raise ValueError('overlap unsupported')
    image=png_from_idat(obj['idat'],obj['width'],obj['height'],self.palette)
    draws.append({**ref,'width':obj['width'],'height':obj['height'],'version':obj['version'],'object_identity':obj['identity'],'idat_hash':sha(obj['idat']),'palette_version':self.palette_version,'image':image,'index':obj['index'],'palette':dict(self.palette)})
   self.events.append({**self.pcs,'draws':draws});self.pcs=None
  else:raise ValueError('unqualified segment')
 def parse(self,b):
  if sha(b)!=self.source_hash:raise ValueError('source byte identity mismatch')
  for t,k,p,_ in segments(b):self.feed(t,k,p,self.source_hash)
  if self.pending or self.pcs:raise ValueError('incomplete end of source')
  return self.events
