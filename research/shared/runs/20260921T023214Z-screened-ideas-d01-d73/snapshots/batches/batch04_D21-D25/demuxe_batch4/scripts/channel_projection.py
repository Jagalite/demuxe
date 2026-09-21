"""Restricted FLAC independent constant/verbatim channel projection.
No sample decoding or downmix. Source output MD5 is cleared as unknown.
SPDX-License-Identifier: MIT.
"""
from common import crc

def project(data,selected,request='select_channels'):
 if request!='select_channels':raise ValueError('explicit channel-selection request required; not downmix or surround playback')
 if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('STREAMINFO-only profile')
 conf=int.from_bytes(data[18:26],'big');bps=((conf>>36)&31)+1;channels=((conf>>41)&7)+1
 if conf>>44!=48000 or bps!=24 or channels!=6:raise ValueError('six independent 24-bit channels at 48 kHz required')
 if len(selected)!=2 or len(set(selected))!=2 or any(c not in range(6) for c in selected):raise ValueError('two distinct valid channels required')
 p=42;frames=[];copied=0;total=0
 while p<len(data):
  st=p
  if data[p:p+4]!=b'\xff\xf8\x7a\x50':raise ValueError('unsupported frame syntax / decorrelation')
  p+=4;lead=data[p];width=1
  if lead&128:
   width=0
   for bit in [128,64,32,16,8,4,2]:
    if lead&bit:width+=1
    else:break
   if width not in range(2,7) or any(x&192!=128 for x in data[p+1:p+width]):raise ValueError('bad number')
  p+=width
  if p+3>len(data):raise ValueError('truncated header')
  n=int.from_bytes(data[p:p+2],'big')+1;p+=3
  if crc(data[st:p],8,7):raise ValueError('bad header CRC')
  header=bytearray(data[st:p]);header[3]=0x10;header[-1]=crc(header[:-1],8,7)
  spans=[]
  for c in range(6):
   if p>=len(data):raise ValueError('truncated subframe')
   kind=data[p];length=1+3*(1 if kind==0 else n)
   if kind not in (0,2):raise ValueError('constant/verbatim, no wasted bits only')
   if p+length>len(data):raise ValueError('truncated payload')
   spans.append(data[p:p+length]);p+=length
  p+=2
  if p>len(data) or crc(data[st:p],16,0x8005):raise ValueError('bad frame CRC')
  body=bytes(header)+b''.join(spans[c] for c in selected)
  copied+=sum(len(spans[c])-1 for c in selected)
  frames.append(body+crc(body,16,0x8005).to_bytes(2,'big'));total+=n
 if total!=conf&((1<<36)-1):raise ValueError('sample total mismatch')
 h=bytearray(data[:42]);h[12:15]=min(map(len,frames)).to_bytes(3,'big');h[15:18]=max(map(len,frames)).to_bytes(3,'big')
 h[18:26]=((conf&~(7<<41))|(1<<41)).to_bytes(8,'big');h[26:42]=bytes(16)
 out=bytes(h)+b''.join(frames)
 return out,{'frames':len(frames),'samples_per_channel':total,'selected_channels':selected,'copied_sample_payload_bytes':copied,'size_before':len(data),'size_after':len(out),'output_md5':'unknown (zero)','sample_values_decoded':0}
