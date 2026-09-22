# SPDX-License-Identifier: Apache-2.0
import subprocess,json,sys
from pathlib import Path
out=Path(sys.argv[1])
def raw(f):return subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-'])
results=[]
for t in [2,5,13,39]:
 a=raw(out/f'overlay-{t}.png');b=raw(out/f'software-{t}.png');aa=set();bb=set();err=0;n=0
 for y in list(range(20,150))+list(range(620,715)):
  for x in range(1280):
   i=(y*1280+x)*3;av=a[i:i+3];bv=b[i:i+3]
   if max(av)>30:aa.add(i)
   if max(bv)>30:bb.add(i)
   err+=sum(abs(u-v) for u,v in zip(av,bv));n+=3
 iou=len(aa&bb)/max(1,len(aa|bb));results.append({'time':t,'candidatePixels':len(aa),'referencePixels':len(bb),'iou':iou,'meanAbsoluteRGBError':err/n,'passed':(iou>.97 if t!=39 else len(aa)==len(bb)==0)})
(out/'subtitle-comparison.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2));sys.exit(not all(r['passed'] for r in results))
