# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
p=pathlib.Path(sys.argv[1]);source=pathlib.Path('research/shared/runs/20260919T231631Z-av1-reference-banks/a.yuv').read_bytes();(p/'source.yuv').write_bytes(source);cases={}
for name,pix in [('native','yuv420p'),('island','yuv444p')]:
 path=p/(name+'.h264');cmd=['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','yuv420p','-s','160x96','-r','24','-i',str(p/'source.yuv'),'-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt',pix,'-x264-params','cabac=0:bframes=0:keyint=999:scenecut=0','-f','h264','-y',str(path)];r=subprocess.run(cmd,capture_output=True,timeout=30);assert r.returncode==0,r.stderr
 r=subprocess.run(['ffprobe','-v','error','-show_packets','-show_entries','packet=pos,size','-of','json',str(path)],capture_output=True,timeout=10);index=json.loads(r.stdout)['packets'];b=path.read_bytes();ps=[list(b[int(x['pos']):int(x['pos'])+int(x['size'])]) for x in index];r=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-pix_fmt',pix,'-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);n=23040 if pix=='yuv420p' else 46080;assert len(r.stdout)==3*n;(p/(name+'-oracle.yuv')).write_bytes(r.stdout)
 # Actual SPS bytes in AnnexB yield the codec profile/constraints/level identity.
 units=b.replace(b'\0\0\0\1',b'\0\0\1').split(b'\0\0\1');sps=next(x for x in units if x and x[0]&31==7);codec='avc1.'+sps[1:4].hex();cases[name]={'packets':ps,'codec':codec,'format':'I420' if pix=='yuv420p' else 'I444','hashes':[hashlib.sha256(r.stdout[i*n:(i+1)*n]).hexdigest() for i in range(3)]}
(p/'input.json').write_text(json.dumps(cases,indent=2)+'\n');print({k:v['codec'] for k,v in cases.items()})
