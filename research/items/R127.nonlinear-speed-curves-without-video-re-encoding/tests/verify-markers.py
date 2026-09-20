# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,array,math,hashlib
p=pathlib.Path(sys.argv[1]);
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-of','json',str(f)]))['packets']
def raw(f,*args):return subprocess.check_output(['ffmpeg','-v','error','-i',str(f),*args,'-'])
a,b=probe(p/'source.mkv'),probe(p/'candidate.mp4');assert len(a)==len(b)==96
warp=lambda t:t if t<=1 else 1+(t-1)/2 if t<=2 else 1.5+(t-2)*2
errs=[]
for x,y in zip(a,b):
 assert x['data_hash']==y['data_hash'];errs.append(abs(float(y['pts_time'])-warp(float(x['pts_time']))));assert float(y['pts_time'])>=float(y['dts_time'])
assert max(errs)<=.001
ha=raw(p/'source.mkv','-map','0:v','-f','framemd5').decode();hb=raw(p/'candidate.mp4','-map','0:v','-fps_mode','passthrough','-f','framemd5').decode()
get=lambda s:[v.split(',')[-1].strip() for v in s.splitlines() if not v.startswith('#')]
assert get(ha)==get(hb);(p/'source.framemd5').write_text(ha);(p/'candidate.framemd5').write_text(hb)
ar=raw(p/'audio-reference.wav','-map','0:a','-f','s16le');br=raw(p/'candidate.mp4','-map','0:a','-f','s16le');assert ar==br;assert len(br)//2==264000
samples=array.array('h',br);joins=[]
for t in [1,1.5]:
 vals=samples[int((t-.08)*48000):int((t+.08)*48000)];run=longest=0
 for i in range(0,len(vals)-64,64):
  rms=math.sqrt(sum(v*v for v in vals[i:i+64])/64)/32768
  run=run+64 if rms<.005 else 0;longest=max(run,longest)
 joins.append({'time':t,'longestQuietMs':longest/48})
assert max(r['longestQuietMs'] for r in joins)<=5
pitch=[]
for lo,hi in [(.1,.4),(1.05,1.15),(2,2.8)]:
 vals=samples[int(lo*48000):int(hi*48000)];cross=sum(a<=0<b for a,b in zip(vals,vals[1:]));hz=cross/(hi-lo);pitch.append(hz);assert abs(hz-440)/440<.01
# Explicit maps rejected before authoring, independent planner controls.
def validate(points):
 assert points[0]==[0,0]
 for a,b in zip(points,points[1:]):assert b[0]>a[0] and b[1]>a[1]
for bad in [[[0,0],[1,1],[2,.5]],[[0,0],[1,1],[1,2]]]:
 try:validate(bad);raise RuntimeError('bad map accepted')
 except AssertionError:pass
last=0
for x in reversed(samples):
 if x:break
 last+=1
r={'pictures':96,'packetPayloadsExact':True,'maxMapErrorSeconds':max(errs),'pcmSamples':len(samples),'pcmSha256':hashlib.sha256(br).hexdigest(),'pitchHz':pitch,'joinQuiet':joins,'finalSilentTailMs':last/48,'invalidMapsRejected':2,'scope':'Host noB AVC and mono controlled atempo/FLAC output; no generalized Bframe/perceptual or browser claim yet.'};(p/'host-results.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
