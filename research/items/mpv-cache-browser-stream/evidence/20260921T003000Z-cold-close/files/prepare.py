# SPDX-License-Identifier: Apache-2.0
"""Prepare immutable runtime snapshot and movie-derived VOD fixtures. Run at repo root."""
import hashlib,json,subprocess,zipfile,shutil,datetime
from pathlib import Path
home=Path(__file__).resolve().parent.parent
fixtures=home/'fixtures'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
source=fixtures/'bbb_sunflower_1080p_30fps_normal.mp4'
if not source.exists():
 with zipfile.ZipFile(fixtures/'bbb-source.zip') as z:z.extract(source.name,fixtures)
commands=[]
specs=[('h264',90,'640:360','libx264','2M',None),('hevc',90,'960:540','libx265','6M',None),('high',90,'960:540','libx264','16M','noise=alls=12:allf=t'),('long',None,'640:360','libx264','2M',None)]
for name,duration,scale,codec,rate,extra in specs:
 target=fixtures/(name+'.mp4')
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-threads','2','-ss','60' if duration else '0','-i',str(source),'-map','0:v:0','-map','0:a:0','-vf','scale='+scale+(','+extra if extra else ''),'-c:v',codec,'-threads','2','-preset','fast','-b:v',rate,'-maxrate',rate,'-bufsize',rate,'-pix_fmt','yuv420p','-g','60','-c:a','aac','-b:a','128k','-ac','2','-movflags','+faststart']
 if codec=='libx265':cmd+=['-x265-params','pools=2:frame-threads=2:log-level=error','-tag:v','hvc1']
 if duration:cmd+=['-t',str(duration)]
 cmd+=[str(target)];commands.append(cmd)
 if not target.exists():
  print('Generating',name,flush=True);subprocess.run(cmd,check=True)
manifest={'sourceUrl':'https://download.blender.org/demo/movies/BBB/bbb_sunflower_1080p_30fps_normal.mp4.zip','sourceSHA256':sha(source),'license':'CC-BY-3.0','attribution':'(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org; Sunflower version Janus Bager Kristensen (2013). Adapted resolution/bitrate/audio; high adds temporal noise.','commands':commands,'fixtures':{}}
for name,*_ in specs:
 p=fixtures/(name+'.mp4');probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
 manifest['fixtures'][name]={'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'duration':float(probe['format']['duration']),'bitrate':int(probe['format']['bit_rate']),'probe':probe}
 for sec in [10,30]:
  ref=fixtures/(name+'-'+str(sec)+'.rgb')
  cmd=['ffmpeg','-v','error','-nostdin','-n','-ss',str(sec),'-i',str(p),'-frames:v','1','-vf','scale=640:360','-pix_fmt','rgb24','-f','rawvideo',str(ref)]
  if not ref.exists():subprocess.run(cmd,check=True)
  manifest['fixtures'][name].setdefault('references',{})[str(sec)]={'path':str(ref),'sha256':sha(ref)}
(fixtures/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
snapshot=home/'runtime'
if not snapshot.exists():
 snapshot.mkdir();shutil.copytree('web',snapshot/'web');(snapshot/'fixtures').mkdir()
 for f in ['DejaVuSans.ttf','FONT-LICENSE.txt']:shutil.copyfile(Path('fixtures')/f,snapshot/'fixtures'/f)
 (snapshot/'dirty.patch').write_bytes(subprocess.check_output(['git','diff','--binary']))
 (snapshot/'status.txt').write_bytes(subprocess.check_output(['git','status','--short']))
 (snapshot/'revision.txt').write_bytes(subprocess.check_output(['git','rev-parse','HEAD']))
 (snapshot/'manifest.json').write_text(json.dumps({str(p.relative_to(snapshot)):sha(p) for p in snapshot.rglob('*') if p.is_file()},indent=2)+'\n')
print(json.dumps({k:{x:v[x] for x in ['bytes','duration','bitrate']} for k,v in manifest['fixtures'].items()},indent=2))
