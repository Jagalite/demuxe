"""A declared three-epoch fixture. Does NOT implement a seamless player handoff."""
from pathlib import Path
import json,subprocess,hashlib
R=Path(__file__).resolve().parents[1];F=R/'fixtures';E=R/'evidence'
b=(F/'video.mp4').read_bytes();parts=[];p=0
while p<len(b):
 n=int.from_bytes(b[p:p+4],'big');assert 8<=n<=len(b)-p
 parts.append((b[p+4:p+8],p,n));p+=n
init=b''.join(b[p:p+n] for t,p,n in parts if t in [b'ftyp',b'moov'])
media=[]
for i,(t,p,n) in enumerate(parts):
 if t==b'moof':
  dt,dp,dn=parts[i+1];assert dt==b'mdat';media.append(b[p:p+n]+b[dp:dp+dn])
assert len(media)==4
(F/'island_prefix.mp4').write_bytes(init+media[0]);(F/'island_suffix.mp4').write_bytes(init+b''.join(media[2:]))
log=[]
def decode(name,fmt):
 cmd=['ffmpeg','-v','error','-i',str(F/name),'-map','0:v:0','-pix_fmt',fmt,'-vsync','0','-threads','1','-f','rawvideo','pipe:1']
 p=subprocess.run(cmd,capture_output=True,timeout=15);log.append({'argv':cmd,'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')});assert p.returncode==0
 return p.stdout
cmd=['ffmpeg','-y','-v','error','-f','lavfi','-i','testsrc2=size=160x96:rate=12:duration=1','-an','-c:v','mpeg2video','-g','12','-bf','2','-movflags','+frag_keyframe+empty_moov+default_base_moof',str(F/'island_mpeg2.mp4')]
p=subprocess.run(cmd,capture_output=True,timeout=15);assert p.returncode==0,p.stderr
log.append({'argv':cmd,'returncode':p.returncode,'stderr':p.stderr.decode(errors='replace')})
full=decode('video.mp4','yuv420p');a=decode('island_prefix.mp4','yuv420p');c=decode('island_suffix.mp4','yuv420p');middle=decode('island_mpeg2.mp4','yuv420p')
fsize=160*96*3//2
pr=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-of','json',str(F/'island_mpeg2.mp4')]))
middle_start=min(float(x['pts_time']) for x in pr['packets'])
middle_offset=7/6-middle_start
r={'prefix_frames':len(a)//fsize,'suffix_frames':len(c)//fsize,'prefix_exact_original':a==full[:12*fsize],
 'suffix_exact_original':c==full[24*fsize:],'software_middle_frames':len(middle)//fsize,'software_middle_format':'yuv420p',
 'software_middle_sha256':hashlib.sha256(middle).hexdigest(),
 'timeline':[
 {'interval_seconds':[1/6,7/6],'file':'island_prefix.mp4','owner':'native candidate','audio':'not included'},
 {'interval_seconds':[7/6,13/6],'file':'island_mpeg2.mp4','owner':'software candidate','source_start_time_seconds':middle_start,'presentation_offset_seconds':middle_offset,'audio':'not included'},
 {'interval_seconds':[13/6,25/6],'file':'island_suffix.mp4','owner':'native candidate','audio':'not included'}],
 'seamless_handoff':'NOT RUN; no Demuxe runtime, stable audio owner, or secure-context WebCodecs available',
 'commands':log}
(E/'island_component.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='commands'},indent=2))
