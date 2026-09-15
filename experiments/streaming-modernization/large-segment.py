#!/usr/bin/env python3
"""Original synthetic progressive-startup fixture; one segment exceeds 8 MiB."""
import argparse, hashlib, json, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
out=a.output.resolve()
if out.exists():raise SystemExit('Use a new fixture directory')
out.mkdir(parents=True)
command=['ffmpeg','-hide_banner','-nostdin','-f','lavfi','-i','testsrc2=size=960x540:rate=24,noise=alls=30:allf=t:all_seed=42','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-b:v','8M','-maxrate','8M','-bufsize','16M','-pix_fmt','yuv420p','-g','48','-keyint_min','48','-sc_threshold','0','-bf','0','-c:a','aac','-b:a','96k','-f','mp4','-movflags','+empty_moov+default_base_moof+frag_keyframe','-frag_duration','1000000','-frag_interleave','1','presentation.mp4']
(out/'command.json').write_text(json.dumps(command,indent=2)+'\n')
with (out/'encode.log').open('w') as log:subprocess.run(command,cwd=out,stdout=log,stderr=subprocess.STDOUT,check=True)
# Keep initialization separate; one large HLS segment contains many correctly
# interleaved fragments. The original one-fragment mux put first audio at EOF.
data=(out/'presentation.mp4').read_bytes();offset=0
while offset<len(data):
 size=int.from_bytes(data[offset:offset+4],'big');kind=data[offset+4:offset+8]
 if size==1:size=int.from_bytes(data[offset+8:offset+16],'big')
 if kind==b'moof':break
 if size<8 or offset+size>len(data):raise ValueError('Invalid generated MP4 box')
 offset+=size
assert offset<len(data)
(out/'init.mp4').write_bytes(data[:offset]);(out/'segment-0.m4s').write_bytes(data[offset:])
(out/'index.m3u8').write_text('#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:12\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:12.0,\nsegment-0.m4s\n#EXT-X-ENDLIST\n')
record={'synthetic':True,'generatorSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'encoder':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0],'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.suffix in ['.m3u8','.mp4','.m4s']}}
(out/'manifest.json').write_text(json.dumps(record,indent=2)+'\n')
assert (out/'segment-0.m4s').stat().st_size>8*1024*1024
print(json.dumps(record,indent=2))
