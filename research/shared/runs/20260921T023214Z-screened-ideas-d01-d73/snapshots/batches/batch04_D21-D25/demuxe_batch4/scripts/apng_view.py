"""Bounded RGBA8 APNG frame views and cold-seek plans, no pixel decoding.
Not a general region-last-writer solver. Cap, CRC, sequence and geometry guards.
SPDX-License-Identifier: MIT.
"""
from common import chunk,png,sha
import struct,zlib

def parse(b,max_frames=64,max_pixels=2097152):
 if b[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('signature')
 p=8;sequence=0;frames=[];cur=None;default_data=[];w=h=0;num=None;ended=False;seen_idat=False
 while p<len(b):
  if p+12>len(b):raise ValueError('chunk truncated')
  n=int.from_bytes(b[p:p+4],'big');kind=b[p+4:p+8];data=b[p+8:p+8+n]
  if p+12+n>len(b):raise ValueError('chunk overrun')
  if zlib.crc32(kind+data)&0xffffffff!=int.from_bytes(b[p+8+n:p+12+n],'big'):raise ValueError('chunk CRC')
  if kind==b'IHDR':
   if w or len(data)!=13:raise ValueError('IHDR')
   w,h,bits,ct,comp,filt,interlace=struct.unpack('>IIBBBBB',data)
   if not w or not h or w*h>max_pixels or (bits,ct,comp,filt,interlace)!=(8,6,0,0,0):raise ValueError('bounded RGBA8 noninterlaced profile only')
  elif kind==b'acTL':
   if len(data)!=8 or num is not None:raise ValueError('animation control')
   num,loops=struct.unpack('>II',data)
   if not 1<=num<=max_frames:raise ValueError('frame budget')
  elif kind==b'fcTL':
   if len(data)!=26 or num is None:raise ValueError('frame control')
   seq,fw,fh,x,y,dn,dd,dispose,blend=struct.unpack('>IIIIIHHBB',data)
   if seq!=sequence:raise ValueError('sequence gap')
   sequence+=1
   if not fw or not fh or x+fw>w or y+fh>h or dispose>2 or blend>1:raise ValueError('frame geometry or operations')
   if cur is not None:
    if not cur['data']:raise ValueError('frame without data')
    frames.append(cur)
   cur={'w':fw,'h':fh,'x':x,'y':y,'delay_num':dn,'delay_den':dd or 100,'dispose':dispose,'blend':blend,'data':bytearray()}
  elif kind==b'IDAT':
   seen_idat=True
   if cur is None:default_data.append(data)
   else:
    if frames or (cur['w'],cur['h'],cur['x'],cur['y'])!=(w,h,0,0):raise ValueError('default frame geometry')
    cur['data']+=data
  elif kind==b'fdAT':
   if len(data)<5 or cur is None or not seen_idat:raise ValueError('frame data state')
   if int.from_bytes(data[:4],'big')!=sequence:raise ValueError('sequence gap')
   sequence+=1;cur['data']+=data[4:]
  elif kind==b'IEND':
   if n!=0 or p+n+12!=len(b):raise ValueError('end marker')
   ended=True
  else:raise ValueError('unqualified ancillary/critical chunk; color metadata requires explicit preservation')
  p+=n+12
 if not ended or cur is None or not cur['data']:raise ValueError('incomplete animation')
 frames.append(cur)
 if len(frames)!=num:raise ValueError('frame count')
 for i,f in enumerate(frames):
  f['id']=i;f['data']=bytes(f['data']);f['payload_sha256']=sha(f['data']);f['view']=png(f['w'],f['h'],f['data'])
 return {'w':w,'h':h,'frames':frames,'separate_default_image':bool(default_data),'default_data_bytes':sum(map(len,default_data))}

def plan(info,target,unsafe_anchor=False,ignore_disposal=False):
 fs=info['frames'];w,h=info['w'],info['h']
 if target not in range(len(fs)):raise ValueError('target')
 anchors=[f['id'] for f in fs[:target+1] if (f['w'],f['h'],f['x'],f['y'],f['blend'])==(w,h,0,0,0) and (f['id']==target or f['dispose']!=2 or unsafe_anchor)]
 start=max(anchors) if anchors else 0;ops=[]
 for i in range(start,target+1):
  f=fs[i]
  if i<target and not ignore_disposal:
   if f['dispose']==2:continue
   if f['dispose']==1:ops.append({'op':'clear','id':i});continue
  ops.append({'op':'draw','id':i})
 return {'target':target,'anchor':start,'ops':ops,'decoded_frames':sum(o['op']=='draw' for o in ops)}
