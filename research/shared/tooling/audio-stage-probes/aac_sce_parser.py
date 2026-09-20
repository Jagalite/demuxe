# SPDX-License-Identifier: Apache-2.0
# Original bitstream traversal; reads separately licensed LGPL-2.1-or-later FFmpeg tables at runtime.
import re,pathlib
TABLE_SOURCE=pathlib.Path('build/local-screening/adaptation-reference/source/FFmpeg-n7.1.1/libavcodec/aactab.c')
class Bits:
 def __init__(self,bits=''):self.bits=bits;self.at=0
 def get(self,n):
  if self.at+n>len(self.bits):raise ValueError('truncated AAC')
  v=int(self.bits[self.at:self.at+n]or'0',2);self.at+=n;return v
 def put(self,v,n):self.bits+=format(v,'0'+str(n)+'b')
 def align(self):self.at=(self.at+7)//8*8
 def bytes(self):return int(self.bits+'0'*(-len(self.bits)%8),2).to_bytes((len(self.bits)+7)//8,'big')
 @classmethod
 def frombytes(cls,data):return cls(''.join(format(x,'08b')for x in data))
def tables():
 source=TABLE_SOURCE.read_text();out={}
 for name in ['ff_aac_scalefactor_code','ff_aac_scalefactor_bits','swb_offset_1024_48','swb_offset_128_48']+[f'{prefix}{i}'for i in range(1,12)for prefix in ['codes','bits']]:
  match=re.search(r'\b'+name+r'\[[^]]*\]\s*=\s*\{([^}]+)\}',source);out[name]=[int(x,0)for x in re.findall(r'0x[\da-fA-F]+|\b\d+\b',match[1])]
 return out
T=tables();HUFF={i:{(n,c):k for k,(n,c)in enumerate(zip(T['bits'+str(i)],T['codes'+str(i)]))}for i in range(1,12)};HUFF[0]={(n,c):k for k,(n,c)in enumerate(zip(T['ff_aac_scalefactor_bits'],T['ff_aac_scalefactor_code']))}
def huff(b,book):
 code=0
 for n in range(1,20):
  code=(code<<1)|b.get(1)
  if (n,code)in HUFF[book]:return HUFF[book][n,code]
 raise ValueError('Huffman')
def sce(b):
 start=b.at;tag=b.get(4);b.get(8)
 if b.get(1):raise ValueError('reserved ICS')
 seq=b.get(2);b.get(1);groups=[1]
 if seq==2:
  maxsfb=b.get(4)
  for _ in range(7):
   if b.get(1):groups[-1]+=1
   else:groups.append(1)
  swb=T['swb_offset_128_48'];lengthbits=3
 else:
  maxsfb=b.get(6)
  if b.get(1):raise ValueError('prediction')
  swb=T['swb_offset_1024_48'];lengthbits=5
 if maxsfb>=len(swb):raise ValueError('sfb')
 books=[]
 for _ in groups:
  row=[]
  while len(row)<maxsfb:
   book=b.get(4)
   if book not in range(12):raise ValueError('noise/intensity/reserved')
   length=0
   while True:
    inc=b.get(lengthbits);length+=inc
    if inc!=(1<<lengthbits)-1:break
   if not length or len(row)+length>maxsfb:raise ValueError('section')
   row.extend([book]*length)
  books.append(row)
 for row in books:
  for book in row:
   if book:huff(b,0)
 if b.get(1):raise ValueError('pulse')
 if b.get(1):raise ValueError('TNS')
 if b.get(1):raise ValueError('gain')
 for group,row in zip(groups,books):
  for sfb,book in enumerate(row):
   if not book:continue
   dim=4 if book<=4 else 2;base=3 if book<=4 else 9 if book<=6 else 8 if book<=8 else 13 if book<=10 else 17
   for _ in range(group*(swb[sfb+1]-swb[sfb])//dim):
    symbol=huff(b,book);values=[]
    for k in range(dim):values.append(symbol%base);symbol//=base
    if book in [3,4,7,8,9,10,11]:
     for value in values:
      if value:b.get(1)
    if book==11:
     for value in values:
      if value==16:
       n=4
       while b.get(1):
        n+=1
        if n>31:raise ValueError('escape overflow')
       b.get(n)
 return tag,b.bits[start:b.at]
def adts_packets(data):
 at=0;out=[]
 while at<len(data):
  h=data[at:at+7]
  if len(h)!=7 or h[:2]!=b'\xff\xf1' or (h[2]>>6)!=1 or (h[2]>>2)&15!=3 or h[6]&3:raise ValueError('ADTS LC48k noCRC oneblock profile')
  size=((h[3]&3)<<11)|(h[4]<<3)|(h[5]>>5)
  if size<7 or at+size>len(data):raise ValueError('ADTS bounds')
  out.append(data[at+7:at+size]);at+=size
 return out
def adts(payload,channels):
 n=len(payload)+7;return bytes([255,241,0x4c|(channels>>2),(channels&3)<<6|(n>>11),(n>>3)&255,((n&7)<<5)|31,252])+payload
def mono_sce(payload):
 b=Bits.frombytes(payload);result=None
 while True:
  element=b.get(3)
  if element==7:break
  if element==0:
   if result is not None:raise ValueError('multipleSCE')
   _,result=sce(b)
  elif element==6:
   count=b.get(4)
   if count==15:count+=b.get(8)-1
   fill=Bits(b.bits[b.at:b.at+count*8]);b.get(count*8)
   if count and fill.get(4)in[13,14]:raise ValueError('SBR')
  else:raise ValueError('coupled/unsupported element')
 if result is None:raise ValueError('noSCE')
 return result
