"""D47. Bounded native-decode Vorbis views across actual short/long blocks.
SPDX-License-Identifier: MIT. Single serial, finite streams, no multiplexing.
"""
from common import *
import numpy as np,ctypes as C,ctypes.util
lib=C.CDLL(ctypes.util.find_library('vorbis'))
class Info(C.Structure):
 _fields_=[('version',C.c_int),('channels',C.c_int),('rate',C.c_long),('upper',C.c_long),('nominal',C.c_long),('lower',C.c_long),('window',C.c_long),('setup',C.c_void_p)]
class Comment(C.Structure):
 _fields_=[('comments',C.POINTER(C.c_char_p)),('lengths',C.POINTER(C.c_int)),('count',C.c_int),('vendor',C.c_char_p)]
class Packet(C.Structure):
 _fields_=[('packet',C.c_void_p),('bytes',C.c_long),('bos',C.c_long),('eos',C.c_long),('granule',C.c_int64),('number',C.c_int64)]
lib.vorbis_info_init.argtypes=[C.POINTER(Info)];lib.vorbis_info_clear.argtypes=[C.POINTER(Info)]
lib.vorbis_comment_init.argtypes=[C.POINTER(Comment)];lib.vorbis_comment_clear.argtypes=[C.POINTER(Comment)]
lib.vorbis_synthesis_headerin.argtypes=[C.POINTER(Info),C.POINTER(Comment),C.POINTER(Packet)]
lib.vorbis_packet_blocksize.argtypes=[C.POINTER(Info),C.POINTER(Packet)];lib.vorbis_packet_blocksize.restype=C.c_long
lib.vorbis_version_string.restype=C.c_char_p
T=[]
for i in range(256):
 v=i<<24
 for _ in range(8):v=((v<<1)^0x04c11db7 if v&0x80000000 else v<<1)&0xffffffff
 T.append(v)
def crc(b):
 c=0
 for v in b:c=((c<<8)&0xffffffff)^T[(c>>24)^v]
 return c
def parse(b):
 if len(b)>4000000:raise ValueError('source cap')
 p=0;seq=0;serial=None;carry=bytearray();packets=[];end=None
 while p<len(b):
  if p+27>len(b)or b[p:p+5]!=b'OggS\0':raise ValueError('page header')
  n=b[p+26];header=27+n;lace=b[p+27:p+header];z=header+sum(lace)
  if len(lace)!=n or p+z>len(b):raise ValueError('page bound')
  q=bytearray(b[p:p+z]);stored=int.from_bytes(q[22:26],'little');q[22:26]=bytes(4)
  if crc(q)!=stored:raise ValueError('page CRC')
  ser=int.from_bytes(q[14:18],'little');sq=int.from_bytes(q[18:22],'little');flags=q[5]
  if sq!=seq or (serial is not None and ser!=serial) or end is not None:raise ValueError('single serial/sequence/EOS')
  if bool(flags&1)!=bool(carry) or (seq==0 and not flags&2):raise ValueError('BOS/continuation')
  serial=ser;seq+=1;pos=header
  for v in lace:
   carry+=q[pos:pos+v];pos+=v
   if len(carry)>65536:raise ValueError('packet cap')
   if v<255:packets.append(bytes(carry));carry.clear()
  if flags&4:end=int.from_bytes(q[6:14],'little')
  p+=z
 if carry or end is None or len(packets)<4:raise ValueError('incomplete file')
 if any(not packets[i].startswith(bytes([v])+b'vorbis')for i,v in enumerate([1,3,5])):raise ValueError('Vorbis headers required')
 return packets[:3],packets[3:],end

def blocks(headers,audio):
 inf=Info();com=Comment();lib.vorbis_info_init(C.byref(inf));lib.vorbis_comment_init(C.byref(com));out=[]
 try:
  for i,h in enumerate(headers):
   buf=C.create_string_buffer(h);p=Packet(C.cast(buf,C.c_void_p),len(h),i==0,0,0,i)
   if lib.vorbis_synthesis_headerin(C.byref(inf),C.byref(com),C.byref(p))!=0:raise ValueError('invalid Vorbis configuration')
  if inf.channels!=2 or inf.rate!=48000:raise ValueError('stereo 48k scope')
  for i,h in enumerate(audio):
   buf=C.create_string_buffer(h);p=Packet(C.cast(buf,C.c_void_p),len(h),0,0,-1,i+3);v=lib.vorbis_packet_blocksize(C.byref(inf),C.byref(p))
   if v<=0:raise ValueError('invalid packet block size')
   out.append(v)
  return out
 finally:lib.vorbis_comment_clear(C.byref(com));lib.vorbis_info_clear(C.byref(inf))
