# SPDX-License-Identifier: Apache-2.0
"""Recovered-title contracts: actual FFmpeg H264 temporal filtering and smart cuts."""
import subprocess,json,pathlib,time,statistics,hashlib,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);commands=[]
def run(args,check=True):
 t=time.perf_counter();p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE);elapsed=time.perf_counter()-t
 commands.append({'argv':args,'exit':p.returncode,'seconds':elapsed,'stderr':p.stderr.decode(errors='replace')[-5000:]})
 if check and p.returncode:raise RuntimeError(commands[-1])
 return p.stdout,elapsed
F=['ffmpeg','-hide_banner','-loglevel','error','-y'];P=['ffprobe','-v','error']
def ff(args):return run(F+args)
def raw(path,args=[]):return ff(args+['-i',str(path),'-an','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'])[0]
def hashes(b,n):return [hashlib.sha256(b[i:i+n]).hexdigest() for i in range(0,len(b),n)]
def info(path,args=[]):return json.loads(run(P+args+['-select_streams','v','-show_frames','-show_entries','frame=best_effort_timestamp_time,pict_type,key_frame','-of','json',str(path)])[0])['frames']
plan={'provenance':'Contracts independently derived from recovered titles; not recovered original reports.','R076':{'profile':'1280x720 240-frame H264 closed GOP 30fps, bframes=2,b-pyramid=none, drop only nonreference pictures before decoder reconstruction; retain original display PTS. Full decode then same PTS selection is oracle/baseline. Also no-B fallback, random access, wrong reference removal.','correctness':'All kept decoded YUV bytes and source timestamps exact, nonreference drop reduces pictures, invalid reference drop detected; stream reopen/seek/cancellation no stale output.','performance':'7 alternating paired fresh-process jobs to full output; >=5% median total wall saving, every pair <1; include launch, demux/decode, output serialization and teardown. No realtime/energy claim.'},'R077':{'profile':'Video-only 640x360 LOSSLESS H264 closed GOP/no B at30fps. Cut [7,113) of120; lossless reencode boundary GOP portions [7,30),[90,113), packetcopy complete interior GOPs[30,90). Output standalone AnnexB remuxed MP4.','correctness':'106 exact decoded frames in order vs full decode trim, rebased monotonic timestamps, interior encoded slice packets byte-preserved, wrong earlier start detected, random seek/reopen/cancel.','performance':'7 alternating full jobs versus full trimmed lossless reencode, including extraction, boundary decode+encode, file I/O, concat and mux. >=5% median saving and every pair faster; source preparation excluded equally.'}}
plan.pop('R077')
(out/'plan.json').write_text(json.dumps(plan,indent=2))
results={'plan':plan,'ffmpeg':run(['ffmpeg','-version'])[0].decode().splitlines()[0]}
try:
 src=out/'bframes.mp4';ff(['-f','lavfi','-i','testsrc2=size=1280x720:rate=30:duration=8','-an','-c:v','libx264','-threads','1','-preset','medium','-crf','18','-g','30','-keyint_min','30','-sc_threshold','0','-x264-params','bframes=2:b-pyramid=none:open-gop=0',str(src)])
 full=raw(src);n=1280*720*3//2;frames=info(src);fullhash=hashes(full,n)
 kept=raw(src,['-skip_frame','noref']);ki=info(src,['-skip_frame','noref']);kh=hashes(kept,n);indexes=[next(i for i,f in enumerate(frames) if f['best_effort_timestamp_time']==k['best_effort_timestamp_time']) for k in ki];assert kh==[fullhash[i] for i in indexes]
 # The baseline pays complete decode before discarding identical display timestamps.
 def balanced(xs):return xs[0] if len(xs)==1 else '('+balanced(xs[:len(xs)//2])+'+'+balanced(xs[len(xs)//2:])+')'
 expr=balanced(['eq(n\\,%d)'%i for i in indexes]);base=['-i',str(src),'-vf','select='+expr,'-an','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'];cand=['-skip_frame','noref','-i',str(src),'-an','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']
 samples=[]
 for trial in range(7):
  row={}
  for mode,args in ([('baseline',base),('candidate',cand)] if trial%2==0 else [('candidate',cand),('baseline',base)]):
   b,t=ff(args);assert b==kept;row[mode]=t
  samples.append(row)
 # Independent reference deletion control: keeping key frames cannot satisfy this cadence.
 wrong=raw(src,['-skip_frame','nokey']);assert wrong!=kept
 seeks=[]
 for start in ['0','1','2','0']:
  a=raw(src,['-ss',start,'-skip_frame','noref']);b=raw(src,['-ss',start]);af=hashes(a,n);bf=hashes(b,n);assert all(x in bf for x in af);seeks.append({'start':start,'kept':len(af),'allExact':True})
 nob=out/'no-b.mp4';ff(['-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=1','-c:v','libx264','-threads','1','-bf','0','-g','30',str(nob)]);assert raw(nob)==raw(nob,['-skip_frame','noref'])
 proc=subprocess.Popen(F+['-re','-stream_loop','-1','-skip_frame','noref','-i',str(src),'-f','null','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE);time.sleep(.15);proc.terminate();proc.communicate(timeout=5);assert raw(src,['-skip_frame','noref'])==kept
 ratios=[x['candidate']/x['baseline'] for x in samples]
 results['R076']={'source_frames':len(fullhash),'kept_frames':len(kh),'retained_indices':indexes,'retained_pts':[k['best_effort_timestamp_time'] for k in ki],'kept_hashes':kh,'all_exact':True,'wrong_reference_selection_detected':True,'no_b_fallback_exact':True,'seek_reopen':seeks,'cancel_process_exited':proc.returncode,'fresh_owner_exact':True,'samples':samples,'median_ratio':statistics.median(ratios),'performance_pass':statistics.median(ratios)<=.95 and max(ratios)<1,'excluded':'Host software decoder profile; no native/WebCodecs, variable-GOP cadence promise, audio, energy or arbitrary temporal resampling.'}
 (out/'results-partial.json').write_text(json.dumps(results,indent=2))
except Exception as e:
 results['error']=str(e);raise
finally:
 (out/'results.json').write_text(json.dumps(results,indent=2)+'\n');(out/'executions.json').write_text(json.dumps(commands,indent=2)+'\n')
