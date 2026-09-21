# SPDX-License-Identifier: Apache-2.0
"""Bounded component screening. Single decoder/filter thread; seeded randomized rounds.
Native FFmpeg CLI timings include process/demux/scale/output overhead, not browser timings.
"""
import pathlib,subprocess,json,time,resource,statistics,random,re,hashlib,math,io
import numpy as np
from PIL import Image,features
from skimage.metrics import structural_similarity
R=pathlib.Path(__file__).resolve().parents[1]; F=R/'fixtures'; O=R/'results'; O.mkdir(exist_ok=True)
def run(cmd):
 before=resource.getrusage(resource.RUSAGE_CHILDREN); t=time.perf_counter()
 p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
 wall=time.perf_counter()-t; after=resource.getrusage(resource.RUSAGE_CHILDREN)
 return {'returncode':p.returncode,'wall_ms':wall*1000,'cpu_ms':((after.ru_utime+after.ru_stime)-(before.ru_utime+before.ru_stime))*1000,'sha256':hashlib.sha256(p.stdout).hexdigest(),'output_bytes':len(p.stdout),'stderr':p.stderr.decode(errors='replace')},p.stdout
base=['ffmpeg','-hide_banner','-nostdin','-v','error','-threads','1','-filter_threads','1','-filter_complex_threads','1']
# Capability must check output dimensions, not the exit status: unsupported lowres can be clamped.
cap=[]
for name in ['h264.mp4','hevc.mp4','vp9.webm','av1.mkv','mpeg2.mkv','chart4k.jpg']:
 for lowres in [0,1,3]:
  cmd=['ffmpeg','-hide_banner','-nostdin','-v','info','-threads','1','-filter_threads','1','-lowres',str(lowres),'-i',str(F/name),'-an','-frames:v','1','-vf','showinfo','-f','null','-']
  row,_=run(cmd); row.update(file=name,lowres=lowres,command=cmd)
  row['decoded_dimensions']=re.findall(r'\bs:(\d+x\d+)\b',row['stderr'])[:1]
  cap.append(row)
(O/'lowres_capabilities.json').write_text(json.dumps(cap,indent=2))
print('LOWRES',[(x['file'],x['lowres'],x['decoded_dimensions']) for x in cap],flush=True)
# Same output keyframes: full decoding then keyframe selection vs decoder keyframe skipping.
variants={}
for name in ['h264.mp4','hevc.mp4','vp9.webm']:
 for method in ['full_then_select','skip_nokey','skip_nokey_nofilter']:
  opt=[] if method=='full_then_select' else ['-skip_frame','nokey']
  if method.endswith('nofilter'):opt+=['-skip_loop_filter','all']
  vf="select=eq(pict_type\\,I)," if method=='full_then_select' else ''
  vf+='scale=240:135:flags=area,format=rgb24'
  variants[name+':'+method]=base+opt+['-i',str(F/name),'-an','-sn','-dn','-vf',vf,'-fps_mode','vfr','-f','rawvideo','-']
raw={k:[] for k in variants}; outputs={}
for round in range(6):
 keys=list(variants);random.Random(371+round).shuffle(keys)
 for k in keys:
  row,b=run(variants[k]); row['round']=round; row['warmup']=round==0
  if row['returncode']:raise RuntimeError(k+row['stderr'])
  raw[k].append(row);outputs[k]=b
summary=[]
for k,rows in raw.items():
 rows=rows[1:]; name,method=k.split(':'); b=outputs[k]; ref=outputs[name+':full_then_select']
 psnr=None
 if len(b)==len(ref) and b:
  d=np.frombuffer(b,np.uint8).astype(np.float64)-np.frombuffer(ref,np.uint8)
  mse=float(np.mean(d*d));psnr=100.0 if mse==0 else float(10*math.log10(255**2/mse))
 summary.append({'file':name,'method':method,'wall_ms_median':statistics.median(r['wall_ms'] for r in rows),'cpu_ms_median':statistics.median(r['cpu_ms'] for r in rows),'frames':len(b)//(240*135*3),'same_pixels_as_full':b==ref,'psnr_db_to_full':psnr,'output_stable':len({r['sha256'] for r in rows})==1})
(O/'native_keyframe_bench.json').write_text(json.dumps({'methodology':'1 warmup + 5 seeded shuffled measured trials; full-then-select baseline decodes whole six-second file, not optimized random access; hot filesystem; CPU child user+system','commands':variants,'summary':summary,'raw':raw},indent=2))
print('KEYFRAME',json.dumps(summary),flush=True)
# Decoder-scaled JPEG vs the same JPEG fully decoded then reduced; separate pre-authored baseline.
jraw={};jout={}
for name in ['chart4k','texture4k']:
 data=(F/f'{name}.jpg').read_bytes(); thumb=(F/f'{name}_thumb.jpg').read_bytes()
 for method in ['full_resize','draft_eighth_resize','authored_thumbnail']:
  times=[]; cpus=[]
  for i in range(21):
   t=time.perf_counter(); c=time.process_time()
   im=Image.open(io.BytesIO(thumb if method=='authored_thumbnail' else data))
   if method=='draft_eighth_resize':im.draft('RGB',(480,270))
   im.load(); intermediate=im.size
   out=im.resize((240,135),Image.Resampling.LANCZOS) if im.size!=(240,135) else im.copy()
   b=out.tobytes(); im.close();out.close(); elapsed=(time.perf_counter()-t)*1000;cpu=(time.process_time()-c)*1000
   if i:times.append(elapsed);cpus.append(cpu)
  k=name+':'+method;jout[k]=b;jraw[k]={'wall_ms':times,'cpu_ms':cpus,'intermediate':intermediate,'input_bytes':len(thumb if method=='authored_thumbnail' else data)}
jsummary=[]
for k,row in jraw.items():
 name,method=k.split(':'); a=np.frombuffer(jout[k],np.uint8).reshape(135,240,3);b=np.frombuffer(jout[name+':full_resize'],np.uint8).reshape(135,240,3)
 mse=float(np.mean((a.astype(float)-b.astype(float))**2))
 jsummary.append({'fixture':name,'method':method,'wall_ms_median':statistics.median(row['wall_ms']),'cpu_ms_median':statistics.median(row['cpu_ms']),'intermediate':row['intermediate'],'input_bytes':row['input_bytes'],'psnr_db':100 if mse==0 else 10*math.log10(255**2/mse),'ssim':float(structural_similarity(a,b,channel_axis=2,data_range=255))})
(O/'jpeg_bench.json').write_text(json.dumps({'methodology':'1 warmup+20 repeats, in-memory JPEG bytes, sequential method order (not randomized); decode+resize+RGB output; synthetic content; no network','jpeg_version':features.version_codec('jpg'),'libjpeg_turbo':features.check_feature('libjpeg_turbo'),'summary':jsummary,'raw':jraw},indent=2))
print('JPEG',json.dumps(jsummary),flush=True)
(O/'environment.txt').write_text(subprocess.getoutput('ffmpeg -version')+'\n'+subprocess.getoutput('chromium --version')+'\n'+subprocess.getoutput('lscpu')+'\n/dev/dri exists: '+str(pathlib.Path('/dev/dri').exists()))
