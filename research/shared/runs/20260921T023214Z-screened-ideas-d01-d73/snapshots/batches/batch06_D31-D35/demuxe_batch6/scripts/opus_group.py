"""D31: startup-preserving, bounded fixed-mode Opus grouping. No sample decoding in adapter."""
from common import *
import ctypes as C,ctypes.util,numpy as np
op=C.CDLL(ctypes.util.find_library('opus'))
op.opus_repacketizer_create.restype=C.c_void_p
op.opus_repacketizer_init.argtypes=[C.c_void_p];op.opus_repacketizer_init.restype=C.c_void_p
op.opus_repacketizer_destroy.argtypes=[C.c_void_p]
op.opus_repacketizer_cat.argtypes=[C.c_void_p,C.c_void_p,C.c_int]
op.opus_repacketizer_out.argtypes=[C.c_void_p,C.c_void_p,C.c_int]
op.opus_repacketizer_out_range.argtypes=[C.c_void_p,C.c_int,C.c_int,C.c_void_p,C.c_int]
op.opus_packet_get_nb_samples.argtypes=[C.c_void_p,C.c_int,C.c_int]
op.opus_packet_get_nb_frames.argtypes=[C.c_void_p,C.c_int]

def ogg_read(b):
 pos=0;packets=[];carry=bytearray();end=None;serial=None;seq=0
 while pos<len(b):
  if pos+27>len(b) or b[pos:pos+5]!=b'OggS\0':raise ValueError('page header')
  n=b[pos+26];h=27+n
  if pos+h>len(b):raise ValueError('lace overflow')
  lens=b[pos+27:pos+h];size=h+sum(lens);q=bytearray(b[pos:pos+size])
  if len(q)!=size:raise ValueError('short page')
  stored=int.from_bytes(q[22:26],'little');q[22:26]=b'\0'*4
  if stored!=crc(q,32,0x04c11db7):raise ValueError('page CRC')
  s=int.from_bytes(q[14:18],'little');seqn=int.from_bytes(q[18:22],'little')
  if serial is not None and s!=serial:raise ValueError('multiplex/chaining excluded')
  serial=s
  if seqn!=seq:raise ValueError('page gap')
  seq+=1;p=h
  for ln in lens:
   carry+=q[p:p+ln];p+=ln
   if ln<255:packets.append(bytes(carry));carry.clear()
  if q[5]&4:end=int.from_bytes(q[6:14],'little')
  pos+=size
 if carry or end is None:raise ValueError('incomplete stream')
 return packets,end

def ogg_page(packet,serial,seq,granule,flags=0):
 lace=[255]*(len(packet)//255)+[len(packet)%255]
 if len(lace)>255:raise ValueError('large packet')
 q=bytearray(b'OggS\0'+bytes([flags])+struct.pack('<QII',granule,serial,seq)+b'\0'*4+bytes([len(lace)])+bytes(lace)+packet)
 q[22:26]=crc(q,32,0x04c11db7).to_bytes(4,'little');return bytes(q)

def encode_pages(headers,packets,end):
 out=ogg_page(headers[0],601,0,0,2)+ogg_page(headers[1],601,1,0);ticks=0
 for i,p in enumerate(packets):
  d=op.opus_packet_get_nb_samples(p,len(p),48000)
  if d<0:raise ValueError('packet duration')
  ticks+=d;last=i==len(packets)-1
  out+=ogg_page(p,601,i+2,end if last else ticks,4 if last else 0)
 return out

def regroup(packets,prefix=32,maxgroup=8):
 if maxgroup not in [1,8,48] or prefix<0:raise ValueError('policy')
 for p in packets:
  if not p or op.opus_packet_get_nb_frames(p,len(p))!=1 or op.opus_packet_get_nb_samples(p,len(p),48000)!=120:raise ValueError('single 2.5ms frames only')
 if len(set(p[0]&0xfc for p in packets))!=1:raise ValueError('configuration change')
 groups=[];i=0;rp=op.opus_repacketizer_create();splitback=[]
 try:
  while i<len(packets):
   take=1 if i<prefix else min(maxgroup,len(packets)-i);chunk=packets[i:i+take];op.opus_repacketizer_init(rp)
   storage=[C.create_string_buffer(p) for p in chunk] # pointers must live through out()
   for p,b in zip(chunk,storage):
    if op.opus_repacketizer_cat(rp,b,len(p))!=0:raise ValueError('incompatible packets')
   dest=C.create_string_buffer(65536);n=op.opus_repacketizer_out(rp,dest,len(dest))
   if n<0:raise ValueError('repacketizer output')
   output=dest.raw[:n];groups.append(output)
   for k in range(take):
    n=op.opus_repacketizer_out_range(rp,k,k+1,dest,len(dest))
    if n<0:raise ValueError('split')
    splitback.append(dest.raw[:n])
   i+=take
 finally:op.opus_repacketizer_destroy(rp)
 if splitback!=packets:raise ValueError('constituent payloads changed')
 return groups

if __name__=='__main__':
 ff('-f','lavfi','-i','aevalsrc=0.18*sin(2*PI*(400+35*t)*t)+0.07*sin(2*PI*1211*t):s=48000:d=2.137','-c:a','libopus','-application','lowdelay','-frame_duration','2.5','-b:a','64k',F/'short_source.opus')
 b=(F/'short_source.opus').read_bytes();ps,end=ogg_read(b);headers,packets=ps[:2],ps[2:]
 info={'source_packets':len(packets),'source_bytes':len(b),'pre_skip':int.from_bytes(headers[0][10:12],'little'),'final_granule':end,'variants':{}}
 baseline=ff('-c:a','libopus','-i',F/'short_source.opus','-f','f32le','-')
 for name,prefix,group in [('unbatched',len(packets),1),('adaptive',32,8),('uniform',0,8)]:
  pp=regroup(packets,prefix,group);out=encode_pages(headers,pp,end);(F/(name+'.opus')).write_bytes(out)
  wav=ff('-c:a','libopus','-i',F/(name+'.opus'),'-f','f32le','-')
  ff('-i',F/(name+'.opus'),'-c:a','copy',F/(name+'.webm'))
  bw=ff('-c:a','libopus','-i',F/(name+'.webm'),'-f','f32le','-')
  info['variants'][name]={'packets':len(pp),'bytes':len(out),'webm_bytes':(F/(name+'.webm')).stat().st_size,'splitback_exact':True,'host_opus_pcm_exact':wav==baseline,'host_webm_pcm_exact':bw==baseline,'host_samples':len(wav)//4,'packet_durations_samples':[op.opus_packet_get_nb_samples(p,len(p),48000) for p in pp]}
 # Actual incompatible TOC and oversized policies reject, while a dropped-frame control has changed output.
 bad=packets.copy();bad[5]=bytes([bad[5][0]^4])+bad[5][1:]
 info['wrong_config']=reject(lambda:regroup(bad));info['unsupported_policy']=reject(lambda:regroup(packets,0,49));info['empty_packet']=reject(lambda:regroup([b'']))
 badfile=encode_pages(headers,regroup(packets,32,8),end-120);(F/'wrong_tail.opus').write_bytes(badfile)
 out=ff('-c:a','libopus','-i',F/'wrong_tail.opus','-f','f32le','-');info['wrong_tail']={'host_equal':out==baseline,'frames':len(out)//4}
 save('opus_component.json',info);print(json.dumps({k:v if k!='variants' else {n:{kk:vv for kk,vv in r.items() if kk!='packet_durations_samples'}for n,r in v.items()} for k,v in info.items()},indent=2))
