# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib
base=Path('research/items/granular-engine-loading');out=Path((base/'full-run.txt').read_text().strip());old=Path((base/'active-run.txt').read_text().strip());d=out/'fixtures';d.mkdir(exist_ok=True);commands=[]
for name,encoder,opts in [('vp8','libvpx',['-deadline','realtime','-cpu-used','8']),('vp9','libvpx-vp9',['-deadline','realtime','-cpu-used','8']),('av1','libsvtav1',['-preset','12','-crf','40']),('mpeg4','mpeg4',['-q:v','3'])]:
 p=d/(name+'.mkv');args=['ffmpeg','-v','error','-nostdin','-n','-i',str(old/'fixtures-v2/h264-aac-ass.mkv'),'-map','0','-c:v',encoder,*opts,'-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-c:s','copy',str(p)];
 if not p.exists():subprocess.run(args,check=True)
 commands.append(args)
 for sec in [1,3]:
  args=['ffmpeg','-v','error','-nostdin','-n','-i',str(p),'-ss',str(sec),'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo',str(d/f'{name}-{sec}.rgb')];
  if not Path(args[-1]).exists():subprocess.run(args,check=True)
  commands.append(args)
(out/'fixtures.json').write_text(json.dumps({'commands':commands,'artifacts':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'license':'CC-BY-4.0 original synthetic evidence'} for p in d.iterdir()]},indent=2))
