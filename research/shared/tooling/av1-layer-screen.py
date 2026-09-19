# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,struct,subprocess,hashlib
repo=Path(__file__).resolve().parents[3];r=repo/'research/shared/runs/20260919T194500Z-av1'
def ivf(b):
 assert b[:4]==b'DKIF';rows=[];p=32
 while p<len(b):
  n,t=struct.unpack_from('<IQ',b,p);p+=12;assert p+n<=len(b);rows.append((t,b[p:p+n]));p+=n
 return rows
def obus(b):
 p=0;rows=[]
 while p<len(b):
  start=p;h=b[p];p+=1;assert not h&0x81 and h&2
  typ=(h>>3)&15;tid=sid=0
  if h&4:tid=b[p]>>5;sid=(b[p]>>3)&3;p+=1
  n=shift=0
  while True:
   v=b[p];p+=1;n|=(v&127)<<shift;shift+=7;assert shift<=56
   if not v&128:break
  assert p+n<=len(b);rows.append({'type':typ,'temporal':tid,'spatial':sid,'bytes':b[start:p+n],'payload':b[p:p+n]});p+=n
 return rows
def seq_mask(payload):
 bits=''.join(f'{x:08b}' for x in payload);p=0
 def get(n):
  nonlocal p
  v=int(bits[p:p+n],2);p+=n;return v
 profile=get(3);still=get(1);reduced=get(1);assert not reduced
 timing=get(1);assert not timing,'timing unsupported in restricted pilot'
 delay=get(1);count=get(5)+1;masks=[]
 for _ in range(count):
  masks.append(get(12));level=get(5)
  if level>7:get(1)
  if delay:
   if get(1):get(4)
 return masks
b=(r/'temporal.ivf').read_bytes();frames=ivf(b);seq=next(o for _,p in frames for o in obus(p) if o['type']==1);masks=seq_mask(seq['payload']);assert masks==[259,257],masks
selected=257;out=[];kept=[];dropped=0
for t,packet in frames:
 os=obus(packet);pieces=[];hasframe=False
 for o in os:
  if o['type'] in (1,2) or ((selected&(1<<o['temporal'])) and (selected&(1<<(o['spatial']+8)))):
   pieces.append(o['bytes']);hasframe|=o['type'] in (3,6)
  else:dropped+=1
 if hasframe:out.append((t,b''.join(pieces)));kept.append(t)
assert len(out)==12 and kept==list(range(0,24,2))
header=bytearray(b[:32]);struct.pack_into('<I',header,24,len(out));extracted=bytes(header)+b''.join(struct.pack('<IQ',len(p),t)+p for t,p in out);(r/'extracted.ivf').write_bytes(extracted)
def ref(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vsync','0','-pix_fmt','yuv420p','-f','rawvideo','-'])
full=ref(r/'temporal.ivf');candidate=ref(r/'extracted.ivf');stride=160*96*3//2;expected=b''.join(full[i*stride:(i+1)*stride] for i in kept)
libbase=(r/'base-corrected.yuv').read_bytes();assert len(full)==24*stride and candidate==expected==libbase
# Removing the first required keyframe must not reproduce the requested full sequence.
bad=bytes(header)+b''.join(struct.pack('<IQ',len(p),t)+p for t,p in out[1:]);(r/'missing-key.ivf').write_bytes(bad)
negative=subprocess.run(['ffmpeg','-v','error','-i',str(r/'missing-key.ivf'),'-vsync','0','-pix_fmt','yuv420p','-f','rawvideo','-'],capture_output=True);assert negative.stdout!=candidate
(r/'negative.log').write_bytes(negative.stderr)
(r/'base-reference.yuv').write_bytes(candidate)
a=(r/'full-corrected.yuv').read_bytes();tile=(r/'tile-corrected.yuv').read_bytes();expectedTile=b'';wrongTile=b'';offset=0
for w,h in [(512,512),(256,256),(256,256)]:
 expectedTile+=b''.join(a[offset+y*w+w//2:offset+y*w+w] for y in range(h//2,h))
 wrongTile+=b''.join(a[offset+y*w:offset+y*w+w//2] for y in range(h//2));offset+=w*h
assert tile==expectedTile and tile!=wrongTile
result={'tile':{'allPlanesExact':True,'fullBytes':len(a),'selectedBytes':len(tile),'wrongQuadrantRejected':True,'scope':'Actual libaom tile-selection controls and full-decode independent crop oracle. Same library baseline; not independent decoder implementation, no browser or sparse transport claim.','requiredAPI':'AV1D_EXT_TILE_DEBUG=1 for explicit selected pixel image'},'operatingPoint':{'advertisedMasks':masks,'selectedMask':selected,'fullFrames':24,'selectedFrames':12,'keptTimestamps':kept,'codedOBUsDropped':dropped,'sourceBytes':len(b),'extractedBytes':len(extracted),'independentFFmpegPixelsExact':True,'libaomOperatingPointPixelsExact':True,'missingKeyRejected':True,'unsupportedMaskRejected':258 not in masks,'scope':'Restricted one-spatial/two-temporal-layer source, no decoder model or timing info; preserves selected timestamps and coded OBU bytes. No arbitrary AV1 extraction.'},'passed':True}
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
