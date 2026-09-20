# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,statistics,bisect,sys
ROOT=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
def load(p):return json.loads(pathlib.Path(p).read_text())
def image(p):
 meta=loadjson=subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height','-of','json',str(p)]);d=json.loads(meta)['streams'][0];return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-pix_fmt','rgb24','-f','rawvideo','-']),d['width'],d['height']
def compare(a,b,rect):
 aa,w,h=image(a);bb,ww,hh=image(b);assert(w,h)==(ww,hh);x0,y0,x1,y1=map(int,rect);errs=[abs(aa[(y*w+x)*3+c]-bb[(y*w+x)*3+c]) for y in range(max(0,y0),min(h,y1)) for x in range(max(0,x0),min(w,x1)) for c in range(3)];return{'channels':len(errs),'max':max(errs),'mean':statistics.mean(errs),'above3':sum(v>3 for v in errs)}
def borders(folder):
 d=load(folder/'results.json');rows=[]
 for s in d['samples']:
  p=folder/(s['mode']+'.png');b,w,h=image(p);rect=s['held']['videoRect'];xx=int(rect['x']*2);ww=int(rect['width']*2);expected=[0,0,0,0,1,1,0,0];found=[]
  for y in range(h):
   vals=[b[(y*w+min(w-1,xx+int((i+.5)*ww/8)))*3:min(len(b),(y*w+min(w-1,xx+int((i+.5)*ww/8)))*3+3)] for i in range(8)]
   if all(len(v)==3 and max(v)-min(v)<15 and (sum(v)/3>128)==bool(e) for v,e in zip(vals,expected)):found.append(y)
  yy=min(found) if found else None
  counts={'yellow_AVLayer':0,'green_NV12_CALayer':0,'magenta_RGB_CALayer':0,'cyan_AVLayer':0}
  # Border ownership follows the observed video geometry, avoiding Chrome toolbar borders.
  if yy is not None:
   for y in range(max(0,yy-10),min(h,yy+int(rect['height']*2)+5)):
    for x in range(max(0,xx),min(w,xx+ww)):
     rr,g,bl=b[(y*w+x)*3:(y*w+x)*3+3]
     if min(rr,g)-bl>70 and abs(rr-g)<70:counts['yellow_AVLayer']+=1
     if g-max(rr,bl)>70:counts['green_NV12_CALayer']+=1
     if min(rr,bl)-g>40 and abs(rr-bl)<70:counts['magenta_RGB_CALayer']+=1
     if min(g,bl)-rr>70 and abs(g-bl)<70:counts['cyan_AVLayer']+=1
  rows.append({'mode':s['mode'],'sourceFrameIdentified':48 if yy is not None else None,'barcodeTop':yy,'nativeBorderCounts':counts,'held':s['held']})
 return rows
results={'diagnostic':borders(pathlib.Path('research/shared/runs/20260920T035600Z-overlay-range-diagnostic')),'fullscreenMulti':borders(pathlib.Path('research/shared/runs/20260920T040100Z-overlay-fullscreen-multi'))}
for name in ['20260920T040200Z-overlay-clean-cpu','20260920T041600Z-overlay-av-clean-cpu']:
 r=pathlib.Path('research/shared/runs')/name;d=load(r/'results.json');ratios=[s['direct']['totalCpuSeconds']/s['blend']['totalCpuSeconds'] for s in d['samples']];results[name]={'paired_cpu_ratios':ratios,'median_cpu_ratio':statistics.median(ratios),'cpu_gate_passed':statistics.median(ratios)<=.95 and max(ratios)<1,'native_vs_blend':compare(r/'direct.png',r/'blend.png',[0,174,1280,894]),'native_vs_canvas_control':compare(r/'direct.png',r/'canvas.png',[0,174,1280,894]),'dropped_counters':[(s['direct']['execution']['dropped'],s['blend']['execution']['dropped']) for s in d['samples']],'internal_rvfc_pts_gaps':{mode:sum(sum(round(b['mediaTime']*24)-round(a['mediaTime']*24)!=1 for a,b in zip(s[mode]['execution']['marks'],s[mode]['execution']['marks'][1:])) for s in d['samples']) for mode in ['direct','blend']},'cost_scope':'OwnedChromeprocess CPUduringplayback withsharedpreparedsource/browser; no hardwareGPUtime, power, startup orphysicalenergyclaim. Counterboundaryeffects recorded separately fromsource-identified WindowServer sequence.'}
r=pathlib.Path('research/shared/runs/20260920T040500Z-overlay-lifecycle');d=load(r/'results.json');life=[]
for state in ['caption-change','controls-hidden','scroll','resize']:
 a=next(s for s in d['samples'] if s['state']==state and s['mode']=='direct');rect=a['held']['rect'];roi=[rect['x']*2,max(174,174+rect['y']*2),rect['right']*2,174+rect['bottom']*2];life.append({'state':state,'held':a['held'],'native_vs_blend':compare(r/(state+'-direct.png'),r/(state+'-blend.png'),roi)})
