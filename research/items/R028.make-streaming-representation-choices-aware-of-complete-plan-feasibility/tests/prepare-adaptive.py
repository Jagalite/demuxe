# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,struct,json,sys,math
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);cmds=[];frames=24;w=h=64
raw=b''.join(bytes([32+(i%6)*28])*(w*h)+bytes([80+(i%4)*20])*(w*h//4)+bytes([170-(i%3)*22])*(w*h//4) for i in range(frames));(p/'source.yuv').write_bytes(raw)
def run(c):cmds.append(c);return subprocess.check_output(c,stderr=subprocess.PIPE)
variants={}
for codec,name in [('libvpx','low'),('libvpx-vp9','high')]:
 args=['ffmpeg','-v','error','-y','-f','rawvideo','-pixel_format','yuv420p','-video_size','64x64','-framerate','12','-i',str(p/'source.yuv'),'-c:v',codec,'-g','1','-b:v','400k','-f','ivf',str(p/(name+'.ivf'))];run(args)
 b=(p/(name+'.ivf')).read_bytes();off=32;packets=[]
 while off<len(b):
  n,ts=struct.unpack_from('<IQ',b,off);off+=12;packets.append(list(b[off:off+n]));off+=n
 rgba=run(['ffmpeg','-v','error','-i',str(p/(name+'.ivf')),'-pix_fmt','rgba','-f','rawvideo','-']);(p/(name+'-oracle.rgba')).write_bytes(rgba)
 variants[name]={'codec':'vp8' if name=='low' else 'vp09.00.10.08','packets':packets,'oracle':[list(rgba[i*w*h*4:(i+1)*w*h*4]) for i in range(frames)],'bandwidth':100000 if name=='low' else 300000}
for name,hz in [('en',440),('fr',660)]:run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'sine=frequency={hz}:sample_rate=48000:duration=2','-ac','2','-c:a','pcm_f32le',str(p/(name+'.wav'))])
(p/'input.json').write_text(json.dumps({'variants':variants,'frames':frames,'width':w,'height':h}));(p/'preparation.json').write_text(json.dumps({'commands':cmds,'scope':'24 aligned all-key independent VP8/VP9 segments; authored color markers and separate selected2second floatPCM language tracks. Prepared elementary delivery rather than HLS packaging.'},indent=2))
