# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,random,sys,json,hashlib
p=Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
def run(cmd):
 with (p/'commands.log').open('a') as f:f.write(' '.join(map(str,cmd))+'\n')
 r=subprocess.run(list(map(str,cmd)),stdout=subprocess.PIPE,stderr=subprocess.PIPE);assert r.returncode==0,r.stderr.decode();return r.stdout
(p/'source.rgb').write_bytes(random.Random(206).randbytes(2048*2048*3));run(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size','2048x2048','-i',p/'source.rgb','-frames:v','1','-c:v','mjpeg','-q:v','5','-pix_fmt','yuvj444p',p/'input.jpg']);run(['djpeg','-rgb','-outfile',p/'reference.ppm',p/'input.jpg']);ppm=(p/'reference.ppm').read_bytes();header,data=ppm.split(b'\n255\n',1);assert header==b'P6\n2048 2048';assert len(data)==2048*2048*3;(p/'reference.rgb').write_bytes(data);rgba=bytearray();
for i in range(0,len(data),3):rgba.extend(data[i:i+3]+b'\xff')
(p/'reference.json').write_text(json.dumps({'width':2048,'height':2048,'RGBsha256':hashlib.sha256(data).hexdigest(),'RGBAsha256':hashlib.sha256(rgba).hexdigest(),'oracle':'Separate djpeg CLI, same libjpeg implementation; validates transport/upload pipeline, notdecoder substitution.'}));flags=run(['pkg-config','--cflags','--libs','libjpeg']).decode().split();run(['cc','-O2','research/items/R206.incremental-mjpeg-stripe-decode-upload/tests/jpeg-stripes.c',*flags,'-o','build/catalogue-tools/jpeg-stripes']);(p/'bad.jpg').write_bytes(b'not-a-jpeg');print('Prepared real JPEG,djpeg oracle,andnative64rowproducer')
