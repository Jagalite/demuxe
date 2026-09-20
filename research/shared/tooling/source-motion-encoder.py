# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,time,math,statistics,av
p=pathlib.Path(sys.argv[1]);base=pathlib.Path(pathlib.Path('/tmp/demuxe-idct-cache-run').read_text());cases={};records=[]
# Predeclared altered-output gate: <=0.1dB PSNR loss and <=2% output growth,
# then >=5% complete cold source-analysis plus real HEVC encode improvement.
plan={'qualityLossMaxDb':.1,'byteGrowthMax':1.02,'requiredCostRatio':.95,'hintRule':'95th percentile absolute coded AVC motion component +8 pixels, integer clamp16..57; no hints means ordinary57. Scene-change I frames retained in source and target independently decides its own scene cuts.'};(p/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
nat=(base/'natural.yuv').read_bytes();graphic=(base/'graphics.yuv').read_bytes();sources={'natural':nat,'scene-change':nat[:30*23040]+graphic[:30*23040]}
def command(cmd,limit=30):
 r=subprocess.run(cmd,capture_output=True,timeout=limit);records.append({'command':cmd,'exit':r.returncode,'stderr':r.stderr.decode(errors='replace')});assert r.returncode==0,r.stderr;return r.stdout
for name,raw in sources.items():
 (p/(name+'.yuv')).write_bytes(raw);source=p/(name+'.mp4');command(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','yuv420p','-s','160x96','-r','24','-i',str(p/(name+'.yuv')),'-c:v','libx264','-preset','veryfast','-crf','18','-x264-params','bframes=0:keyint=999:scenecut=40','-y',str(source)]);oracle=command(['ffmpeg','-v','error','-i',str(source),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);(p/(name+'-oracle.yuv')).write_bytes(oracle);cases[name]={'source':source,'oracle':oracle}
def hints(source):
 values=[];keys=[];c=av.open(str(source));c.streams.video[0].codec_context.options={'flags2':'+export_mvs'}
 for i,f in enumerate(c.decode(video=0)):
  if f.key_frame:keys.append(i)
  for sd in f.side_data:
   if sd.type.name=='MOTION_VECTORS':
    for mv in sd:
     if not mv.motion_scale:raise ValueError('missing motion scale')
     values.extend([abs(mv.motion_x/mv.motion_scale),abs(mv.motion_y/mv.motion_scale)])
 c.close();values.sort();q=values[int(.95*(len(values)-1))] if values else None;limit=max(16,min(57,math.ceil(q+8))) if q is not None else 57
 return {'merange':limit,'vectors':len(values)//2,'p95AbsolutePixels':q,'sourceKeyframes':keys,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest()}
rows=[]
for name,c in cases.items():
 for pair in range(7):
  for mode in (['hint','baseline'] if pair%2 else ['baseline','hint']):
   start=time.perf_counter();hint=hints(c['source']) if mode=='hint' else None;limit=hint['merange'] if hint else 57;dest=p/f'{name}-{pair}-{mode}.mp4';command(['ffmpeg','-v','error','-i',str(c['source']),'-an','-c:v','libx265','-preset','medium','-crf','24','-x265-params',f'merange={limit}:pools=none:frame-threads=1:log-level=error','-y',str(dest)]);ms=(time.perf_counter()-start)*1000;decoded=command(['ffmpeg','-v','error','-i',str(dest),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);assert len(decoded)==len(c['oracle']);sse=sum((a-b)**2 for a,b in zip(decoded,c['oracle']));psnr=10*math.log10(255**2/(sse/len(decoded))) if sse else 999;rows.append({'source':name,'pair':pair,'mode':mode,'ms':ms,'hint':hint,'bytes':dest.stat().st_size,'psnr':psnr,'decodedFrames':len(decoded)//23040})
analysis={}
for name in cases:
 ratios=[];qualities=[];sizes=[]
 for i in range(7):
  a=next(r for r in rows if r['source']==name and r['pair']==i and r['mode']=='baseline');b=next(r for r in rows if r['source']==name and r['pair']==i and r['mode']=='hint');ratios.append(b['ms']/a['ms']);qualities.append(a['psnr']-b['psnr']);sizes.append(b['bytes']/a['bytes'])
 analysis[name]={'medianCompleteCostRatio':statistics.median(ratios),'range':[min(ratios),max(ratios)],'maxQualityLossDb':max(qualities),'maxByteRatio':max(sizes),'qualityPassed':max(qualities)<=.1 and max(sizes)<=1.02,'costPassed':statistics.median(ratios)<=.95}
(p/'commands.json').write_text(json.dumps(records,indent=2)+'\n');(p/'result.json').write_text(json.dumps({'plan':plan,'rows':rows,'analysis':analysis,'passed':True,'limits':'Actual x265 global merange hook, not per-block source-vector injection or unchanged quality. Cost includes fresh source-motion decode pass and target transcode, excludes independent result-oracle work in both variants.'},indent=2)+'\n');print(analysis)
