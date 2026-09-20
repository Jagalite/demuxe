# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,struct,subprocess,json,array
r=Path(sys.argv[1]);frames=[]
for n in range(31):
 y=[(1023 if (x+y)%2 else 0) if n==30 else (x*4+y*2+n*3)%1024 for y in range(128) for x in range(128)];frames.append(y)
raw=b''.join(struct.pack('<'+str(128*128)+'H',*f)+struct.pack('<8192H',*([512]*8192)) for f in frames);(r/'input.yuv').write_bytes(raw)
commands=[['ffmpeg','-v','error','-f','rawvideo','-pixel_format','yuv420p10le','-video_size','128x128','-framerate','30','-i',str(r/'input.yuv'),'-c:v','libx265','-x265-params','lossless=1:log-level=error:pools=none:frame-threads=1','-pix_fmt','yuv420p10le',str(r/'source.mp4')],['ffmpeg','-v','error','-i',str(r/'source.mp4'),'-f','rawvideo','-pix_fmt','yuv420p10le',str(r/'decoded.yuv')]]
for c in commands:subprocess.run(c,check=True)
actual=(r/'decoded.yuv').read_bytes();assert actual==raw;oracles=[]
for n in range(31):
 y=struct.unpack('<16384H',actual[n*49152:n*49152+32768]);oracles.extend(sum(y[(yy+dy)*128+xx+dx] for dy in [-1,0,1] for dx in [-1,0,1])//9 for yy in range(1,127) for xx in range(1,127))
(r/'filter-oracle.u16').write_bytes(struct.pack('<'+str(len(oracles))+'H',*oracles));(r/'commands.json').write_text(json.dumps(commands,indent=2));(r/'prepare-results.json').write_text(json.dumps({'actual_HEVC_decoded_samples_exact_original':True,'frames':31,'format':'yuv420p10le','oracle':'Independent Python 3x3 integer mean of decoded Y samples, no candidate storage calls','checkerboard_index':30},indent=2))
