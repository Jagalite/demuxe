#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Compare decoder lowres against full decode plus Lanczos to display size."""
import json
import math
import os
import subprocess
from pathlib import Path

sources={'mpeg2_1080':'build/decoder-lowres/mpeg2-1080.ts','mpeg4_1080':'build/decoder-lowres/mpeg4-1080.avi','mpeg2_4k':'build/decoder-lowres/mpeg2-4k.ts','bbb_mpeg2':'build/decoder-lowres/bbb-mpeg2-1080.ts','bbb_mpeg4':'build/decoder-lowres/bbb-mpeg4-1080.avi'}
times=[3.2,8.2,13.2]
out=Path('results/decoder-lowres/quality');out.mkdir(parents=True,exist_ok=True)
cases=os.environ.get('CASES',','.join(sources)).split(',')
levels=[int(v) for v in os.environ.get('LEVELS','1,2,3').split(',')]
def frame(source,when,level,width,height):
    command=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-threads','2']
    if level:command+=['-lowres',str(level)]
    command+=['-ss',str(when),'-i',source,'-map','0:v:0','-frames:v','1','-vf',f'scale={width}:{height}:flags=lanczos+full_chroma_int,format=rgb24','-f','rawvideo','-pix_fmt','rgb24','-']
    result=subprocess.run(command,capture_output=True,check=True)
    assert len(result.stdout)==width*height*3,(source,when,level,len(result.stdout),result.stderr.decode())
    return result.stdout
def png(raw,width,height,path):
    subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{width}x{height}','-i','-','-frames:v','1',str(path)],input=raw,check=True)
results=[]
for name in cases:
    width,height=(1920,1080) if name.endswith('4k') else (960,540)
    for when in times:
        reference=frame(sources[name],when,0,width,height)
        if when==3.2:png(reference,width,height,out/f'{name}-full.png')
        for level in levels:
            candidate=frame(sources[name],when,level,width,height)
            if when==3.2:png(candidate,width,height,out/f'{name}-lowres{level}.png')
            differences=[abs(a-b) for a,b in zip(reference,candidate)]
            mse=sum(v*v for v in differences)/len(differences)
            differences.sort()
            row={'source':name,'time':when,'lowres':level,'target':[width,height],'psnr':10*math.log10(255*255/mse) if mse else None,'mae':sum(differences)/len(differences),'p99':differences[int(.99*(len(differences)-1))],'max':differences[-1],'gt16':sum(v>16 for v in differences)/len(differences)}
            results.append(row);print(json.dumps(row),flush=True)
(out/'result.json').write_text(json.dumps(results,indent=2)+'\n')
