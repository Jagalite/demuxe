# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,math,time,statistics,random
p=pathlib.Path(sys.argv[1]);plan={'qualityBudgetLumaPSNR':20,'requiredCostRatio':.95,'scope':'One8bit420 keyframe; fixeddenominator12, restorationdisabled. Actual owned pre-upscale pixels; cancellable one-shot preview only, no later references. Ordinary baseline fullnative decode then exact area-downscale. Paired completeprocess jobs include outputcopy/writes.'};(p/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');records=[]
def run(cmd,ok=True):
 r=subprocess.run(cmd,capture_output=True,timeout=60);records.append({'command':cmd,'exit':r.returncode,'stderr':r.stderr.decode(errors='replace'),'stdout':r.stdout.decode(errors='replace')[:3000]});
 if ok:assert r.returncode==0,r.stderr
 return r
run(['ffmpeg','-v','error','-i','build/local-screening/media/bbb-key-060.mp4','-frames:v','1','-vf','scale=640:360','-pix_fmt','yuv420p','-f','rawvideo','-y',str(p/'source.yuv')])
for name,denom in [('superres',12),('ordinary',8)]:
 run(['build/catalogue-tools/aom-build/aomenc','--ivf','--i420','--width=640','--height=360','--fps=24/1','--passes=1','--cpu-used=8','--threads=1','--lag-in-frames=0','--limit=1','--end-usage=q','--cq-level=24','--superres-mode=1','--superres-denominator='+str(denom),'--superres-kf-denominator='+str(denom),'--enable-restoration=0','-o',str(p/(name+'.ivf')),str(p/'source.yuv')])
program=str((p/'preview').resolve());src=str(p/'superres.ivf');results={}
for mode in [0,1,2]:results[mode]=json.loads(run([program,src,str(p/f'mode{mode}'),str(mode)]).stdout)
assert results[0]['capturedBeforeUpscale'] and results[1]['capturedBeforeUpscale'];assert results[0]['previewWidth']==results[1]['previewWidth']==427 and results[0]['displayWidth']==640
assert (p/'mode0.preview.yuv').read_bytes()==(p/'mode1.preview.yuv').read_bytes();r=subprocess.run(['ffmpeg','-v','error','-i',src,'-pix_fmt','yuv420p','-f','rawvideo','-'],capture_output=True,timeout=20);assert r.returncode==0 and r.stdout==(p/'mode0.full.yuv').read_bytes();(p/'independent-full.yuv').write_bytes(r.stdout)
a=(p/'mode1.preview.yuv').read_bytes();b=(p/'mode2.preview.yuv').read_bytes();assert len(a)==len(b);mse=sum((x-y)**2 for x,y in zip(a[:427*360],b[:427*360]))/(427*360);psnr=10*math.log10(255*255/mse) if mse else 999
r=run([program,str(p/'ordinary.ivf'),str(p/'wrong-no-superres'),'1'],False);assert r.returncode!=0
(p/'truncated.ivf').write_bytes((p/'superres.ivf').read_bytes()[:45]);r=run([program,str(p/'truncated.ivf'),str(p/'wrong-truncated'),'1'],False);assert r.returncode!=0
rows=[]
for pair in range(11):
 for mode in ([1,2] if pair%2 else [2,1]):
  start=time.perf_counter();r=run([program,src,str(p/f'cost-{pair}-{mode}'),str(mode)]);rows.append({'pair':pair,'mode':mode,'ms':(time.perf_counter()-start)*1000});assert (p/f'cost-{pair}-{mode}.preview.yuv').read_bytes()==(a if mode==1 else b)
ratios=[next(r['ms'] for r in rows if r['pair']==i and r['mode']==1)/next(r['ms'] for r in rows if r['pair']==i and r['mode']==2) for i in range(11)];rng=random.Random(269);boot=sorted(statistics.median(rng.choices(ratios,k=11)) for _ in range(10000));result={'plan':plan,'geometry':results,'previewLumaPSNR':psnr,'qualityPassed':psnr>=20,'rows':rows,'medianCompleteCostRatio':statistics.median(ratios),'bootstrap95':[boot[250],boot[9750]],'controls':{'ordinaryNoTapRejected':True,'truncatedRejected':True,'copySurvivesDecoderDestroy':True,'continuingTapEqualsCancelledTap':True,'fullOutputEqualsIndependentDav1d':True},'passed':True};(p/'commands.json').write_text(json.dumps(records,indent=2)+'\n');(p/'result.json').write_text(json.dumps(result,indent=2)+'\n');print({k:result[k] for k in ['previewLumaPSNR','qualityPassed','medianCompleteCostRatio','bootstrap95']})