results['lifecycle']=life
avs=[]
for name in ['20260920T041000Z-overlay-av-direct','20260920T041100Z-overlay-av-blend','20260920T041200Z-overlay-av-delay-control','20260920T041700Z-overlay-av-direct-longcapture']:
 r=pathlib.Path('research/shared/runs')/name;d=load(r/'results.json');events=load(r/'trace.json')['traceEvents'];anchor=next(e for e in events if e['name']=='OWNED_AV_ANCHOR');offset=anchor['ts']/1000-d['execution']['anchor'];captures=[json.loads(s) for s in (r/'captured.jsonl').read_text().splitlines()];seen=[]
 for z in captures:
  if z['status']!=0:continue
  bits=[int(z['grid'][k*4]>128) for k in range(8)];fid=sum(v<<k for k,v in enumerate(bits));host=z['displayTime']*z['timebaseNumer']/z['timebaseDenom']/1e6;seen.append((host,fid))
 times=[a for a,b in seen];audio=[]
 for a in d['execution']['audioRows']:
  cue=round((a['frequency']-500)/1000)
  if a['rms']<.01 or cue<0 or cue>7 or abs(a['frequency']-(500+1000*cue))>200:continue
  # Engine renderblock centre, observed mainthread receipt and context quantum. Not speaker photons.
  host=offset+a['receivedPerfMs']+((a['endFrame']-512)/a['sampleRate']-a['contextNow'])*1000
  i=bisect.bisect_right(times,host)-1
  if i<0:continue
  vt=seen[i][1]/24;distance=max(cue*.5-vt,vt-(cue+1)*.5,0);audio.append({'cue':cue,'videoFrame':seen[i][1],'engineHostMs':host,'outsideCueIntervalSeconds':distance})
 ids=[]
 for t,f in seen:
  if not ids or ids[-1]!=f:ids.append(f)
 missing=sorted(set(range(73))-set(ids));bad=sum(a['outsideCueIntervalSeconds']>.100001 for a in audio)
 boundaries=[]
 for cue in range(1,6):
  newer=[a['engineHostMs'] for a in audio if a['cue']==cue];older=[a['engineHostMs'] for a in audio if a['cue']==cue-1];visible=[t for t,f in seen if f==cue*12]
  if not newer or not older or not visible:continue
  first=min(newer);old=[t for t in older if t<first]
  if not old:continue
  lower=max(old)-1024/48/2;upper=first+1024/48/2;video=min(visible);boundaries.append({'cue':cue,'audioIntervalMs':[lower,upper],'videoTransitionMs':video,'offsetMidpointMs':(lower+upper)/2-video,'uncertaintyMs':(upper-lower)/2,'worstAbsOffsetMs':max(abs(lower-video),abs(upper-video))})
 avs.append({'run':name,'variant':d['variant'],'identified_frame_ids':ids,'missing_ids':missing,'source_monotonic':all(a<b for a,b in zip(ids,ids[1:])),'audio_windows_classified':len(audio),'total_audio_windows':len(d['execution']['audioRows']),'audio_video_outside_100ms':bad,'max_outside_cue_seconds':max([a['outsideCueIntervalSeconds'] for a in audio],default=None),'audio_rows':audio,'transition_alignment':boundaries,'all_transition_bounds_within100ms':len(boundaries)>=4 and all(b['worstAbsOffsetMs']<=100 for b in boundaries),'scope':'Actual decodedAAC render-engine cue vs sourceidentified WindowServervideo atsharedmonotonic clock; <=100ms blockboundary allowance; excludes physicalspeaker latency anddirecthardwareoverlay.'})
results['av']=avs;results['limitations']='Borderdiagnostic identifies actual Chrome CALayer type only. Clean CPUandfidelity runs have no diagnosticflag. Exactrevision source setsdebugborder afterlayerselection; downstreamOSpromotion maydiffer andisnotclaimed. ScreenCaptureKitcanperturbcomposition; onlycapturedoutput andnormalChromeYUV/RGBsurfacepath qualified. No universal CSS orphysicalenergy claim.'
(out/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps({k:v for k,v in results.items() if k not in ['diagnostic','fullscreenMulti','lifecycle','av']},indent=2));print('AV',[(a['run'],a['missing_ids'],a['audio_video_outside_100ms'],a['max_outside_cue_seconds']) for a in avs]);print('LIFE',[(s['state'],s['native_vs_blend']['max']) for s in life]);print('PATH',[(s['mode'],s['sourceFrameIdentified'],s['nativeBorderCounts']) for s in results['diagnostic']+results['fullscreenMulti']])
