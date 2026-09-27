# SPDX-License-Identifier: Apache-2.0
# Diagnostic copy only: restore source-relative keyframe PTS without changing payloads.
import pathlib,struct,json,hashlib
source=pathlib.Path('build/head-to-head/assets-auto-main-a563f345-20260927-02/fixtures/hls-hevc')
out=pathlib.Path('results/cpu-gap-investigation/corrected-hls');out.mkdir(exist_ok=True)
changes=[]
def boxes(b,start,end):
 while start+8<=end:
  size,typ=struct.unpack_from('>I4s',b,start)
  if size<8:raise ValueError('Invalid box')
  yield start,size,typ
  start+=size
for p in source.iterdir():
 if p.suffix not in ['.mp4','.m4s','.m3u8']:continue
 b=bytearray(p.read_bytes())
 if p.suffix=='.m4s' and p.name!='index0.m4s':
  for i,n,t in boxes(b,0,len(b)):
   if t!=b'moof':continue
   for j,m,u in boxes(b,i+8,i+n):
    if u!=b'traf':continue
    children=list(boxes(b,j+8,j+m));tfhd=next(x for x in children if x[2]==b'tfhd')[0]
    if struct.unpack_from('>I',b,tfhd+12)[0]!=1:continue
    k=next(x for x in children if x[2]==b'trun')[0];flags=int.from_bytes(b[k+9:k+12],'big')
    assert flags==0xf01,hex(flags)
    offset=k+32;old=struct.unpack_from('>I',b,offset)[0]
    struct.pack_into('>I',b,offset,old+544) # 34ms at the fixture's 16000Hz video timescale
    changes.append(dict(file=p.name,offset=offset,old=old,new=old+544))
 (out/p.name).write_bytes(b)
(out/'changes.json').write_text(json.dumps(changes,indent=2))
print(len(changes),'timestamp fields repaired; all media payloads unchanged')
