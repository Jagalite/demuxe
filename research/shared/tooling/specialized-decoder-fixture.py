# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
p=pathlib.Path(sys.argv[1]);raw=pathlib.Path('research/shared/runs/20260919T231631Z-av1-reference-banks/a.yuv').read_bytes()*10;(p/'source.yuv').write_bytes(raw);cases={}
for name,cabac in [('eligible',0),('changed-tool',1)]:
 path=p/(name+'.h264');cmd=['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','yuv420p','-s','160x96','-r','24','-i',str(p/'source.yuv'),'-c:v','libx264','-preset','veryfast','-crf','18','-x264-params',f'cabac={cabac}:bframes=0:keyint=999:scenecut=0','-f','h264','-y',str(path)];r=subprocess.run(cmd,capture_output=True,timeout=30);assert r.returncode==0,r.stderr
 r=subprocess.run(['ffprobe','-v','error','-show_packets','-show_entries','packet=pos,size','-of','json',str(path)],capture_output=True,timeout=10);index=json.loads(r.stdout)['packets'];b=path.read_bytes();ps=[list(b[int(x['pos']):int(x['pos'])+int(x['size'])]) for x in index]
 r=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);assert len(r.stdout)==len(raw);(p/(name+'.yuv')).write_bytes(r.stdout);cases[name]={'packets':ps,'hashes':[hashlib.sha256(r.stdout[i*23040:(i+1)*23040]).hexdigest() for i in range(30)]}
(p/'input.json').write_text(json.dumps(cases,indent=2)+'\n');print({k:len(v['packets']) for k,v in cases.items()})
