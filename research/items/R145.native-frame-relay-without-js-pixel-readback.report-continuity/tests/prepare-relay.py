# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,subprocess,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);raw=bytearray()
for n in range(24):
 y=bytearray([16]*(96*64))
 for bit in range(5):
  for yy in range(8,24):
   for x in range(8+bit*16,24+bit*16):y[yy*96+x]=235 if n&(1<<bit) else 16
 for yy in range(32,64):
  for x in range(96):y[yy*96+x]=235 if ((x//8+yy//8+n)%2) else 16
 raw.extend(y+bytearray([128]*(96*64//2)))
(p/'source.yuv').write_bytes(raw)
cmd=['ffmpeg','-v','error','-f','rawvideo','-pixel_format','yuv420p','-video_size','96x64','-framerate','12','-i',str(p/'source.yuv'),'-c:v','libx264','-qp','0','-g','12','-bf','0','-pix_fmt','yuv420p',str(p/'source.mp4')];subprocess.run(cmd,check=True);decode=['ffmpeg','-v','error','-i',str(p/'source.mp4'),'-pix_fmt','rgba','-fps_mode','passthrough','-f','rawvideo','-'];rgba=subprocess.check_output(decode);assert len(rgba)==24*96*64*4;(p/'reference.rgba').write_bytes(rgba);(p/'oracles.json').write_text(json.dumps([hashlib.sha256(rgba[i*24576:(i+1)*24576]).hexdigest() for i in range(24)]));(p/'commands.log').write_text(' '.join(cmd)+'\n'+' '.join(decode)+'\n')
