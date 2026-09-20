# SPDX-License-Identifier: Apache-2.0
"""Full-stream oracle, adverse controls and whole-job cost for R120/R134."""
import pathlib,sys,subprocess,os,time,json,hashlib,statistics,shutil
OUT=pathlib.Path(sys.argv[1]).resolve();BIN=pathlib.Path(sys.argv[2]).resolve();OUT.mkdir(exist_ok=True,parents=True);logs=[];results={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(cmd,env=None,good=True):
 t=time.perf_counter();p=subprocess.run([str(x) for x in cmd],capture_output=True,text=True,env=dict(os.environ,**(env or {})));ms=(time.perf_counter()-t)*1000
 logs.append({'command':[str(x) for x in cmd],'env':env or {},'exit':p.returncode,'wall_ms':ms,'stdout':p.stdout,'stderr':p.stderr})
 if good and p.returncode:
  (OUT/'commands-results.json').write_text(json.dumps(logs,indent=2));raise RuntimeError(p.stderr)
 return p,ms
def ff(args):return ['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',*args]
def decode(src,dst):return run(ff(['-i',src,'-pix_fmt','yuv420p','-f','rawvideo',dst]))
def trans(src,dst,env=None,mode=None,good=True):return run([BIN,src,dst,*([mode]if mode else[])],env,good)
fixtures=[('motion-small','testsrc2=size=96x64:rate=10',12,24),('motion-mid','testsrc2=size=192x128:rate=12',24,18),('motion-coarse','testsrc2=size=160x96:rate=12',24,36),('static','smptebars=size=128x96:rate=12',18,24)]
checks=[]
for name,filter_,frames,qp in fixtures:
 f=OUT/name;f.mkdir(exist_ok=True);source=f/'input.h264';out=f/'translated.h264';cp=f/'sidecars';env={'DEMUXE_CP_DIR':str(cp)}
 run(ff(['-f','lavfi','-i',filter_,'-frames:v',frames,'-c:v','libx264','-profile:v','main','-qp',qp,'-x264-params','cabac=1:bframes=0:ref=1:8x8dct=0:partitions=none:weightp=0:keyint=12:scenecut=0','-f','h264',source]))
 p,_=trans(source,out);decode(source,f/'reference.yuv');decode(out,f/'translated.yuv');exact=sha(f/'reference.yuv')==sha(f/'translated.yuv');assert exact,(name,'decode mismatch')
 sig0,_=trans(source,'unused',mode='signature');sig1,_=trans(out,'unused',mode='signature');assert sig0.stdout==sig1.stdout,(name,'syntax mismatch',sig0.stdout,sig1.stdout)
 trans(source,f/'captured.h264',{**env,'DEMUXE_CP_MODE':'capture'});restored,_=trans(source,f/'restored.h264',{**env,'DEMUXE_CP_MODE':'restore'});assert out.read_bytes()==(f/'restored.h264').read_bytes()
 decode(f/'restored.h264',f/'restored.yuv');assert sha(f/'restored.yuv')==sha(f/'reference.yuv')
 cps=list(cp.glob('*.json'));assert 0<len(cps)<=frames;assert restored.stderr.count('RESTORE source=')==frames
 sizes=[p.stat().st_size for p in cps];prefixes=[json.loads(json.loads(p.read_text())['payload'])['arithmetic'][4]for p in cps]
 checks.append({'fixture':name,'frames':frames,'input_bytes':source.stat().st_size,'output_bytes':out.stat().st_size,'translation':p.stdout,'pictures_exact':exact,'syntax_sha256':sig0.stdout.strip(),'decoded_sha256':sha(f/'reference.yuv'),'full_slice_restore_events':frames,'unique_full_slice_checkpoints':len(cps),'checkpoint_bytes':sum(sizes),'prefix_bins_skipped':sum(prefixes),'restored_stream_byte_exact':True,'restored_decoded_pictures_exact':True})
 results['correctness']=checks;(OUT/'results.json').write_text(json.dumps(results,indent=2))
# Adverse outputs: independent oracle sees changed quantized coefficient.
f=OUT/'motion-small';trans(f/'input.h264',f/'wrong-coefficient.h264',mode='corrupt');decode(f/'wrong-coefficient.h264',f/'wrong-coefficient.yuv');assert sha(f/'reference.yuv')!=sha(f/'wrong-coefficient.yuv')
controls={'coefficient_change_detected':True}
env={'DEMUXE_CP_DIR':str(f/'sidecars'),'DEMUXE_CP_MODE':'restore','DEMUXE_CP_OMIT_NEIGHBORS':'1'}
p,_=trans(f/'input.h264',f/'omitted-neighbors.h264',env,good=False)
controls['omitted_neighbors_exit']=p.returncode
if p.returncode==0:
 decode(f/'omitted-neighbors.h264',f/'omitted-neighbors.yuv');assert sha(f/'reference.yuv')!=sha(f/'omitted-neighbors.yuv');controls['omitted_neighbors_wrong_picture']=True
# Record corruption and foreign source map (no saved record may be rewritten).
bad=OUT/'corrupt-sidecars';shutil.copytree(f/'sidecars',bad,dirs_exist_ok=True);q=next(bad.glob('*.json'));v=json.loads(q.read_text());v['payload']=v['payload'].replace('"version":1','"version":2',1);q.write_text(json.dumps(v))
p,_=trans(f/'input.h264',f/'corrupt-record.h264',{'DEMUXE_CP_DIR':str(bad),'DEMUXE_CP_MODE':'restore'},good=False);assert p.returncode!=0;controls['corrupt_record_rejected']=True
p,_=trans(OUT/'motion-mid/input.h264',f/'wrong-source.h264',{'DEMUXE_CP_DIR':str(f/'sidecars'),'DEMUXE_CP_MODE':'restore'},good=False);assert p.returncode!=0;controls['wrong_source_rejected']=True
# Unsupported B stream must fail closed without publishing an output.
run(ff(['-f','lavfi','-i','testsrc2=size=96x64:rate=10','-frames:v',12,'-c:v','libx264','-x264-params','cabac=1:bframes=2:8x8dct=0:partitions=none:weightp=0','-f','h264',OUT/'unsupported.h264']))
p,_=trans(OUT/'unsupported.h264',OUT/'unsupported-output.h264',good=False);assert p.returncode!=0 and not(OUT/'unsupported-output.h264').exists();controls['unsupported_rejected_without_output']=True
# Cancellation while capturing, subsequent clean run recovers. Final records use atomic rename.
cancel=OUT/'cancel-sidecars';cancel.mkdir(exist_ok=True);proc=subprocess.Popen([str(BIN),str(OUT/'motion-mid/input.h264'),str(OUT/'cancel-output.h264')],env=dict(os.environ,DEMUXE_CP_DIR=str(cancel),DEMUXE_CP_MODE='capture'),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
time.sleep(.005)
if proc.poll() is None:proc.terminate()
stdout,stderr=proc.communicate();valid=0
for q in cancel.glob('*.json'):
 v=json.loads(q.read_text());assert hashlib.sha256(v['payload'].encode()).hexdigest()==v['sha256'];valid+=1
trans(OUT/'motion-mid/input.h264',OUT/'after-cancel.h264',{'DEMUXE_CP_DIR':str(cancel),'DEMUXE_CP_MODE':'capture'});trans(OUT/'motion-mid/input.h264',OUT/'after-cancel-restored.h264',{'DEMUXE_CP_DIR':str(cancel),'DEMUXE_CP_MODE':'restore'});assert sha(OUT/'after-cancel-restored.h264')==sha(OUT/'motion-mid/translated.h264')
controls['cancellation']={'exit':proc.returncode,'complete_records_preserved':valid,'restart_exact':True,'stdout':stdout.decode(),'stderr':stderr.decode()};results['controls']=controls
(OUT/'results.json').write_text(json.dumps(results,indent=2))
# Exact full decode/reencode CAVLC comparison, including output verification.
f=OUT/'motion-mid';source=f/'input.h264'
baseline_args=ff(['-i',source,'-c:v','libx264','-preset','ultrafast','-qp',0,'-x264-params','cabac=0:bframes=0:8x8dct=0','-f','h264',OUT/'lossless-baseline.h264'])
run(baseline_args);decode(OUT/'lossless-baseline.h264',OUT/'lossless-baseline.yuv');assert sha(OUT/'lossless-baseline.yuv')==sha(f/'reference.yuv')
performance=[]
for i in range(8):
 costs={}
 for which in (['baseline','candidate'] if i%2==0 else ['candidate','baseline']):
  t=time.perf_counter()
  if which=='baseline':run(baseline_args);decode(OUT/'lossless-baseline.h264',OUT/'bench-decoded.yuv')
  else:trans(source,OUT/'bench-translated.h264');decode(OUT/'bench-translated.h264',OUT/'bench-decoded.yuv')
  costs[which+'_ms']=(time.perf_counter()-t)*1000
  assert sha(OUT/'bench-decoded.yuv')==sha(f/'reference.yuv')
 performance.append(costs)
results['R120_performance']={'pairs':performance,'median_ratio':statistics.median(x['candidate_ms']/x['baseline_ms'] for x in performance),'baseline_bytes':(OUT/'lossless-baseline.h264').stat().st_size,'candidate_bytes':(f/'translated.h264').stat().st_size,'threshold_ratio':.9,'scope':'Complete entropy conversion plus independent decode versus exact-picture lossless decode/reencode plus independent decode; process launch and output writes included.'}
cpperf=[]
for i in range(8):
 costs={}
 for which in (['baseline','candidate'] if i%2==0 else ['candidate','baseline']):
  t=time.perf_counter()
  for j in range(5):
   env={} if which=='baseline' else {'DEMUXE_CP_DIR':str(OUT/'bench-sidecars'),'DEMUXE_CP_MODE':'capture' if j==0 else 'restore'}
   trans(source,OUT/'bench-translated.h264',env);decode(OUT/'bench-translated.h264',OUT/'bench-decoded.yuv')
  costs[which+'_ms']=(time.perf_counter()-t)*1000
  assert sha(OUT/'bench-decoded.yuv')==sha(f/'reference.yuv')
 cpperf.append(costs)
results['R134_performance']={'pairs':cpperf,'median_ratio':statistics.median(x['candidate_ms']/x['baseline_ms'] for x in cpperf),'threshold_ratio':.9,'scope':'Five complete translated reconstructions; candidate includes initial capture/preparation, serialization, source/prefix retention and four fresh-process restores. Baseline five uninterrupted complete translated reconstructions.'}
results['environment']={'ffmpeg':run(['ffmpeg','-version'])[0].stdout,'rustc':run(['rustc','--version'])[0].stdout,'binary_sha256':sha(BIN),'upstream':'552f9883f6dc5bbdf69441063e65e9cb27af614b'}
(OUT/'results.json').write_text(json.dumps(results,indent=2));(OUT/'commands-results.json').write_text(json.dumps(logs,indent=2));print(json.dumps(results,indent=2))
