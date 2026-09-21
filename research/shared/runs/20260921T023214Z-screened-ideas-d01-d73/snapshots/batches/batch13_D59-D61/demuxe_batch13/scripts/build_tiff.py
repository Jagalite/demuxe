# SPDX-License-Identifier: MIT
"""Classic TIFF JPEG-strip view constructor. Deliberately rejects unqualified properties."""
from common import *
from PIL import Image,TiffImagePlugin
import io,struct,numpy as np,math
class Reject(ValueError):pass

def parse_tiff(b, max_pixels=4_000_000):
 if len(b)<8 or b[:2] not in (b'II',b'MM'):raise Reject('not classic TIFF')
 endian='<' if b[:2]==b'II' else '>'
 def un(f,p):
  n=struct.calcsize(f)
  if p<0 or p+n>len(b):raise Reject('truncated TIFF field')
  return struct.unpack_from(endian+f,b,p)
 if un('H',2)[0]!=42:raise Reject('not classic TIFF')
 pos=un('I',4)[0];seen=set();pages=[]
 while pos:
  if pos in seen or len(seen)>=16:raise Reject('IFD cycle/page cap')
  seen.add(pos);n=un('H',pos)[0]
  if n>128 or pos+2+12*n+4>len(b):raise Reject('IFD bounds/count')
  tags={}
  for i in range(n):
   at=pos+2+12*i;tag,typ,num=un('HHI',at)
   if tag in tags:raise Reject('duplicate tag')
   widths={1:1,2:1,3:2,4:4,5:8,7:1}
   if typ not in widths or num>100_000:raise Reject('type/count')
   size=num*widths[typ];off=at+8 if size<=4 else un('I',at+8)[0]
   if off+size>len(b):raise Reject('tag extent')
   if typ==3:v=un('H'*num,off)
   elif typ==4:v=un('I'*num,off)
   else:v=b[off:off+size]
   tags[tag]=v
  def scalar(k,d=None):
   if k not in tags:return d
   x=tags[k]
   if len(x)!=1:raise Reject('scalar count')
   return x[0]
  w,h=scalar(256),scalar(257);photo=scalar(262);ch=scalar(277,1)
  if not w or not h or w*h>max_pixels:raise Reject('pixel cap')
  if scalar(259)!=7 or photo not in (1,2,6) or ch!=(1 if photo==1 else 3):raise Reject('codec/photometric')
  if tuple(tags.get(258,()))!=(8,)*ch or scalar(284,1)!=1 or scalar(274,1)!=1:raise Reject('bits/planes/orientation')
  # No silently dropped alpha, ICC, tiles, subIFDs, predictor, or alternate sample semantics.
  if set(tags)&{290,291,301,317,318,319,322,323,324,325,330,338,34675}:raise Reject('unqualified auxiliary/image property')
  if scalar(339,1)!=1:raise Reject('sample format')
  if photo==6:
   if tuple(tags.get(530,(2,2)))!=(1,1):raise Reject('YCbCr subsampling profile')
   if 529 in tags:raise Reject('custom YCbCr coefficients')
   if scalar(531,1)!=1:raise Reject('YCbCr positioning')
   if 532 in tags:
    v=tags[532]
    if len(v)!=48:raise Reject('reference black/white extent')
    rationals=struct.unpack(endian+'I'*12,v)
    if any(rationals[2*k+1]==0 or rationals[2*k]!=target*rationals[2*k+1] for k,target in enumerate([0,255,128,255,128,255])):raise Reject('custom reference black/white')
  rows=scalar(278);off=tags.get(273,());length=tags.get(279,())
  if not rows or len(off)!=math.ceil(h/rows) or len(off)!=len(length) or len(off)>1024:raise Reject('strip count')
  table=tags.get(347,b'')
  if not isinstance(table,bytes) or table[:2]!=b'\xff\xd8' or table[-2:]!=b'\xff\xd9':raise Reject('missing JPEG tables')
  # Parse table-only stream, rejecting embedded scans and malformed lengths.
  p=2
  while p<len(table)-2:
   if table[p:p+2] not in (b'\xff\xdb',b'\xff\xc4'):raise Reject('unqualified table marker')
   z=int.from_bytes(table[p+2:p+4],'big')
   if z<2 or p+2+z>len(table)-2:raise Reject('table bounds')
   p+=2+z
  if p!=len(table)-2:raise Reject('table end')
  strips=[]
  for j,(a,nbytes) in enumerate(zip(off,length)):
   if nbytes<8 or a+nbytes>len(b):raise Reject('strip extent')
   raw=b[a:a+nbytes]
   if raw[:2]!=b'\xff\xd8' or raw[-2:]!=b'\xff\xd9':raise Reject('strip JPEG framing')
   p=2;sof=None;scan=None
   while p<len(raw)-2:
    if raw[p]!=255:raise Reject('JPEG marker')
    marker=raw[p+1];z=int.from_bytes(raw[p+2:p+4],'big')
    if z<2 or p+2+z>len(raw):raise Reject('JPEG segment extent')
    data=raw[p+4:p+2+z]
    if marker==0xc0:
     if sof is not None or len(data)!=6+3*ch:raise Reject('SOF count')
     depth,hh,ww,cc=struct.unpack_from('>BHHB',data)
     ids=tuple(data[6+k*3] for k in range(cc));sof=(ww,hh,ids)
     if depth!=8 or ww!=w or hh!=min(rows,h-j*rows) or cc!=ch:raise Reject('strip geometry')
     if photo==2 and ids!=(ord('R'),ord('G'),ord('B')):raise Reject('RGB component interpretation')
     if photo==6 and ids!=(1,2,3):raise Reject('YCbCr component interpretation')
     if any(data[7+k*3]!=0x11 for k in range(cc)):raise Reject('subsampling profile')
    elif marker==0xda:
     if sof is None:raise Reject('missing SOF')
     scan=raw[p+2+z:-2];break
    elif marker not in (0xdb,0xc4,0xdd):raise Reject('unqualified JPEG marker')
    p+=2+z
   if not scan:raise Reject('missing scan')
   jpeg=table[:-2]+raw[2:]
   strips.append({'bytes':jpeg,'source_offset':a,'source_bytes':nbytes,'scan_sha256':sha(scan),'y':j*rows,'height':sof[1],'width':w})
  pages.append({'width':w,'height':h,'photometric':photo,'table_sha256':sha(table),'strips':strips})
  pos=un('I',pos+2+12*n)[0]
 return pages

