# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,time,sys,hashlib
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False);frames=[]
for n in range(12):
 y=bytes((x*3+y*5+n*7)%220+16 for y in range(256) for x in range(256));u=bytes(80+(x+n)%70 for y in range(128) for x in range(128));v=bytes(90+(y+n)%60 for y in range(128) for x in range(128));frames.append(y+u+v)
def crop(b,q):
 ox=(q%2)*128;oy=(q//2)*128;o=bytearray()
 for offset,w in [(0,256),(65536,128),(81920,128)]:
  scale=1 if w==256 else 2;x=ox//scale;y=oy//scale;s=128//scale
  for row in range(y,y+s):o.extend(b[offset+row*w+x:offset+row*w+x+s])
 return bytes(o)
results={};commands=[]
for name,w,data in [('full',256,frames)]+[(f'tile{q}',128,[crop(f,q)for f in frames])for q in range(4)]:
 (out/f'{name}.yuv').write_bytes(b''.join(data));cmd=['ffmpeg','-v','error','-f','rawvideo','-pixel_format','yuv420p','-video_size',f'{w}x{w}','-framerate','24','-i',str(out/f'{name}.yuv'),'-c:v','libvpx-vp9','-lossless','1','-deadline','realtime','-cpu-used','8','-g','12','-lag-in-frames','0','-f','ivf','-y',str(out/f'{name}.ivf')];t=time.perf_counter();p=subprocess.run(cmd,capture_output=True,text=True);elapsed=time.perf_counter()-t;assert p.returncode==0,p.stderr;commands.append(cmd)
 cmd=['ffmpeg','-v','error','-i',str(out/f'{name}.ivf'),'-f','rawvideo','-pix_fmt','yuv420p','-y',str(out/f'{name}-decoded.yuv')];p=subprocess.run(cmd,capture_output=True,text=True);assert p.returncode==0,p.stderr;commands.append(cmd);assert(out/f'{name}-decoded.yuv').read_bytes()==b''.join(data)
 results[name]={'width':w,'encoded_bytes':(out/f'{name}.ivf').stat().st_size,'encode_seconds':elapsed,'hashes':[hashlib.sha256(f).hexdigest()for f in data]}
(out/'prepare-results.json').write_text(json.dumps(results,indent=2)+'\n');(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n');(out/'plan.json').write_text(json.dumps({'contract':'Prepared lossless12frame256square VP9 full picture and4 synchronized128square quadrants. Exact allI420 samples and timestamps vs original authoredplanes/independentFFmpeg; reconstructallfourframes beforeviewport cost. Onefixed128square viewport at top-left.','gate':'9alternating cold online12frame jobs include binaryfetch/IVFparse/configure/decode/copy/full-or-tilecrop/hash/close. Lower95saving>=10%. Offline allfourtileencode time and encodedstorage reported separately, not amortized or calledfree. Current task is preparedasset playback only, not real-time authoring or arbitrary source adaptation.'},indent=2)+'\n')
