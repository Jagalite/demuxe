# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,subprocess,json,hashlib
r=pathlib.Path(sys.argv[1]);r.mkdir(parents=True,exist_ok=True);w,h,n=640,360,96
raw=bytearray()
for t in range(n):
 for y in range(h):
  for x in range(w):
   if y<40:v=220 if (t>>(x//80))&1 else 30
   else:v=60+((x//20+y//20+t)%8)*20
   raw.extend([v,v,v])
args=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','640x360','-r','24','-i','-','-an','-c:v','libx264','-threads','1','-preset','medium','-crf','12','-g','24','-bf','0','-pix_fmt','yuv420p','-movflags','+faststart',str(r/'source.mp4')]
subprocess.run(args,input=raw,check=True);oracle=subprocess.check_output(['ffmpeg','-v','error','-i',str(r/'source.mp4'),'-pix_fmt','rgb24','-f','rawvideo','-']);assert len(oracle)==w*h*3*n
(r/'oracle.rgb').write_bytes(oracle);(r/'fixture.json').write_text(json.dumps({'width':w,'height':h,'frames':n,'rate':24,'source':'authored grayscale movingblocks with8bitframeidentity topstripe; native H264 yuv420p','commands':[args],'oracle':'independent FFmpeg native H264 decode RGB24','source_sha256':hashlib.sha256((r/'source.mp4').read_bytes()).hexdigest(),'oracle_sha256':hashlib.sha256(oracle).hexdigest()},indent=2)+'\n')
