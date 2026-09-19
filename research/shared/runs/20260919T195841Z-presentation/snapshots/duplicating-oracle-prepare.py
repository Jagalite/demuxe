# SPDX-License-Identifier: Apache-2.0
import subprocess,json,hashlib,pathlib,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
def run(args):
 with (out/'commands.log').open('a') as f:f.write(' '.join(args)+'\n')
 return subprocess.check_output(args,stderr=subprocess.STDOUT)
fixtures={}
for name,g,n in [('gop',12,24),('idr',1,6)]:
 p=out/(name+'.h264')
 run(['ffmpeg','-hide_banner','-y','-f','lavfi','-i','testsrc2=size=64x48:rate=12','-frames:v',str(n),'-c:v','libx264','-pix_fmt','yuv420p','-profile:v','baseline','-g',str(g),'-keyint_min',str(g),'-sc_threshold','0','-bf','0','-f','h264',str(p)])
 packets=json.loads(run(['ffprobe','-v','error','-show_packets','-of','json',str(p)]))['packets'];b=p.read_bytes()
 raw=run(['ffmpeg','-v','error','-i',str(p),'-pix_fmt','yuv420p','-f','rawvideo','-']);(out/(name+'.yuv')).write_bytes(raw)
 fixtures[name]={'packets':[{'data':list(b[int(a['pos']):int(a['pos'])+int(a['size'])]),'key':'K' in a['flags'],'timestamp':round(i*1e6/12)} for i,a in enumerate(packets)],'hashes':[hashlib.sha256(raw[i*4608:(i+1)*4608]).hexdigest() for i in range(n)]}
(out/'input.json').write_text(json.dumps(fixtures))
(out/'ffmpeg-version.txt').write_bytes(run(['ffmpeg','-version']))
