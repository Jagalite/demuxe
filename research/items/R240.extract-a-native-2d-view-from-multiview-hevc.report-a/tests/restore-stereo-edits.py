# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json
p=pathlib.Path(sys.argv[1]);src=(p/'source.mov').read_bytes();dur=121615;ts=30000
# Pinned movie has one video edit, mediaTime0 and duration121615 at30k. Remux's mediaTime2002 compensates reordered DTS and must stay.
changes={}
for name in ['stereo']:
 b=bytearray((p/(name+'.mp4')).read_bytes());rows=[]
 def walk(at,end):
  while at+8<=end:
   size=int.from_bytes(b[at:at+4],'big');typ=bytes(b[at+4:at+8]);assert size>=8
   q=at+8
   if typ in [b'mvhd',b'tkhd',b'elst']:
    assert b[q]==0
    if typ==b'mvhd':assert int.from_bytes(b[q+12:q+16],'big')==ts;off=q+16
    elif typ==b'tkhd':off=q+20
    else:assert int.from_bytes(b[q+4:q+8],'big')==1;off=q+8
    old=int.from_bytes(b[off:off+4],'big');b[off:off+4]=dur.to_bytes(4,'big');rows.append({'box':typ.decode(),'old':old,'new':dur})
   if typ in [b'moov',b'trak',b'edts']:walk(q,at+size)
   at+=size
 walk(0,len(b));assert len(rows)==3;(p/(name+'-edited.mp4')).write_bytes(b);changes[name]=rows
(p/'stereo-edit-restoration.json').write_text(json.dumps({'sourceVideoEditDuration':dur,'movieTimescale':ts,'preservedRemuxMediaTime':2002,'changes':changes,'reason':'Original presentation hides reordered trailing reference pictures. Retain coded packet dependencies but preserve display edit duration, not muxer-derived maximumPTS duration.'},indent=2))
