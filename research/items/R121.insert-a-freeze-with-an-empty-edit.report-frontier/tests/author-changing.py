# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,struct,json,hashlib
h=Path(__file__).resolve().parents[1];r=h/'evidence/20260919T220200Z-changing-empty-edit';cmd=['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=160x96:rate=12:duration=2','-an','-c:v','libx264','-preset','ultrafast','-g','12','-bf','0',str(r/'source.mp4')];subprocess.run(cmd,check=True);b=(r/'source.mp4').read_bytes()
def boxes(data):
 at=0
 while at<len(data):
  n,t=struct.unpack('>I4s',data[at:at+8]);assert n>=8 and at+n<=len(data);yield t,data[at+8:at+n];at+=n
def box(t,body):return struct.pack('>I4s',len(body)+8,t)+body
media_scale=None;movie_scale=None
for t,d in boxes(b):
 if t==b'moov':
  for k,x in boxes(d):
   if k==b'mvhd':movie_scale=int.from_bytes(x[12:16],'big')
   if k==b'trak':
    for j,y in boxes(x):
     if j==b'mdia':
      for z,w in boxes(y):
       if z==b'mdhd':media_scale=int.from_bytes(w[12:16],'big')
assert movie_scale and media_scale
elst=box(b'elst',struct.pack('>II',0,3)+b''.join(struct.pack('>IiHH',movie_scale,time,1,0) for time in [0,-1,media_scale]))
def rewrite(t,d):
 if t in [b'moov',b'trak']:return box(t,b''.join(rewrite(k,x) for k,x in boxes(d)))
 if t==b'edts':return box(t,elst)
 if t in [b'mvhd',b'tkhd']:
  x=bytearray(d);off=16 if t==b'mvhd' else 20;assert x[0]==0;x[off:off+4]=(movie_scale*3).to_bytes(4,'big');return box(t,x)
 return box(t,d)
new=b''.join(rewrite(t,d) for t,d in boxes(b));(r/'freeze.mp4').write_bytes(new);assert [d for t,d in boxes(b) if t==b'mdat']==[d for t,d in boxes(new) if t==b'mdat'];(r/'author-results.json').write_text(json.dumps({'mdatUnchanged':True,'sourceSHA256':hashlib.sha256(b).hexdigest(),'movieTimescale':movie_scale,'mediaTimescale':media_scale,'editSeconds':[[1,0],[1,-1],[1,1]],'audioPolicy':'Video-only fixture. No audio gap policy or soundtrack is claimed.'},indent=2)+'\n');(r/'commands.log').write_text(json.dumps(cmd)+'\n')
