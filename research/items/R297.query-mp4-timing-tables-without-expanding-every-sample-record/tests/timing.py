# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,struct,bisect
p=Path(__file__).resolve().parents[1];r=p/'evidence/20260919T200000Z-signed-timing-origins';r.mkdir(parents=True,exist_ok=True)
cmd=['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=160x96:r=24:d=4','-c:v','libx264','-bf','2','-g','24','-movflags','+negative_cts_offsets',str(r/'source.mp4')]
subprocess.run(cmd,check=True);(r/'commands.log').write_text(repr(cmd)+'\n');b=(r/'source.mp4').read_bytes()
def boxes(start,end):
 while start<end:
  n=int.from_bytes(b[start:start+4],'big');t=b[start+4:start+8]
  if n<8 or start+n>end:raise ValueError('bounds')
  yield t,start+8,start+n;start+=n
found={}
def walk(start,end):
 for t,a,z in boxes(start,end):
  if t in [b'moov',b'trak',b'mdia',b'minf',b'stbl']:walk(a,z)
  if t in [b'stts',b'ctts']:found[t]=(a,z)
walk(0,len(b))
def parse(t):
 a,z=found[t];n=int.from_bytes(b[a+4:a+8],'big');signed=t==b'ctts' and b[a]==1;rows=[];ordinal=0;clock=0
 if a+8+8*n!=z:raise ValueError('run bounds')
 for i in range(n):
  count,val=struct.unpack('>Ii' if signed else '>II',b[a+8+8*i:a+16+8*i])
  if count<=0:raise ValueError('zero count')
  rows.append((ordinal,clock,count,val));ordinal+=count;clock+=count*val
 return rows,ordinal
stts,count=parse(b'stts');ctts,ccount=parse(b'ctts');assert count==ccount==96
starts=[x[0] for x in stts];cstarts=[x[0] for x in ctts]
def query(i):
 if not 0<=i<count:raise ValueError('ordinal')
 s,clock,n,d=stts[bisect.bisect_right(starts,i)-1];cs,_,cn,c=ctts[bisect.bisect_right(cstarts,i)-1]
 return clock+(i-s)*d,d,c
packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(r/'source.mp4')]))['packets'];shift=packets[0]['dts'];assert any(query(i)[2]<0 for i in range(count))
for i,packet in enumerate(packets):
 dts,d,cto=query(i);assert dts+shift==packet['dts'];assert d==packet['duration'];assert dts+cto+packets[0]['pts']-query(0)[2]==packet['pts']
controls=[]
for i in [-1,count]:
 try:query(i);raise AssertionError('out-of-range')
 except ValueError:controls.append(i)
assert any((query(i)[2]&0xffffffff)!=query(i)[2] for i in range(count))
(r/'results.json').write_text(json.dumps({'passed':True,'candidateExecuted':True,'fallback':False,'samples':count,'sttsRuns':len(stts),'cttsRuns':len(ctts),'negativeCompositionOffsets':True,'allQueriesMatchIndependentFFprobe':True,'outOfRangeRejected':controls,'unsignedCTTSWrongOutputDetected':True,'demuxDecodeTimelineOrigin':shift,'scope':'Query compressed stts and signed ctts directly. Not sample byte offsets, AVIO, source lifecycle or FFmpeg owner integration; no measured allocation or performance claim.'},indent=2)+'\n')
