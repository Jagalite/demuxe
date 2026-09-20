# SPDX-License-Identifier: Apache-2.0
"""Original 72-frame, 24fps decoded-frame identity fixture; no source media."""
import subprocess,sys
from pathlib import Path
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
data=bytearray()
for i in range(72):
 bits=[1,0,1,0]+[(i>>b)&1 for b in range(7)]+[1-((i>>b)&1) for b in range(5)]
 row=bytes(230 if bits[x//20] else 25 for x in range(320))
 data.extend(row*180)
subprocess.run(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','gray','-s','320x180','-r','24','-i','pipe:0','-frames:v','72','-c:v','libvpx','-deadline','realtime','-cpu-used','8','-crf','4','-qmin','4','-qmax','4','-f','ivf',str(p/'source.ivf')],input=data,check=True)
