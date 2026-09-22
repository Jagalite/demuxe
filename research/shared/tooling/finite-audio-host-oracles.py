# SPDX-License-Identifier: Apache-2.0
import json,sys,pathlib,subprocess,hashlib
c=json.load(open(sys.argv[1]));b=pathlib.Path(c['build']);rows=[]
for p in sorted((b/'constructed').glob('*')):
 n=p.stem
 if n.startswith('D32-all-'):ref=b/'batch06'/('pcm_'+n.removeprefix('D32-all-')+'_allcodes_reference.wav')
 elif n.startswith('D32-'):ref=b/'batch06'/('pcm_'+n.removeprefix('D32-')+'_reference.wav')
 elif n.startswith('D68-'):ref=b/'batch16'/(n.removeprefix('D68-')+'_ref.wav')
 else:ref=b/'batch16'/'opus_ref.ogg'
 def decode(path):
  command=['ffmpeg','-nostdin','-v','error','-i',str(path),'-map','0:a:0','-f','f32le','-']
  result=subprocess.run(command,capture_output=True,check=True)
  return result.stdout,{'command':command,'bytes':len(result.stdout),'sha256':hashlib.sha256(result.stdout).hexdigest(),'stderr':result.stderr.decode()}
 a,ra=decode(p);d,rd=decode(ref);rows.append({'id':n,'candidate':ra,'reference':rd,'exact':a==d});print(n,a==d)
pathlib.Path(c['run'],'finite-audio-host-oracles.json').write_text(json.dumps(rows,indent=2)+'\n')
assert all(r['exact'] for r in rows)
