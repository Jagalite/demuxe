# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import zlib,json,subprocess,hashlib
r=Path(__file__).parent;source=Path('results/full-completion/continuity/green-ordered.webm');b=source.read_bytes()
def vint(b,p,tag=False):
 n=1
 while n<=8 and not b[p]&(128>>(n-1)):n+=1
 if n>8:raise ValueError('invalid EBML vint')
 v=int.from_bytes(b[p:p+n],'big');return (v if tag else v&((1<<(7*n))-1)),p+n

def elems(b):
 p=0
 while p<len(b):
  tag,q=vint(b,p,True);n,q=vint(b,q);end=min(q+n,len(b));yield tag,b[q:end];p=end

def box(tag,data):
 t=tag.to_bytes((tag.bit_length()+7)//8,'big');n=1
 while len(data)>=(1<<(7*n))-1:n+=1
 return t+((1<<(7*n))|len(data)).to_bytes(n,'big')+data
count=0;rawbytes=0;compressedbytes=0
def change(tag,payload):
 global count,rawbytes,compressedbytes
 if tag in [0x114d9b74,0x1c53bb6b,0xbf]:return b''
 if tag in [0xa3,0xa1]:
  _,p=vint(payload,0);p+=3
  assert not payload[p-1]&6,'Laces intentionally outside fixture'
  src=payload[p:];dst=zlib.compress(src);count+=1;rawbytes+=len(src);compressedbytes+=len(dst)
  return box(tag,payload[:p]+dst)
 if tag in [0x18538067,0x1654ae6b,0xae,0x1f43b675,0xa0]:
  data=b''.join(change(t,d) for t,d in elems(payload))
  if tag==0xae:
   compression=box(0x5034,box(0x4254,b'\0'))
   encoding=box(0x6240,box(0x5031,b'\0')+box(0x5032,b'\1')+box(0x5033,b'\0')+compression)
   data+=box(0x6d80,encoding)
  return box(tag,data)
 return box(tag,payload)
out=b''.join(change(t,p) for t,p in elems(b));(r/'zlib.mkv').write_bytes(out)
probe=lambda f:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(f)]))['packets']
a=probe(source);c=probe(r/'zlib.mkv');identity=[(x['codec_type'],x['pts'],x['data_hash']) for x in a]==[(x['codec_type'],x['pts'],x['data_hash']) for x in c];assert identity
(r/'fixture.json').write_text(json.dumps({'scope':'Actual ContentEncodings scope1/order0/type0/zlib, every unlaced video/audio block compressed, configuration/trim retained.','blocks':count,'rawPayloadBytes':rawbytes,'compressedPayloadBytes':compressedbytes,'independentHostPacketAndPtsExact':identity,'sourceSHA256':hashlib.sha256(b).hexdigest(),'candidateSHA256':hashlib.sha256(out).hexdigest(),'passed':True},indent=2)+'\n')
