#!/usr/bin/env python3
import json,pathlib,subprocess,hashlib
out=pathlib.Path('results/microcodec');results=[]
for case in json.loads((out/'remux-profiles.json').read_text())['results']:
 row={'name':case['name'],'error':case.get('error')}
 if not row['error']:
  row['streams']={}
  for kind in ['audio','video']:
   if not any(s['codec_type']==kind for s in case['ffprobe']['streams']):continue
   def decode(file):
    cmd=['ffmpeg','-v','error','-i',file,'-map','0:'+kind[0]+':0']+(['-f','f32le'] if kind=='audio' else ['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo'])+['-']
    return subprocess.check_output(cmd)
   a=decode(case['file']);b=decode(str(out/(case['name']+'.mp4')))
   row['streams'][kind]={'exact':a==b,'inputBytes':len(a),'outputBytes':len(b),'inputSha256':hashlib.sha256(a).hexdigest(),'outputSha256':hashlib.sha256(b).hexdigest()}
 results.append(row)
(out/'remux-correctness.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
