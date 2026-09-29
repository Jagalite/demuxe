#!/usr/bin/env python3
import pathlib,subprocess,json,hashlib
out=pathlib.Path('build/microcodec/fixtures');out.mkdir(parents=True,exist_ok=True)
manifest=[]
for name,codec,ch,fmt in [('ac3-stereo','ac3',2,'ac3'),('eac3-stereo','eac3',2,'eac3'),('eac3-51','eac3',6,'eac3'),('dts-stereo','dca',2,'dts'),('dts-51','dca',6,'dts')]:
 f=out/(name+'.'+fmt);expr='|'.join(f'0.12*sin(2*PI*{311+c*197}*t)' for c in range(ch))
 cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={expr}:s=48000:d=3:c={"stereo" if ch==2 else "5.1"}','-c:a',codec,'-strict','-2','-b:a','768k' if codec=='dca' else '448k','-f',fmt,str(f)]
 subprocess.run(cmd,check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-of','json',str(f)]))
 packets=[{'pos':int(x['pos']),'size':int(x['size']),'pts':round(float(x['pts_time'])*48000),'duration':round(float(x['duration_time'])*48000)} for x in probe['packets']]
 pcm=out/(name+'.f32');subprocess.run(['ffmpeg','-v','error','-y','-i',str(f),'-f','f32le',str(pcm)],check=True)
 manifest.append({'name':name,'kind':0 if codec=='ac3' else 1 if codec=='eac3' else 2,'file':str(f.resolve()),'pcm':str(pcm.resolve()),'channels':ch,'packets':packets,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'generation':cmd,'stream':probe['streams'][0]})
(out/'manifest.json').write_text(json.dumps({'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True),'fixtures':manifest},indent=2))
