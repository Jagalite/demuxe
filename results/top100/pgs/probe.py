# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import struct,subprocess,json,hashlib
r=Path(__file__).parent
be=lambda v,n:v.to_bytes(n,'big')
def segment(pts,t,b):return b'PG'+be(pts,4)+be(pts,4)+bytes([t])+be(len(b),2)+b
def pcs(number,count):return be(160,2)+be(96,2)+bytes([0x10])+be(number,2)+bytes([0x80 if number==0 else 0,0,0,count])+(be(0,2)+bytes([0,0])+be(20,2)+be(30,2) if count else b'')
bitmap=(bytes([1])*16+b'\0\0')*8
palette=bytes([0,0,0,16,128,128,0,1,235,128,128,255]);obj=be(0,2)+bytes([0,0xc0])+be(len(bitmap)+4,3)+be(16,2)+be(8,2)+bitmap
segments=[(45000,0x16,pcs(0,1)),(45000,0x17,bytes([1,0])+be(0,2)+be(0,2)+be(160,2)+be(96,2)),(45000,0x14,palette),(45000,0x15,obj),(45000,0x80,b''),(135000,0x16,pcs(1,0)),(135000,0x80,b'')];data=b''.join(segment(*s) for s in segments);(r/'caption.sup').write_bytes(data)
cmd=['ffmpeg','-v','error','-y','-copyts','-f','lavfi','-i','color=black:s=160x96:r=4:d=2','-i',str(r/'caption.sup'),'-filter_complex','[0:v]settb=1/1000,setpts=PTS+125[v];[v][1:s]overlay','-t','2.1','-fps_mode','passthrough','-enc_time_base','1/1000','-pix_fmt','rgb24','-f','rawvideo',str(r/'reference.rgb')];p=subprocess.run(cmd,capture_output=True,text=True);(r/'oracle.log').write_text(p.stderr);p.check_returncode();raw=(r/'reference.rgb').read_bytes();assert len(raw)==160*96*3*8
# Restricted PGS decoder: complete object, literal palette runs plus line endings.
def decode(data):
 at=0;events=[];image=None;placement=None;pts=0;colors={}
 while at<len(data):
  if at+13>len(data):raise ValueError('truncated header')
  if data[at:at+2]!=b'PG':raise ValueError('segment signature')
  pts=int.from_bytes(data[at+2:at+6],'big');typ=data[at+10];n=int.from_bytes(data[at+11:at+13],'big');b=data[at+13:at+13+n]
  if len(b)!=n:raise ValueError('segment bounds')
  at+=13+n
  if typ==0x16:
   count=b[10];placement=None if count==0 else (int.from_bytes(b[15:17],'big'),int.from_bytes(b[17:19],'big'));assert count in (0,1)
  elif typ==0x14:
   for i in range(2,len(b),5):
    index,y,cr,cb,a=b[i:i+5];assert cr==cb==128;white=max(0,min(255,round((y-16)*255/219)));colors[index]=(white,white,white,a)
  elif typ==0x15:
   assert b[3]==0xc0;w=int.from_bytes(b[7:9],'big');h=int.from_bytes(b[9:11],'big');p=11;rows=[]
   for y in range(h):
    row=[]
    while p<len(b):
     value=b[p];p+=1
     if value:row.append(value)
     else:
      if p>=len(b) or b[p]!=0:raise ValueError('unsupported RLE form')
      p+=1;break
    if len(row)!=w:raise ValueError('row width')
    rows.append(row)
   image=rows
  elif typ==0x80:events.append((pts,placement,image,dict(colors)))
 return events
events=decode(data);rows=[]
for frame in range(8):
 time=frame*22500+11250;active=[e for e in events if e[0]<=time];expected=bytearray(160*96*3)
 if active:
  _,pos,image,colors=active[-1]
  if pos:
   for y,row in enumerate(image):
    for x,index in enumerate(row):
     rgb=colors[index];offset=((pos[1]+y)*160+pos[0]+x)*3;expected[offset:offset+3]=bytes(rgb[:3])
 actual=raw[frame*160*96*3:(frame+1)*160*96*3];rows.append({'frame':frame,'exact':actual==expected})
assert all(x['exact'] for x in rows),rows
try:decode(data[:-1]);raise AssertionError('truncated accepted')
except ValueError:pass
(r/'result.json').write_text(json.dumps({'scope':'Restricted complete-object PGS literal bitmap/display/clear component against independent FFmpeg subtitle overlay on unchanged black video. No fragmented objects, general RLE or integrated native overlay.','rows':rows,'oracleSamplePhaseSeconds':0.125,'exactTransitionBoundaryUnqualified':True,'truncatedSegmentRejected':True,'fixtureSHA256':hashlib.sha256(data).hexdigest(),'oracleCommand':cmd,'passed':True},indent=2)+'\n')
