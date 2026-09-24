#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Directional host FFmpeg decode timing; not Demuxe/Chrome CPU."""
import json
import os
import re
import subprocess
from pathlib import Path

sources={'mpeg2_1080':'build/decoder-lowres/mpeg2-1080.ts','mpeg4_1080':'build/decoder-lowres/mpeg4-1080.avi','mpeg2_4k':'build/decoder-lowres/mpeg2-4k.ts','bbb_mpeg2':'build/decoder-lowres/bbb-mpeg2-1080.ts','bbb_mpeg4':'build/decoder-lowres/bbb-mpeg4-1080.avi'}
cases=os.environ.get('CASES',','.join(sources)).split(',')
levels=[int(v) for v in os.environ.get('LEVELS','0,1,2,3').split(',')]
rows=[]
for round in range(2):
 for name in cases:
  for lowres in (levels if round==0 else list(reversed(levels))):
   args=['ffmpeg','-nostdin','-hide_banner','-loglevel','info','-benchmark','-threads','2']
   if lowres:args+=['-lowres',str(lowres)]
   args+=['-i',sources[name],'-map','0:v:0','-an','-fps_mode','passthrough','-f','null','-']
   result=subprocess.run(args,capture_output=True,text=True,check=True)
   match=re.search(r'bench:\s*utime=([\d.]+)s\s*stime=([\d.]+)s\s*rtime=([\d.]+)s',result.stderr)
   assert match,result.stderr[-1000:]
   row={'source':name,'lowres':lowres,'round':round,'userSeconds':float(match[1]),'systemSeconds':float(match[2]),'realSeconds':float(match[3])}
   rows.append(row);print(row,flush=True)
Path('results/decoder-lowres/host-decode.json').write_text(json.dumps(rows,indent=2)+'\n')
