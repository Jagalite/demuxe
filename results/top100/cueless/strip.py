# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).parent;b=(r/'indexed.webm').read_bytes()
def vint(b,p,tag=False):
 n=1
 while not b[p]&(128>>(n-1)):n+=1
 v=int.from_bytes(b[p:p+n],'big');return (v if tag else v&((1<<(7*n))-1)),p+n
def elems(b):
 p=0
 while p<len(b):
  t,q=vint(b,p,True);n,q=vint(b,q);yield t,b[q:min(q+n,len(b))];p=min(q+n,len(b))
def box(t,b):
 n=1
 while len(b)>=(1<<(7*n))-1:n+=1
 return t.to_bytes((t.bit_length()+7)//8,'big')+((1<<(7*n))|len(b)).to_bytes(n,'big')+b
removed=[]
def change(t,p):
 if t in [0x114d9b74,0x1c53bb6b,0xbf]:removed.append(hex(t));return b''
 if t==0x18538067:return box(t,b''.join(change(a,c) for a,c in elems(p)))
 return box(t,p)
result=b''.join(change(t,p) for t,p in elems(b));(r/'cueless.webm').write_bytes(result)
probe=lambda f:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(f)]))['packets']
a=probe(r/'indexed.webm');c=probe(r/'cueless.webm');assert [(x['pts'],x['dts'],x['data_hash']) for x in a]==[(x['pts'],x['dts'],x['data_hash']) for x in c];assert '0x1c53bb6b' in removed
(r/'fixture.json').write_text(json.dumps({'packets':len(a),'packetPayloadPtsDtsExact':True,'removed':removed,'indexedBytes':len(b),'cuelessBytes':len(result),'scope':'30sec repeated VP9 source; only SeekHead/Cues and segment CRC removed, preserving all coded packets/timestamps.','passed':True},indent=2)+'\n')
