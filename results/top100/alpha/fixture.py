# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,struct,hashlib
r=Path(__file__).parent
raw=bytes(v for f in range(3) for y in range(32) for x in range(32) for v in (255,0,0,[0,128,255][(x//11+f)%3]));(r/'source.rgba').write_bytes(raw)
cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pixel_format','rgba','-video_size','32x32','-framerate','3','-i',str(r/'source.rgba'),'-vf','format=yuva420p','-c:v','libvpx','-auto-alt-ref','0','-g','1','-crf','4','-b:v','1M',str(r/'reference.webm')];subprocess.run(cmd,check=True)
def vint(b,p,tag=False):
 n=1
 while n<=8 and not b[p]&(128>>(n-1)):n+=1
 if n>8:raise ValueError('vint')
 v=int.from_bytes(b[p:p+n],'big');return (v if tag else v&((1<<(7*n))-1)),p+n
def elems(b):
 p=0
 while p<len(b):
  t,q=vint(b,p,True);n,q=vint(b,q);assert q+n<=len(b);yield t,b[q:q+n];p=q+n
def box(t,b):
 n=1
 while len(b)>=(1<<(7*n))-1:n+=1
 return t.to_bytes((t.bit_length()+7)//8,'big')+((1<<(7*n))|len(b)).to_bytes(n,'big')+b
pairs=[]
def walk(t,b):
 if t==0xa0:
  e=dict(elems(b));block=e[0xa1];a=dict(elems(dict(elems(e[0x75a1]))[0xa6]));assert a.get(0xee,b'\1')==b'\1';_,h=vint(block,0);timestamp=int.from_bytes(block[h:h+2],'big',signed=True);pairs.append({'timestamp':timestamp,'color':list(block[h+3:]),'alpha':list(a[0xa5])})
 elif t in [0x18538067,0x1f43b675]:
  for tag,data in elems(b):walk(tag,data)
b=(r/'reference.webm').read_bytes()
for t,d in elems(b):walk(t,d)
assert len(pairs)==3
# Rebuild every BlockAdditional from independently identified color/mask packet pair.
i=0
def rebuild(t,b):
 global i
 if t in [0x114d9b74,0x1c53bb6b,0xbf]:return b''
 if t==0xa0:
  row=pairs[i];i+=1;block=b'\x81'+row['timestamp'].to_bytes(2,'big',signed=True)+b'\0'+bytes(row['color']);return box(t,box(0xa1,block)+box(0x75a1,box(0xa6,box(0xee,b'\1')+box(0xa5,bytes(row['alpha'])))))
 if t in [0x18538067,0x1f43b675]:return box(t,b''.join(rebuild(tag,data) for tag,data in elems(b)))
 return box(t,b)
candidate=b''.join(rebuild(t,d) for t,d in elems(b));(r/'candidate.webm').write_bytes(candidate)
decode=lambda f:subprocess.check_output(['ffmpeg','-v','error','-c:v','libvpx','-i',str(f),'-pix_fmt','rgba','-fps_mode','passthrough','-f','rawvideo','-'])
reference=decode(r/'reference.webm');actual=decode(r/'candidate.webm');assert reference==actual
(r/'input.json').write_text(json.dumps({'pairs':pairs,'rgba':[list(reference[x:x+4096]) for x in range(0,len(reference),4096)]}))
(r/'fixture.json').write_text(json.dumps({'frames':len(pairs),'hostRGBAExact':True,'packetPairSHA256':[hashlib.sha256(bytes(p['color'])+bytes(p['alpha'])).hexdigest() for p in pairs],'command':cmd,'scope':'Mux-only reconstruction from suitable VP8 color/alpha pair extracted from known-good encoder output; source preparation separate.'},indent=2))
