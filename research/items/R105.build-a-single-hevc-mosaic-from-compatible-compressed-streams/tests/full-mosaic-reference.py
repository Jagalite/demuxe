# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,hashlib,sys
p=pathlib.Path(sys.argv[1]);o=pathlib.Path(sys.argv[2]);
def raw(n):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p/(n+'.mp4')),'-pix_fmt','yuv420p','-f','rawvideo','-'])
a,b,c=[raw(n) for n in ['a','b','explicit']];W,H=256,128;size=W*H*3//2;assert len(a)==len(b)==6*size and len(c)==2*len(a);expected=bytearray();hashes=[]
for i in range(6):
 parts=[]
 for off,w,h in [(0,W,H),(W*H,W//2,H//2),(W*H*5//4,W//2,H//2)]:
  for y in range(h):
   s=i*size+off+y*w;parts.append(a[s:s+w]+b[s:s+w])
 f=b''.join(parts);assert f==c[i*2*size:(i+1)*2*size];expected.extend(f);hashes.append(hashlib.sha256(f).hexdigest())
(o/'mosaic-reference.yuv').write_bytes(expected);cmd=['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','yuv420p','-s','512x128','-r','4','-i',str(o/'mosaic-reference.yuv'),'-c:v','libx265','-profile:v','main','-x265-params','lossless=1:keyint=6:min-keyint=1:scenecut=0:bframes=0:repeat-headers=1:pools=none:frame-threads=1','-force_key_frames','expr:gte(t,n_forced/4)','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-tag:v','hvc1',str(o/'reference.mp4')];r=subprocess.run(cmd,capture_output=True);assert r.returncode==0;(o/'reference-encode.log').write_bytes(r.stderr)
check=subprocess.check_output(['ffmpeg','-v','error','-i',str(o/'reference.mp4'),'-pix_fmt','yuv420p','-f','rawvideo','-']);assert check==expected
(o/'reference.json').write_text(json.dumps({'generator':cmd,'sixCompleteYUVFramesExact':True,'hashes':hashes,'comparison':'Single native512x128 picture vs independently plane-composed losslessencoded512x128 picture, avoiding separate RGB conversion/clamping at the tile join.'},indent=2));(o/'explicit.mp4').write_bytes((p/'explicit.mp4').read_bytes())
