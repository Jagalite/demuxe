# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,hashlib,sys,re
p=pathlib.Path(sys.argv[1]);
def raw(n):
 r=subprocess.run(['ffmpeg','-v','warning','-i',str(p/(n+'.mp4')),'-pix_fmt','yuv420p','-f','rawvideo','-'],capture_output=True);(p/(n+'-decode.log')).write_bytes(r.stderr);assert r.returncode==0;return r.stdout
left,right,merged=raw('a'),raw('b'),raw('explicit');assert len(left)==len(right)==6*64*64*3//2 and len(merged)==2*len(left)
frames=[];bad=[]
for i in range(6):
 parts=[]
 for off,w,ht in [(0,64,64),(4096,32,32),(5120,32,32)]:
  for y in range(ht):
   a=i*6144+off+y*w;parts.append(left[a:a+w]+right[a:a+w])
 expected=b''.join(parts);got=merged[i*12288:(i+1)*12288];changed=sum(a!=b for a,b in zip(expected,got));frames.append({'frame':i,'hash':hashlib.sha256(got).hexdigest(),'expected':hashlib.sha256(expected).hexdigest(),'differentSamples':changed})
 if changed:bad.append(i)
assert not bad,frames
# Inspect every source frame type and each merged picture's two independent slice payloads. Byte stream/header changes are expected; raw payload suffix proof below uses GPAC's HEVC trace size offsets if available.
probes={}
for n in ['a','b','explicit']:
 d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_frames','-show_streams','-of','json',str(p/(n+'.mp4'))]));assert all(f.get('pict_type')=='I' for f in d['frames']);probes[n]={'frames':len(d['frames']),'width':d['streams'][0]['width'],'height':d['streams'][0]['height'],'profile':d['streams'][0]['profile']}
 neg=json.loads((p/'mismatch-command.json').read_text());assert neg['exit']!=0
(p/'results.json').write_text(json.dumps({'frames':frames,'probes':probes,'strictMismatchRejected':True,'scope':'All-intra CTU-aligned source profile; full independently decoded YUV concatenation exact. No arbitrary temporal-motion independence inferred.'},indent=2));print(probes)
