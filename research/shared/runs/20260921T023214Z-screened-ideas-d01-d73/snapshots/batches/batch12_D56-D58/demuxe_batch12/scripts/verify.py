# SPDX-License-Identifier: MIT
"""Compare recorded observations. Passing a negative check is not a route pass."""
from pathlib import Path
import json,math
R=Path(__file__).resolve().parents[1];E=R/'evidence'
def read(n):return json.loads((E/n).read_text())
checks=[]
def check(k,truth,detail=None):checks.append({'check':k,'passed':bool(truth),'detail':detail})
v=read('video_manifest.json');b=read('browser_video.json');live=read('browser_continuous.json')
for name in ['repeat','recall','hold']:
 for decoder in ['vp9','libvpx-vp9']:check(f'video.{name}.{decoder}.host_expected',v['host'][name][decoder]['exact'])
for mode in ['direct','mse']:
 ref=b['repeat_'+mode]
 for name in ['repeat','recall','hold']:
  q=b[name+'_'+mode]
  check(f'video.{name}.{mode}.lifecycle',q.get('ended') and q['cleaned'] and q['duration']==3 and 'error' not in q)
  check(f'video.{name}.{mode}.all_12_requested_pictures',len(q['pictures'])==12 and all(x['hash']==y['hash'] and x['w']==y['w'] and x['h']==y['h'] for x,y in zip(q['pictures'],ref['pictures'])))
  if name!='hold':check(f'video.{name}.{mode}.20Hz_samples_timestamp_witness',all(x['mediaTime']==y['mediaTime'] for x,y in zip(q['pictures'],ref['pictures'])))
  else:check(f'video.hold.{mode}.different_intended_frame_cadence',all(x['mediaTime']==math.floor(x['requested']) for x in q['pictures']))
 check('video.stale.'+mode+'.wrong_output_detected',sum(x['hash']!=y['hash'] for x,y in zip(b['stale_'+mode]['pictures'],ref['pictures']))==7)
check('video.cold.mse.rejected_initial_recall',b['cold_mse'].get('buffered')==[[1,3]] and 'error' in b['cold_mse'])
check('video.cold.direct.EOF_does_not_prove_correctness',b['cold_direct'].get('ended') and b['cold_direct']['pictures'][0]['mediaTime']==1)
check('video.keyframe_guard',all(v['keyframe_guard_negatives']))
hs=[b['repeat_mse']['pictures'][i]['hash'] for i in [0,4,7]]
for name in ['repeat','recall','hold']:
 q=live[name];check('video.continuous.'+name,q.get('ended') and all(x['hash']==hs[min(2,int(x['time']))] for x in q['observed']))
check('video.stale.continuous.wrong_pictures_detected',sum(x['hash']!=hs[min(2,int(x['time']))] for x in live['stale']['observed'])==40)
check('video.hold_is_smaller_and_fewer_samples',v['variants']['hold']['bytes']<v['variants']['recall']['bytes']<v['variants']['repeat']['bytes'] and v['variants']['hold']['records']==3)
s=read('sparse_manifest.json');bs=read('browser_sparse.json');q=bs['result']
check('wavl.corrected_fact_present',all(s['guards'].values()) and s['source_bytes']==12328)
check('wavl.host_rejects_original',s['host_sparse']['returncode']!=0)
check('wavl.browser_rejects_original','error' in q['decode']['sparse.wav'] and 'error' in bs['sparse.wav'])
check('wavl.dense_float_reference_exact',all(x['different']==0 for x in q['decode']['dense_float.wav']['comparison']))
check('wavl.native_dense_S16_is_different_contract',sum(x['different'] for x in q['decode']['dense.wav']['comparison'])>0)
for i,x in enumerate(q['renders']):
 check(f'wavl.render.{i}.{x["mode"]}',all(y['different']==0 for y in x['comparison']) if x['mode']=='correct' else all(y['different']>0 for y in x['comparison']))
check('wavl.two_hold_only_windows_no_input_AudioBuffer',sum(x['mode']=='correct' and x['bufferBytes']==0 for x in q['renders'])==2)
check('wavl.runtime_negative_guards',all(q['negativeGuards']))
check('wavl.parser_author_oracle',s['parser_matches_author_reference'])
ii=read('iir_manifest.json');bi=read('browser_iir.json')['result'];t=ii['total_tolerance']
for c in bi['cases']:
 key=f'iir.{c["name"]}.{c["r"]}'
 check(key+'.continuous_reference',max(x['max'] for x in c['fullReference'])<=t)
 for mode in ['bounded','no-history','short-history']:
  jobs=[x for x in c['jobs'] if x['mode']==mode]
  if mode=='bounded':good=all(max(z['max'] for z in x['vsFull']+x['vsIndependent'])<=t for x in jobs)
  else:good=all(max(z['max'] for z in x['vsIndependent'])>t for x in jobs if x['start']>0)
  check(key+'.'+mode,good)
check('iir.coefficient_error_history_caps',all(bi['guards']))
analysis={
 'items':{'D56':{'status':'conditional_capability; stop default recall-for-hold variant','host_frames_exact_per_decoder':60,'browser_seek_checks_per_route':12,'recall_bytes':v['variants']['recall']['bytes'],'dense_repeat_bytes':v['variants']['repeat']['bytes'],'hold_bytes':v['variants']['hold']['bytes'],'live_observed':{n:len(live[n]['observed']) for n in ['repeat','recall','hold']},'no_measured_decode_CPU_gain':True},
 'D57':{'status':'pursue restricted symbolic scheduling','source_bytes':s['source_bytes'],'reference_frames':s['reference_frames'],'full_scalar_values_exact':s['scalar_samples'],'all_positive_scalar_values':sum((x['end']-x['start'])*2 for x in q['renders'] if x['mode']=='correct'),'full_render_input_sample_bytes':q['renders'][0]['bufferBytes'],'dense_equivalent_sample_bytes':s['reference_frames']*8,'native_S16_reference_not_equivalent':True},
 'D58':{'status':'pursue native fixed-coefficient bounded-error preview; not arithmetic certification','positive_jobs':sum(x['mode']=='bounded' for c in bi['cases'] for x in c['jobs']),'requested_values':sum((x['end']-x['start'])*2 for c in bi['cases'] for x in c['jobs'] if x['mode']=='bounded'),'max_observed_error':max(z['max'] for c in bi['cases'] for x in c['jobs'] if x['mode']=='bounded' for z in x['vsIndependent']),'tolerance':t,'preroll_by_r':{str(c['r']):c['P'] for c in bi['cases']},'max_job_input_frames':max(x['inputFrames'] for c in bi['cases'] for x in c['jobs'] if x['mode']=='bounded')}},
 'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'production_performance_measured':False,'checks_are_not_experiments':True}
(E/'verification.json').write_text(json.dumps({'summary':analysis,'checks':checks},indent=2));(E/'analysis.json').write_text(json.dumps(analysis,indent=2))
print(json.dumps(analysis,indent=2))
if analysis['failed']:raise SystemExit('Consistency checks failed')
