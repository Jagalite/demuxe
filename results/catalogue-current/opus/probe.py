# SPDX-License-Identifier: Apache-2.0
"""Real libopus repacketization, Ogg framing, independent complete PCM oracle."""
from pathlib import Path
import subprocess,json,ctypes,hashlib,struct
r=Path(__file__).resolve().parent
subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','sine=frequency=880:sample_rate=48000:duration=2','-c:a','libopus','-frame_duration','20','-application','audio',str(r/'original.ogg')],check=True)
b=(r/'original.ogg').read_bytes();pos=0;packets=[];pending=b'';endgranule=0
while pos<len(b):
 assert b[pos:pos+4]==b'OggS';n=b[pos+26];lace=b[pos+27:pos+27+n];offset=pos+27+n
 endgranule=struct.unpack_from('<Q',b,pos+6)[0]
 for length in lace:
  pending+=b[offset:offset+length];offset+=length
  if length<255:packets.append(pending);pending=b''
 pos=offset
assert not pending
header,tags,*coded=packets;preskip=struct.unpack_from('<H',header,10)[0]
lib=ctypes.CDLL('/opt/homebrew/opt/opus/lib/libopus.dylib')
lib.opus_repacketizer_create.restype=ctypes.c_void_p
for name,args in [('opus_repacketizer_destroy',[ctypes.c_void_p]),('opus_repacketizer_cat',[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_int]),('opus_repacketizer_out',[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_int]),('opus_repacketizer_out_range',[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_void_p,ctypes.c_int])]:getattr(lib,name).argtypes=args

def group(items):
 p=lib.opus_repacketizer_create();out=ctypes.create_string_buffer(16384)
 try:
  for x in items:assert lib.opus_repacketizer_cat(p,x,len(x))==0
  n=lib.opus_repacketizer_out(p,out,len(out));assert n>0;joined=out.raw[:n]
  # Splitting must reconstruct each original frame packet exactly.
  for i,x in enumerate(items):
   n=lib.opus_repacketizer_out_range(p,i,i+1,out,len(out));assert n>0 and out.raw[:n]==x
  return joined
 finally:lib.opus_repacketizer_destroy(p)
def crc(data):
 c=0
 for x in data:
  c^=x<<24
  for _ in range(8):c=((c<<1)^ (0x04c11db7 if c&0x80000000 else 0))&0xffffffff
 return c
def ogg(items,counts):
 pages=[];granule=0;allp=[header,tags]+items
 for i,p in enumerate(allp):
  if i>=2:granule+=counts[i-2]*960
  gp=0 if i<2 else (endgranule if i==len(allp)-1 else granule)
  lace=bytes([255]*(len(p)//255)+[len(p)%255]);assert len(lace)<=255
  page=bytearray(b'OggS'+bytes([0,2 if i==0 else (4 if i==len(allp)-1 else 0)])+struct.pack('<QIII',gp,12345,i,0)+bytes([len(lace)])+lace+p)
  struct.pack_into('<I',page,22,crc(page));pages.append(page)
 return b''.join(pages)
def pcm(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'])
base=pcm(r/'original.ogg');rows=[]
for size in [1,2,3]:
 chunks=[coded[i:i+size] for i in range(0,len(coded),size)];merged=[group(c) for c in chunks];path=r/f'group-{size}.ogg';path.write_bytes(ogg(merged,[len(c) for c in chunks]));decoded=pcm(path)
 rows.append({'frames_per_packet':size,'packets':len(merged),'bytes':path.stat().st_size,'exactPCM':decoded==base,'samples':len(decoded)//4,'constituentPacketsExactAfterSplit':True,'addedAggregationWaitMs':(size-1)*20});assert decoded==base
p=lib.opus_repacketizer_create()
try:
 assert lib.opus_repacketizer_cat(p,coded[0],len(coded[0]))==0
 incompatible=bytes([coded[0][0]^0x80])+coded[0][1:]
 rejected=lib.opus_repacketizer_cat(p,incompatible,len(incompatible))<0;assert rejected
finally:lib.opus_repacketizer_destroy(p)
result={'scope':'Restricted same-configuration Opus elementary frames; actual libopus regroup and split plus complete independent host PCM and granule trim. One-packet Ogg pages; no measured CPU benefit.','sourcePackets':len(coded),'sourceBytes':len(b),'preskip':preskip,'endGranule':endgranule,'rows':rows,'incompatibleTOCRejected':rejected,'pcmSHA256':hashlib.sha256(base).hexdigest(),'passed':True}
(r/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
