"""PGS bitmap-RLE -> indexed PNG through a fixed-Huffman DEFLATE writer.
No index or RGBA raster allocated by transform. The palette must already be RGBA;
PGS presentation/object assembly and YCbCr palette conversion are out of scope.
SPDX-License-Identifier: MIT.
"""
from common import png
import struct
LENGTHS=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258]
EXTRA=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]
class Deflater:
 def __init__(self):self.data=bytearray();self.buf=0;self.count=0;self.a=1;self.b=0;self.expanded=0;self.put(3,3)
 def put(self,v,n):
  self.buf|=v<<self.count;self.count+=n
  while self.count>=8:self.data.append(self.buf&255);self.buf>>=8;self.count-=8
 def symbol(self,v):
  if v<=143:code,n=48+v,8
  elif v<=255:code,n=400+v-144,9
  elif v<=279:code,n=v-256,7
  else:code,n=192+v-280,8
  rev=0
  for _ in range(n):rev=(rev<<1)|(code&1);code>>=1
  self.put(rev,n)
 def run(self,value,n):
  if n<=0:raise ValueError('empty run')
  # Adler update for a constant byte run, computed without expansion.
  self.b=(self.b+n*self.a+value*n*(n+1)//2)%65521;self.a=(self.a+n*value)%65521;self.expanded+=n
  self.symbol(value);n-=1
  while n>=3:
   k=min(n,258);i=max(i for i,v in enumerate(LENGTHS) if v<=k)
   self.symbol(257+i);self.put(k-LENGTHS[i],EXTRA[i]);self.put(0,5);n-=k
  for _ in range(n):self.symbol(value)
 def finish(self):
  self.symbol(256)
  if self.count:self.data.append(self.buf&255)
  return b'\x78\x01'+bytes(self.data)+struct.pack('>I',(self.b<<16)|self.a)

def transcode(data,w,h,palette,max_pixels=2097152):
 if not 0<w<=4096 or not 0<h<=1024 or w*h>max_pixels:raise ValueError('pixel budget')
 if not 1<=len(palette)<=256 or any(len(p)!=4 or any(not 0<=v<=255 for v in p) for p in palette):raise ValueError('RGBA palette')
 p=0;y=0;x=0;runs=0;d=Deflater();d.run(0,1)
 while p<len(data) and y<h:
  v=data[p];p+=1;n=1
  if v==0:
   if p>=len(data):raise ValueError('truncated RLE control')
   flags=data[p];p+=1;n=flags&63
   if flags&64:
    if p>=len(data):raise ValueError('truncated long run')
    n=(n<<8)|data[p];p+=1
   if flags&128:
    if p>=len(data):raise ValueError('truncated color')
    v=data[p];p+=1
   if not n:
    if flags!=0 or x!=w:raise ValueError('noncanonical or incomplete row ending')
    y+=1;x=0
    if y<h:d.run(0,1)
    continue
  if v>=len(palette):raise ValueError('palette index unavailable')
  if x+n>w:raise ValueError('row overflow')
  d.run(v,n);x+=n;runs+=1
  if len(d.data)>4*max_pixels:raise ValueError('encoded output budget')
 if y!=h or x or p!=len(data):raise ValueError('incomplete rows or trailing data')
 compressed=d.finish()
 out=png(w,h,compressed,3,bytes(v for rgba in palette for v in rgba[:3]),bytes(rgba[3] for rgba in palette))
 return out,{'source_rle_bytes':len(data),'output_png_bytes':len(out),'run_tokens':runs,'indexed_raster_bytes_not_materialized':w*h,'rgba_raster_bytes_not_materialized':4*w*h,'decoded_scanline_size':d.expanded,'deflate_bytes':len(compressed)}

DISTANCE_BASE=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577]
DISTANCE_EXTRA=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]

def match(d,length,distance):
 if not 3<=length<=258 or not 1<=distance<=32768:raise ValueError('deflate match bounds')
 i=max(i for i,v in enumerate(LENGTHS) if v<=length)
 d.symbol(257+i);d.put(length-LENGTHS[i],EXTRA[i])
 i=max(i for i,v in enumerate(DISTANCE_BASE) if v<=distance)
 reversed_code=int(f'{i:05b}'[::-1],2);d.put(reversed_code,5);d.put(distance-DISTANCE_BASE[i],DISTANCE_EXTRA[i])

def transcode_rows(data,w,h,palette,max_pixels=2097152):
 """Only previous-row symbolic reuse. Retains one row's RLE/token description,
 not any pixel raster. Equal source-encoded row bytes are a sufficient witness for
 equality of reconstructed indices in this validated fixed-width profile.
 """
 if not 0<w<=4096 or not 0<h<=1024 or w*h>max_pixels:raise ValueError('pixel budget')
 if not 1<=len(palette)<=256 or any(len(c)!=4 or any(not 0<=v<=255 for v in c) for c in palette):raise ValueError('palette')
 d=Deflater();p=0;previous=None;row_summary=None;repeated=0;max_tokens=0;max_row_bytes=0;count=0
 for row in range(h):
  start=p;x=0;tokens=[]
  while True:
   if p>=len(data):raise ValueError('incomplete row')
   v=data[p];p+=1;n=1
   if v==0:
    if p>=len(data):raise ValueError('truncated RLE flags')
    flags=data[p];p+=1;n=flags&63
    if flags&64:
     if p>=len(data):raise ValueError('truncated run')
     n=(n<<8)|data[p];p+=1
    if flags&128:
     if p>=len(data):raise ValueError('truncated index')
     v=data[p];p+=1
    if n==0:
     if flags or x!=w:raise ValueError('row ending')
     break
   if v>=len(palette) or x+n>w:raise ValueError('run bounds/index')
   tokens.append((v,n));x+=n
  row_bytes=data[start:p];max_row_bytes=max(max_row_bytes,len(row_bytes));max_tokens=max(max_tokens,len(tokens));count+=len(tokens)
  if row_bytes==previous and w+1>=3:
   # Reuse the prior complete filter-byte+index row at distance width+1.
   left=w+1
   while left:
    n=min(258,left)
    if 0<left-n<3:n=left-3
    match(d,n,w+1);left-=n
   S,T,L=row_summary;d.b=(d.b+L*d.a+T)%65521;d.a=(d.a+S)%65521;d.expanded+=L;repeated+=1
  else:
   a_before,b_before=d.a,d.b;d.run(0,1)
   for v,n in tokens:d.run(v,n)
   L=w+1;row_summary=((d.a-a_before)%65521,(d.b-b_before-L*a_before)%65521,L)
  previous=row_bytes
 if p!=len(data):raise ValueError('trailing bytes')
 compressed=d.finish();out=png(w,h,compressed,3,bytes(v for rgba in palette for v in rgba[:3]),bytes(rgba[3]for rgba in palette))
 return out,{'source_rle_bytes':len(data),'output_png_bytes':len(out),'run_tokens':count,'identical_previous_rows_reused':repeated,'max_row_token_count':max_tokens,'max_row_rle_bytes':max_row_bytes,'decoded_scanline_size':d.expanded,'raster_materialized':False}
