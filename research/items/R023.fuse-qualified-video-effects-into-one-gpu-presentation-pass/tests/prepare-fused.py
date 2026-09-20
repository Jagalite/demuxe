# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);W,H=320,192;frames=[];oracles={}
for n in range(4):
 b=bytearray()
 for y in range(H):
  for x in range(W):b.extend(((x*3+n*31)%256,(y*5+n*47)%256,(x+y+n*13)%256,255))
 (p/f'frame{n}.rgba').write_bytes(b);frames.append(b)
overlay=bytearray()
for y in range(W):
 for x in range(H):overlay.extend((37,191,83, [0,64,128,192,255][((x//11)+(y//17))%5] if 40<y<270 else 0))
(p/'subtitle.rgba').write_bytes(overlay)
for mode in ['rotation','color','subtitle','combined']:
 refs=[]
 for n,b in enumerate(frames):
  out=bytearray(H*W*4)
  for y in range(W):
   for x in range(H):
    # output contains90degrotation in allmodes; mode isolates additional operation.
    si=((H-1-x)*W+y)*4;di=(y*H+x)*4
    for c in range(3):
     v=b[si+c]
     if mode in ['color','combined']:v=255-v
     if mode in ['subtitle','combined']:
      a=overlay[di+3];v=(a*overlay[di+c]+(255-a)*v+127)//255
     out[di+c]=v
    out[di+3]=255
  (p/f'{mode}{n}.rgba').write_bytes(out);refs.append(hashlib.sha256(out).hexdigest())
 oracles[mode]=refs
(p/'oracles.json').write_text(json.dumps(oracles,indent=2))