def page(packet,seq,granule,flags=0,serial=946):
 lace=[255]*(len(packet)//255)+[len(packet)%255]
 if len(lace)>255:raise ValueError('packet too large')
 b=bytearray(b'OggS\0'+bytes([flags])+struct.pack('<QII',granule,serial,seq)+bytes(4)+bytes([len(lace)])+bytes(lace)+packet);b[22:26]=crc(b).to_bytes(4,'little');return bytes(b)
def write(headers,audio,sizes,trim=None):
 out=[page(h,i,0,2 if i==0 else 0)for i,h in enumerate(headers)];cnt=0
 for i,p in enumerate(audio):
  prev=cnt
  if i:cnt+=(sizes[i-1]+sizes[i])//4
  final=i==len(audio)-1;g=cnt
  if final and trim is not None:
   if not prev<=trim<=cnt:raise ValueError('end trim must fall inside final output packet')
   g=trim
  out.append(page(p,i+3,g,4 if final else 0))
 return b''.join(out)
def comparison(a,b):
 a=np.frombuffer(a,dtype='<f4');b=np.frombuffer(b,dtype='<f4');n=min(len(a),len(b));neq=a[:n]!=b[:n];ix=np.flatnonzero(neq)
 return {'samples_a':len(a),'samples_b':len(b),'compared':n,'mismatches':int(neq.sum()),'first':int(ix[0])if len(ix)else None,'max_abs':float(np.max(abs(a[:n]-b[:n])))if n else 0,'exact':len(a)==len(b)and not neq.any()}
def decode(name):return run(['ffmpeg','-v','error','-i',F/name,'-f','f32le','-'],check=False)
def main():
 N=384013;rng=np.random.default_rng(940);t=np.arange(N)/48000;sig=np.column_stack([.15*np.sin(2*np.pi*(283*t+11*t*t)),.17*np.sin(2*np.pi*(691*t+9*t*t))]).astype('<f4')
 for start in range(1700,N-4000,15559):sig[start:start+1200]+=rng.normal(0,.12,(1200,2)).astype('<f4')
 for start in range(7300,N-3,18823):sig[start:start+2]=[.7,-.7]
 (F/'vorbis_source.f32').write_bytes(sig.tobytes())
 run(['ffmpeg','-v','error','-y','-f','f32le','-ar','48000','-ac','2','-i',F/'vorbis_source.f32','-c:a','libvorbis','-q:a','5',F/'vorbis_source.ogg'])
 source=(F/'vorbis_source.ogg').read_bytes();headers,audio,end=parse(source);sz=blocks(headers,audio)
 # Packet i returns [starts[i], starts[i+1]); first packet only primes decoder.
 starts=[0,0]
 for i in range(1,len(sz)):starts.append(starts[-1]+(sz[i-1]+sz[i])//4)
 rebuilt=write(headers,audio,sz,end);(F/'vorbis_rebuilt.ogg').write_bytes(rebuilt)
 ref=decode('vorbis_source.ogg');(F/'vorbis_reference.f32').write_bytes(ref);reb=decode('vorbis_rebuilt.ogg')
 trans=[i for i in range(2,len(sz)-3)if sz[i]!=sz[i-1]]
 selected=[trans[len(trans)//5],trans[2*len(trans)//5],trans[3*len(trans)//5],trans[4*len(trans)//5]]
 spans=[(12345,18321)]+[(starts[i]-73,starts[i]+2351)for i in selected]+[(end-4501,end)]
 jobs=[]
 for j,(a,b)in enumerate(spans):
  k=next(i for i in range(1,len(sz))if starts[i]<=a<starts[i+1]);first=k-1;last=next(i for i in range(k,len(sz))if starts[i+1]>=b)+1
  base=starts[k];wanted=b-base
  out=write(headers,audio[first:last],sz[first:last],wanted);name=f'vorbis_window{j}.ogg';(F/name).write_bytes(out)
  dec=decode(name);sliced=dec[(a-base)*8:(b-base)*8];expected=ref[a*8:b*8]
  # Wrong-history control omits required preceding packet but retains the intended crop.
  wrong=write(headers,audio[first+1:last],sz[first+1:last]);wn=f'vorbis_wrong{j}.ogg';(F/wn).write_bytes(wrong);wr=decode(wn);ws=wr[(a-base)*8:(b-base)*8]
  ho,ao,en=parse(out)
  jobs.append({'file':name,'wrong':wn,'a':a,'b':b,'base':base,'slice_start':a-base,'frames':b-a,'first_packet':first,'packet_end_exclusive':last,'packets':last-first,'output_pcm_frames':len(dec)//8,'compressed_bytes':len(out),'block_sizes':sz[first:last],'payloads_exact':ao==audio[first:last],'host':comparison(sliced,expected),'wrong_host':comparison(ws,expected)})
 bad=bytearray(source);bad[-2]^=1
 try:parse(bad);reject=False
 except ValueError:reject=True
 manifest={'source':'vorbis_source.ogg','source_bytes':len(source),'source_frames':len(ref)//8,'source_packets':len(audio),'source_granule':end,'libvorbis':lib.vorbis_version_string().decode(),'block_histogram':{str(v):sz.count(v)for v in set(sz)},'transitions':len(trans),'rebuild_host':comparison(reb,ref),'jobs':jobs,'crc_control_rejected':reject}
 save('vorbis_manifest.json',manifest);print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
