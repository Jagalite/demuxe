# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).parent;script=Path('fixtures/m0.ass').read_text().replace('0:00:12.00','0:00:25.00');(r/'source.ass').write_text(script)
cmd=['ffmpeg','-v','error','-y','-i','build/local-screening/media/bbb-key-060.mp4','-i',str(r/'source.ass'),'-map','0:v','-map','0:a','-map','1:s','-c','copy','-attach','fixtures/DejaVuSans.ttf','-metadata:s:t','mimetype=application/x-truetype-font',str(r/'source.mkv')];subprocess.run(cmd,check=True);file=(r/'source.mkv').open('rb');size=(r/'source.mkv').stat().st_size;reads=[]
def read(p,n):
 if n<0 or n>1048576 or sum(x[1] for x in reads)+n>2097152:raise ValueError('read budget')
 file.seek(p);data=file.read(n)
 if len(data)!=n:raise ValueError('bounds')
 reads.append((p,n));return data
def vint(p,tag=False):
 first=read(p,1)[0];n=1
 while n<=8 and not first&(128>>(n-1)):n+=1
 if n>8:raise ValueError('vint')
 value=int.from_bytes(bytes([first])+read(p+1,n-1),'big');return (value if tag else value&((1<<(7*n))-1)),p+n
def elems(start,end):
 p=start
 while p<end:
  tag,q=vint(p,True);n,q=vint(q)
  if q+n>end:raise ValueError('element bounds')
  yield tag,q,n;p=q+n
def fields(p,n):return {t:(a,b) for t,a,b in elems(p,p+n)}
def uint(pair):return int.from_bytes(read(*pair),'big')
seg=next((p,n) for t,p,n in elems(0,size) if t==0x18538067);children=list(elems(seg[0],sum(seg)));tracks=next((p,n) for t,p,n in children if t==0x1654ae6b);track=None;header=None
for t,p,n in elems(tracks[0],sum(tracks)):
 if t!=0xae:continue
 f=fields(p,n)
 if 0x86 in f and read(*f[0x86])==b'S_TEXT/ASS':track=uint(f[0xd7]);header=read(*f[0x63a2]).decode();break
assert track is not None
fonts=[]
attachments=next((p,n) for t,p,n in children if t==0x1941a469)
for t,p,n in elems(attachments[0],sum(attachments)):
 if t!=0x61a7:continue
 f=fields(p,n);name=read(*f[0x466e]).decode();data=read(*f[0x465c]);assert name.endswith('.ttf');fonts.append((name,data))
assert len(fonts)==1 and fonts[0][1]==Path('fixtures/DejaVuSans.ttf').read_bytes();(r/'extracted.ttf').write_bytes(fonts[0][1])
cues=[]
for tag,start,length in children:
 if tag!=0x1f43b675:continue
 clock=0
 for t,p,n in elems(start,start+length):
  if t==0xe7:clock=uint((p,n))
  elif t==0xa0:
   f=fields(p,n)
   if 0xa1 not in f:continue
   bp,bn=f[0xa1];tn,q=vint(bp)
   if tn!=track:continue
   block=read(q,bn-(q-bp));assert not block[2]&6;pts=clock+int.from_bytes(block[:2],'big',signed=True);duration=uint(f[0x9b]);cues.append((pts,duration,block[3:].decode()))
def stamp(ms):
 centi=ms//10;return f'{centi//360000}:{centi//6000%60:02}:{centi//100%60:02}.{centi%100:02}'
lines=[]
for pts,duration,text in cues:
 parts=text.split(',',8);assert len(parts)==9;lines.append(f'Dialogue: {parts[1]},{stamp(pts)},{stamp(pts+duration)},'+','.join(parts[2:]))
extracted=header.rstrip()+'\n'+'\n'.join(lines)+'\n';(r/'extracted.ass').write_text(extracted);assert len(cues)==3 and any(p<=15000<p+d for p,d,_ in cues)
(r/'result.json').write_text(json.dumps({'scope':'Restricted finite EBML Matroska, selected ASS BlockGroups and attached font,2MiB total range-read cap. Skips all video/audio payloads; no generic remote index or default route change.','sourceBytes':size,'readBytes':sum(n for _,n in reads),'readCalls':len(reads),'budgetBytes':2097152,'cues':len(cues),'activeCueAt15Seconds':True,'fontExact':True,'fontSHA256':hashlib.sha256(fonts[0][1]).hexdigest(),'command':cmd,'passed':True},indent=2)+'\n')
