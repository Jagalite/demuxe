# SPDX-License-Identifier: Apache-2.0
"""Deterministic synthetic fixtures; no downloaded media. Run from any directory."""
import subprocess, pathlib, json, hashlib
from PIL import Image, ImageDraw
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]; D=ROOT/'fixtures'; D.mkdir(exist_ok=True)
commands=[]
def run(args,name):
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_threads','1',*args,str(D/name)]
 subprocess.run(cmd,check=True,timeout=120); commands.append(cmd); print(name,flush=True)
base=['-f','lavfi','-i','testsrc2=size=1920x1080:rate=30:duration=6']
run(base+['-c:v','libx264','-preset','veryfast','-crf','24','-g','60','-keyint_min','60','-sc_threshold','0','-bf','2','-threads','1','-movflags','+faststart'],'h264.mp4')
run(base+['-c:v','libx265','-preset','ultrafast','-crf','28','-x265-params','pools=none:frame-threads=1:keyint=60:min-keyint=60:scenecut=0:log-level=error','-threads','1'],'hevc.mp4')
run(base+['-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','8','-crf','38','-b:v','0','-g','60','-threads','1'],'vp9.webm')
run(['-f','lavfi','-i','testsrc2=size=1920x1080:rate=1:duration=1','-c:v','libaom-av1','-cpu-used','8','-crf','36','-threads','1'],'av1.mkv')
run(['-f','lavfi','-i','testsrc2=size=1920x1080:rate=30:duration=1','-c:v','mpeg2video','-q:v','4','-threads','1'],'mpeg2.mkv')
run(['-f','lavfi','-i','testsrc2=size=3840x2160:rate=1:duration=1','-frames:v','1','-q:v','3','-threads','1'],'chart4k.jpg')
rng=np.random.default_rng(641337); h,w=2160,3840
x=np.linspace(0,1,w,dtype=np.float32)[None,:]; y=np.linspace(0,1,h,dtype=np.float32)[:,None]
a=np.empty((h,w,3),np.float32)
a[:,:,0]=45+100*x+50*y; a[:,:,1]=160-100*y+20*x; a[:,:,2]=60+140*y+10*x
a+=rng.normal(0,7,(h,w,1)).astype(np.float32)
im=Image.fromarray(np.uint8(np.clip(a,0,255))); dr=ImageDraw.Draw(im)
for j in range(40):
 xx=int(rng.integers(0,w-300)); yy=int(rng.integers(0,h-300)); r=int(rng.integers(50,300))
 dr.ellipse((xx,yy,xx+r,yy+r),fill=tuple(int(v) for v in rng.integers(0,255,3)))
im.save(D/'texture4k.jpg',quality=90,subsampling=2)
for name in ['chart4k','texture4k']:
 with Image.open(D/f'{name}.jpg') as src:
  src.load(); src.save(D/f'{name}_progressive.jpg',quality=90,progressive=True,subsampling=2)
  src.resize((240,135),Image.Resampling.LANCZOS).save(D/f'{name}_thumb.jpg',quality=85,subsampling=2)
manifest={'commands':commands,'description':'Synthetic lab fixtures, 6s 1080p30 interframe, 2s GOP where configured; 4K JPEG','files':[]}
for p in sorted(D.iterdir()):
 if p.is_file():manifest['files'].append({'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'results'/'fixtures.json').write_text(json.dumps(manifest,indent=2))
