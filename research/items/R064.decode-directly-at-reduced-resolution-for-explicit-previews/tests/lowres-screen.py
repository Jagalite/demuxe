# SPDX-License-Identifier: Apache-2.0
import subprocess,json,pathlib,time,math,random,statistics,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
def run(a):
 with (out/'commands.log').open('a') as f:f.write(' '.join(map(str,a))+'\n')
 p=subprocess.run(list(map(str,a)),stdout=subprocess.PIPE,stderr=subprocess.PIPE);assert p.returncode==0,p.stderr.decode();return p.stdout
plan={'declared_before_execution':True,'profile':'Explicit quarter-width/height preview only;12 MJPEG720p frames; no permission fromCSSsize. Full-decode+area-scale reference vsdecoder lowres2.','fidelity':'All12 frames, same timeline and320x180geometry; deliberate reduceddetail, luma/RGBPSNR >=30dB everyframe against fullreference. Report exactdifferences; never claim exactplayback fidelity.','admission':'Only explicit preview intent andmax_lowres>=requested; h264 rejected forlowres and retains fullresolution.','metric':'Nine alternating coldprocesspairs include demux/decode/scale/RGBAoutput/cleanup andreadbytes; preparation excluded. Lower95 bootstrap saving>=10%. Browser presentation checked separately nottimed.'};(out/'plan.json').write_text(json.dumps(plan,indent=2))
flags=run(['pkg-config','--cflags','--libs','libavcodec']).decode().split();binary='build/catalogue-tools/codec-lowres';run(['cc','-O2','research/items/R064.decode-directly-at-reduced-resolution-for-explicit-previews/tests/codec-lowres.c',*flags,'-o',binary]);caps=json.loads(run([binary]));assert caps['max_lowres']['mjpeg']>=2 and caps['max_lowres']['h264']==0
admit=lambda intent,codec,n:intent=='preview' and 0<n<=caps['max_lowres'].get(codec,0)
assert admit('preview','mjpeg',2) and not admit('playback','mjpeg',2) and not admit('preview','h264',2)
source=out/'input.avi';run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=1280x720:rate=24','-frames:v','12','-c:v','mjpeg','-q:v','2','-pix_fmt','yuvj420p',source]);probe=json.loads(run(['ffprobe','-v','error','-show_frames','-select_streams','v','-of','json',source]));assert len(probe['frames'])==12
base=['ffmpeg','-v','error','-threads','1'];tail=['-fps_mode','passthrough','-pix_fmt','rgba','-f','rawvideo','-'];cmd=lambda low:base+(['-lowres','2'] if low else [])+['-i',str(source)]+([] if low else ['-vf','scale=320:180:flags=area'])+tail
reference=run(cmd(False));candidate=run(cmd(True));(out/'reference.rgba').write_bytes(reference);(out/'candidate.rgba').write_bytes(candidate);assert len(reference)==len(candidate)==12*320*180*4
psnr=[];maximum=0;changed=0
for f in range(12):
 a=reference[f*230400:(f+1)*230400];b=candidate[f*230400:(f+1)*230400];errors=[int(x)-int(y) for i,(x,y) in enumerate(zip(a,b)) if i%4!=3];mse=sum(x*x for x in errors)/len(errors);psnr.append(10*math.log10(255**2/mse) if mse else 999);maximum=max(maximum,max(map(abs,errors)));changed+=sum(x!=0 for x in errors)
result={'capabilities':caps,'explicit_admission_controls':True,'frame_pts':[x.get('pts_time') for x in probe['frames']],'psnr_rgb':psnr,'maximum_channel_difference':maximum,'different_channel_values':changed,'correctness':min(psnr)>=30,'pairs':[]}
if result['correctness']:
 for i in range(9):
  pair={}
  for low in ([True,False] if i%2 else [False,True]):
   t=time.perf_counter();data=run(cmd(low));assert data==(candidate if low else reference);pair['candidate' if low else 'baseline']=(time.perf_counter()-t)*1000
  result['pairs'].append(pair)
 b=[x['baseline'] for x in result['pairs']];c=[x['candidate'] for x in result['pairs']];rng=random.Random(64);boots=[]
 for _ in range(10000):
  ids=[rng.randrange(9) for _ in range(9)];boots.append(100*(1-sum(c[i] for i in ids)/sum(b[i] for i in ids)))
 boots.sort();result.update(baseline_mean_ms=statistics.mean(b),candidate_mean_ms=statistics.mean(c),saving_percent=100*(1-sum(c)/sum(b)),bootstrap95=[boots[250],boots[9750]],performance=boots[250]>=10)
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
