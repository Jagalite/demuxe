"""SPDX-License-Identifier: MIT. Finite sequential Opus-in-Ogg screens; multiplexing rejected."""
from common import *
import ctypes as C,ctypes.util
op=C.CDLL(ctypes.util.find_library('opus'))
op.opus_packet_get_nb_samples.argtypes=[C.c_void_p,C.c_int,C.c_int]
op.opus_get_version_string.restype=C.c_char_p
_table=[]
for i in range(256):
 c=i<<24
 for _ in range(8):c=((c<<1)^0x04c11db7 if c&0x80000000 else c<<1)&0xffffffff
 _table.append(c)
def crc(b):
 c=0
 for x in b:c=((c<<8)&0xffffffff)^_table[(c>>24)^x]
 return c

def pages(b):
 p=0
 while p<len(b):
  if p+27>len(b) or b[p:p+5]!=b'OggS\0':raise ValueError('Ogg header')
  n=b[p+26];h=27+n
  if p+h>len(b):raise ValueError('Ogg truncated lacing')
  lace=b[p+27:p+h];z=h+sum(lace)
  if p+z>len(b):raise ValueError('Ogg truncated page')
  raw=b[p:p+z];q=bytearray(raw);stored=int.from_bytes(q[22:26],'little');q[22:26]=b'\0'*4
  if crc(q)!=stored:raise ValueError('Ogg CRC')
  yield {'start':p,'end':p+z,'raw':raw,'flags':raw[5],'serial':int.from_bytes(raw[14:18],'little'),'seq':int.from_bytes(raw[18:22],'little'),'granule':int.from_bytes(raw[6:14],'little'),'lace':list(lace),'data':raw[h:]}
  p+=z

def read(b):
 packets=[];carry=bytearray();serial=None;seq=0;end=None
 for q in pages(b):
  if q['seq']!=seq or (serial is not None and q['serial']!=serial):raise ValueError('Ogg sequence/serial (chain excluded here)')
  if seq==0 and not q['flags']&2:raise ValueError('missing BOS')
  if bool(q['flags']&1)!=bool(carry):raise ValueError('continuation mismatch')
  if end is not None:raise ValueError('data after EOS')
  serial=q['serial'];seq+=1;i=0
  for n in q['lace']:
   carry+=q['data'][i:i+n];i+=n
   if len(carry)>65536:raise ValueError('packet cap')
   if n<255:packets.append(bytes(carry));carry.clear()
  if q['flags']&4:end=q['granule']
 if carry or end is None or len(packets)<3:raise ValueError('incomplete Ogg stream')
 if not packets[0].startswith(b'OpusHead') or not packets[1].startswith(b'OpusTags'):raise ValueError('not Opus')
 return packets,end

def page(packet,serial,seq,granule,flags=0):
 lace=[255]*(len(packet)//255)+[len(packet)%255]
 if len(lace)>255:raise ValueError('large page')
 q=bytearray(b'OggS\0'+bytes([flags])+struct.pack('<QII',granule,serial,seq)+b'\0'*4+bytes([len(lace)])+bytes(lace)+packet)
 q[22:26]=crc(q).to_bytes(4,'little');return bytes(q)

def write(head,tags,packets,end,serial=801):
 out=[page(head,serial,0,0,2),page(tags,serial,1,0)];ticks=0
 for i,p in enumerate(packets):
  d=op.opus_packet_get_nb_samples(p,len(p),48000)
  if d<=0:raise ValueError('bad Opus duration')
  ticks+=d;last=i==len(packets)-1
  if last and not ticks-d<=end<=ticks:raise ValueError('invalid tail')
  out.append(page(p,serial,i+2,end if last else ticks,4 if last else 0))
 return b''.join(out)
