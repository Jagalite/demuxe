# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
from datetime import datetime,timezone
import json,shutil,subprocess,math,sys
old=Path(sys.argv[1]);r=Path(sys.argv[2]);r.mkdir()
for n in ['source-uhdr.jpg','metadata.cfg','metadata.json','contract.json','base.jpg','gain.jpg','inputs.json','reference-1.rgba16f','reference-2.rgba16f','reference-4.rgba16f']:shutil.copy(old/n,r/n)
(r/'plan.json').write_text(json.dumps({'prior_run':str(old),'correction':'Match pinned reference1024-entry inverse-sRGB and gain LUT sampling; continuous formula differed beyond unchanged0.002 absolute bound atcapacity4. Separate same-component shader math from JPEG decode. FFmpeg raw base differed6channels by1 from browser; use independently djpeg-decoded neutralbase for math fixture and compare all browsercomponents.','thresholds_unchanged':True},indent=2))
j=json.loads((r/'inputs.json').read_text())
for n in ['base','gain']:
 data=subprocess.check_output(['djpeg','-rgb',str(r/(n+'.jpg'))]);(r/(n+'.ppm')).write_bytes(data);head,data=data.split(b'\n',3)[:3],data.split(b'\n',3)[3];assert len(data)==64*64*3
 j[n]=[v for i in range(0,len(data),3) for v in [*data[i:i+3],255]]
m=j['metadata'];j['math_references']={}
for cap in [1,2,4]:
 values=[];weight=math.log2(cap)/2
 for i in range(4096):
  rgb=[];gain=round((j['gain'][i*4]/255)**(1/m['gamma'])*1023)/1023;boost=2**(2*gain*weight)
  for c in range(3):
   v=round(j['base'][i*4+c]/255*1023)/1023;linear=v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4;rgb.append((linear+m['offset_sdr'])*boost-m['offset_hdr'])
  values.extend([*rgb,1])
 j['math_references'][str(cap)]=values
(r/'inputs.json').write_text(json.dumps(j));print(r)
