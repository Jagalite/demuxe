from build import *
from PIL import Image
import numpy as np
result={}
# Independent host decode of all source-authored AVC intervals versus constructed stream.
refdir=E/'host_reference_pixels';refdir.mkdir(exist_ok=True)
refs=[]
for i in range(3):
 d=refdir/str(i);d.mkdir(exist_ok=True)
 ff('-i',F/f'epoch{i}.mp4','-fps_mode','passthrough','-noautoscale','-threads','1',d/'frame-%03d.png')
 refs+=sorted(d.glob('*.png'))
actual=sorted((E/'host_epoch_pixels').glob('*.png'))
rows=[]
for i,(a,b) in enumerate(zip(refs,actual)):
 aa=np.asarray(Image.open(a).convert('RGB'));bb=np.asarray(Image.open(b).convert('RGB'))
 rows.append({'ordinal':i,'expected_size':[aa.shape[1],aa.shape[0]],'actual_size':[bb.shape[1],bb.shape[0]],'expected_hash':sha(aa.tobytes()),'actual_hash':sha(bb.tobytes()),'exact':aa.shape==bb.shape and np.array_equal(aa,bb)})
result['D27']={'source_frames':len(refs),'constructed_frames':len(actual),'frames':rows}
# Actual compressed VCL and raw planar checks for crop candidates.
def vcl(name):
 b=(F/name).read_bytes();out=[]
 for s,n,t in boxes(b):
  if t!=b'mdat':continue
  q=s+8
  while q<s+n:
   ln=int.from_bytes(b[q:q+4],'big');q+=4
   if not 0<ln<=s+n-q:raise ValueError('NAL length')
   if b[q]&31 in (1,5):out.append(sha(b[q:q+ln]))
   q+=ln
 return out
source=raw('epoch0.mp4','video');base=np.frombuffer(source,np.uint8).reshape(30,160*96*3//2)
def crop_yuv(src,l,r,t,bot):
 output=[]
 for frame in src:
  y=frame[:160*96].reshape(96,160);u=frame[160*96:160*96+80*48].reshape(48,80);v=frame[160*96+80*48:].reshape(48,80)
  output.append(y[t:96-bot,l:160-r].tobytes()+u[t//2:(96-bot)//2,l//2:(160-r)//2].tobytes()+v[t//2:(96-bot)//2,l//2:(160-r)//2].tobytes())
 return b''.join(output)
r={}
for name,l,rr in [('sps_crop.mp4',8,8),('coherent8.mp4',8,8),('coherent32.mp4',32,0)]:
 a=raw(name,'video');expected=crop_yuv(base,l,rr,8,8)
 r[name]={'vcl_packets':len(vcl(name)),'vcl_preserved':vcl(name)==vcl('epoch0.mp4'),'expected_yuv_bytes':len(expected),'actual_yuv_bytes':len(a),'host_crop_exact':a==expected,'expected_hash':sha(expected),'actual_hash':sha(a)}
r['clean_aperture.mp4']={'vcl_preserved':vcl('clean_aperture.mp4')==vcl('epoch0.mp4'),'vcl_packets':len(vcl('clean_aperture.mp4'))}
result['D29']=r
# Ogg / WebM packet-copy check independent of browser output checks.
baseprobe=json.loads((E/'mono.opus.probe.json').read_text());basehash=[p['data_hash'] for p in baseprobe['packets']];op={}
for name in ['dual','left','right']:
 for ext in ['opus','webm']:
  p=json.loads((E/(name+'.'+ext+'.probe.json')).read_text());hs=[x['data_hash'] for x in p['packets']]
  op[name+'.'+ext]={'packet_count':len(hs),'payloads_unchanged':hs==basehash}
result['D26']=op
save('host_checks.json',result)
print(json.dumps({k: v if k!='D27' else {**v,'frames':'in JSON'} for k,v in result.items()},indent=2))
