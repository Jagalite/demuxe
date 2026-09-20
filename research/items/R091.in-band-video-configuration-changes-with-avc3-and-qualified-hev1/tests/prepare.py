# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,struct
r=Path('research/shared/runs/20260919T214300Z-avc3-geometry');r.mkdir(exist_ok=False);commands=[];info={}
for name,size in [('small','640x360'),('large','1280x720')]:
 file=r/(name+'.mp4');cmd=['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s='+size+':r=12:d=2','-c:v','libx264','-preset','ultrafast','-profile:v','baseline','-level:v','3.1','-g','24','-bf','0','-x264-params','repeat-headers=1','-tag:v','avc3','-movflags','frag_keyframe+empty_moov+default_base_moof',str(file)];commands.append(cmd);subprocess.run(cmd,check=True);probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',str(file)]));(r/(name+'-probe.json')).write_text(json.dumps(probe,indent=2)+'\n');data=file.read_bytes();packet=probe['packets'][0];p=int(packet['pos']);end=p+int(packet['size']);types=[];bad=bytearray(data)
 while p+4<end:
  n=int.from_bytes(data[p:p+4],'big');kind=data[p+4]&31;types.append(kind)
  if kind in [7,8]:bad[p+4]=12;bad[p+5:p+4+n]=bytes([255])*(n-2)+b'\x80'
  p+=4+n
 assert 7 in types and 8 in types
 info[name]={'codec':probe['streams'][0]['codec_tag_string'],'profile':probe['streams'][0]['profile'],'level':probe['streams'][0]['level'],'size':size,'firstNALTypes':types}
 if name=='large':(r/'missing-inband-configuration.mp4').write_bytes(bad)
(r/'generator.json').write_text(json.dumps(commands,indent=2)+'\n');(r/'fixtures.json').write_text(json.dumps(info,indent=2)+'\n');print(info)