def main():
 yy,xx=np.mgrid[:243,:321];a=np.stack([(7*xx+3*yy)%256,(xx+5*yy)%256,((xx//13+yy//9)%2)*240],-1).astype('uint8');im=Image.fromarray(a)
 outputs=[]
 # Actual libTIFF-generated files, not a toy packet manifest.
 for mode,q in [('RGB',85),('YCbCr',85),('L',85),('RGB',45)]:
  name=f'tiff_{mode}_{q}';info=TiffImagePlugin.ImageFileDirectory_v2();info[278]=48
  p=F/(name+'.tiff');im.convert(mode).save(p,compression='jpeg',quality=q,tiffinfo=info)
  b=p.read_bytes();pages=parse_tiff(b);page=pages[0]
  original=Image.open(p).convert('RGBA');original.save(F/(name+'_reference.png'));assembled=Image.new('RGBA',original.size)
  fs=[]
  for k,s in enumerate(page['strips']):
   fn=f'{name}_{k}.jpg';(F/fn).write_bytes(s.pop('bytes'));assembled.paste(Image.open(F/fn).convert('RGBA'),(0,s['y']));fs.append({'file':fn,**s})
  delta=np.abs(np.array(original).astype(int)-np.array(assembled).astype(int));outputs.append({'file':p.name,'reference':name+'_reference.png','width':page['width'],'height':page['height'],'strips':fs,'source_bytes':len(b),'host_different':int(np.count_nonzero(delta)),'host_max':int(delta.max()),'table_sha256':page['table_sha256']})
 # Real multi-page file exercises source-bound per-IFD configurations.
 im.save(F/'multipage.tiff',save_all=True,append_images=[im.convert('L'),im.transpose(Image.Transpose.ROTATE_180)],compression='jpeg',quality=75,tiffinfo={278:48})
 multi=parse_tiff((F/'multipage.tiff').read_bytes());multi_output=[]
 ref=Image.open(F/'multipage.tiff')
 for k,page in enumerate(multi):
  ref.seek(k);r=ref.convert('RGBA');name=f'multi_{k}';r.save(F/(name+'_reference.png'));fs=[];canvas=Image.new('RGBA',r.size)
  for j,s in enumerate(page['strips']):
   fn=f'{name}_{j}.jpg';(F/fn).write_bytes(s.pop('bytes'));canvas.paste(Image.open(F/fn).convert('RGBA'),(0,s['y']));fs.append({'file':fn,**s})
  delta=np.abs(np.array(r).astype(int)-np.array(canvas).astype(int));multi_output.append({'file':'multipage.tiff','page':k,'reference':name+'_reference.png','width':page['width'],'height':page['height'],'strips':fs,'host_different':int(np.count_nonzero(delta)),'host_max':int(delta.max())})
 # Wrong valid tables decode but must not be confused with the correct source.
 a=(F/'tiff_RGB_85.tiff').read_bytes();b=(F/'tiff_RGB_45.tiff').read_bytes();ta=Image.open(io.BytesIO(a)).tag_v2;tb=Image.open(io.BytesIO(b)).tag_v2
 start,n=ta[273][0],ta[279][0];(F/'wrong_tables.jpg').write_bytes(tb[347][:-2]+a[start:start+n][2:])
 # A deliberately mis-stamped source epoch is handled by a separate immutable plan guard.
 def bound_plan(data,expected):
  if sha(data)!=expected:raise Reject('source identity changed')
  return parse_tiff(data)
 guards={}
 for key,fn in {'truncated':lambda:parse_tiff(a[:-5]),'pixel_cap':lambda:parse_tiff(a,100),'wrong_source':lambda:bound_plan(b,sha(a)),'missing_tables':lambda:parse_tiff(a[:a.find(ta[347])]+b'\0'*len(ta[347])+a[a.find(ta[347])+len(ta[347]):])}.items():
  try:fn();guards[key]=False
  except (Reject,ValueError,struct.error) as e:guards[key]=str(e)
 # Unsupported actual orientation and alpha TIFFs.
 im.save(F/'orientation.tiff',compression='jpeg',tiffinfo={274:6,278:48})
 for name in ['orientation.tiff']:
  try:parse_tiff((F/name).read_bytes());guards[name]=False
  except Reject as e:guards[name]=str(e)
 save('tiff_manifest.json',{'cases':outputs+multi_output,'guards':guards,'source_files':[x['file'] for x in outputs]+['multipage.tiff'],'request':'8-bit strips, unsigned, planar contiguous, unrotated, no ICC/alpha, YCbCr 1:1; browser rendering compared to decoded TIFF PNG reference; no performance claim'})
 print('TIFF',[(x['file'],x['host_different']) for x in outputs], 'multipage',[x['host_different'] for x in multi_output],guards)
if __name__=='__main__':main()
