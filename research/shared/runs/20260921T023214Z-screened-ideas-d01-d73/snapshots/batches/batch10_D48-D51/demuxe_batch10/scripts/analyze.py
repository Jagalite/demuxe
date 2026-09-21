# SPDX-License-Identifier: MIT
from common import *
def read(n):return json.loads((E/n).read_text())
checks=[]
def ck(name,ok,detail=None):checks.append({'name':name,'passed':bool(ok),'detail':detail})
m=read('mp3_manifest.json');bm=read('browser_mp3.json');mf=read('mp3_followup.json');crop=read('browser_crop.json');clock=read('browser_clock.json');cm=read('clock_manifest.json');rb=read('browser_rebase.json');xf=read('browser_crossfade.json')
ck('all_mp3_window_compressed_frames_preserved',all(j['packet_hashes_match'] for j in m['jobs']))
ck('host_no_preroll_controls_differ',all(j['host_differences']>0 for j in m['jobs']if j['tag']=='none'))
ck('host_reservoir_only_controls_differ',all(j['host_differences']>0 for j in m['jobs']if j['tag']=='reservoir_bytes'))
ck('host_plus1_or_more_matches',all(j['host_differences']==0 for j in m['jobs']if j['tag'].startswith('plus')))
ck('browser_strict_window_candidate_rejection_retained',all(any(c['differences']>0 for c in j['comparisons']) for j in bm['jobs']))
ck('identical_full_browser_decode_repeat_exact',all(c['differences']==0 for c in mf['full_repeat']))
ck('identical_window_browser_decode_repeat_exact',all(c['differences']==0 for j in mf['window_repeat'] for c in j['comparisons']))
ck('same_decoder_full_prefix_controls_exact',all(c['differences']==0 for j in mf['prefix'] for c in j['comparisons']))
ck('host_fixed_decoder_one_integer_step_difference',all(j['max_integer_error']==1 and j['differences']>0 for j in mf['host_fixed_decoder']))
ck('mp3_malformed_inputs_reject',all(v!='accepted'for v in m['negative_controls'].values()))
for j in crop['cases']:
 tag=f"DPR{j['dpr']}_time{j['time']}_rect{j['crop']}"
 ck('crop_matched_frame_'+tag,j['source_frame_hash']==j['candidate_full_frame_hash'] and j['requested_media_time']==j['candidate_media_time'])
 ck('crop_pointer_map_'+tag,j['click_source_coordinates']==j['expected_click'])
ck('one_to_one_crop_exact',all(j['differences']==0 for j in crop['cases']if j['dpr']==1))
ck('tested_even_DPR2_crops_exact',all(j['differences']==0 for j in crop['cases']if j['dpr']==2 and j['crop']!=[23,7,115,83]))
ck('odd_DPR2_exactness_failure_retained',all(j['differences']>0 and j['max_error']==1 for j in crop['cases']if j['dpr']==2 and j['crop']==[23,7,115,83]))
ck('wrong_crop_origin_detected',all(j['differences']>1000 for j in crop['negative_wrong_origin']))
ck('invalid_crop_rectangles_rejected',all(q['rejected'] for j in crop['guard_controls'] for q in j['cases']))
ck('crop_route_identity_EOF_cleanup',all(j['ended'] and j['sameUrl'] and j['loads']==1 and j['cleaned'] for j in crop['lifecycle']))
base=clock['base'];sig=lambda p:(p.get('mediaTime'),p.get('hash'),p.get('width'),p.get('height'))
ck('normal_timestampOffset_route_matches', [sig(x)for x in clock['offset_'+cm['origins'][0]['origin']]['pictures']]==[sig(x)for x in base['pictures']])
for j in cm['origins']:
 k='integer_'+j['origin'];ck('integer_rebase_route_exact_'+j['origin'],clock[k].get('ended') and clock[k]['duration']==base['duration'] and [sig(x)for x in clock[k]['pictures']]==[sig(x)for x in base['pictures']])
ck('exact_rebase_restores_all_python_fragments',all(q['exact_bytes_restored']and q['payload_unchanged']for j in cm['origins']for q in j['deltas']))
ck('exact_rebase_restores_all_javascript_fragments',all(j['exact']for j in rb['positive']))
ck('integer_transform_guards_reject',all(j['rejected']for j in rb['negative']))
ck('extreme_native_offset_rejection_retained',bool(clock['offset_'+cm['origins'][-1]['origin']].get('error')))
ck('rounded_clock_timing_error_detected',clock['rounded_'+cm['origins'][-1]['origin']]['duration']!=3 and all(x['hash']==y['hash']for x,y in zip(clock['rounded_'+cm['origins'][-1]['origin']]['pictures'],base['pictures'])))
ck('moderate_large_offset_microsecond_drift_detected',clock['offset_'+cm['origins'][1]['origin']]['duration']!=3)
for j in xf['results']:
 cs=j['comparisons'];name=f"crossfade_{j['fade']}_{j['variant']}"
 if j['variant']=='native':ck(name,all(c['pre']['differences']==0 and c['post']['differences']==0 and c['exceeds_2e_7']==0 for c in cs))
 else:ck(name+'_negative_detected',any(c['exceeds_2e_7']>0 for c in cs))
summary={
'D48':{'decision':'stop_strict_browser_window_profile','host_exact_requests':4,'requested_scalar_values_per_policy':4*4093*2,'window_counts':len(bm['jobs']),'browser_exact_windows':0,'browser_warmup_max_abs_error':max(c['max_error']for j in bm['jobs']if j['tag'].startswith('plus')for c in j['comparisons']),'full_frames':bm['full_frames'],'source_packets':m['source_frames'],'plus1_window_packets':[j['stop_frame']-j['start_frame']for j in m['jobs']if j['tag']=='plus1']},
'D49':{'decision':'pursue_display_only_qualified_profile','exact_cases':sum(j['differences']==0 for j in crop['cases']),'cases':len(crop['cases']),'DPR1_exact':sum(j['differences']==0 for j in crop['cases']if j['dpr']==1),'DPR2_exact':sum(j['differences']==0 for j in crop['cases']if j['dpr']==2),'remaining_max_abs_component_error':max(j['max_error']for j in crop['cases']),'remaining_differing_components':sum(j['differences']for j in crop['cases'])},
'D50':{'decision':'pursue_precision_guard_not_default_normalizer','browser_transformed_fragments_exact':len(rb['positive']),'normal_offset_seconds':-cm['origins'][0]['offset'],'high_origin':cm['origins'][-1]['origin'],'rounded_error_ticks': [j['error_ticks']for j in cm['origins'][-1]['deltas']],'rounded_duration':clock['rounded_'+cm['origins'][-1]['origin']]['duration'],'transform_scope':'video-only one-traf version1 tfdt; source bound origin and digest'},
'D51':{'decision':'pursue_declared_tolerance_native_graph','tested_lengths':[j['fade']for j in xf['results']if j['variant']=='native'],'total_tested_scalar_values':sum(j['N']*2 for j in xf['results']if j['variant']=='native'),'max_abs_error':max(c['all']['max_error']for j in xf['results']if j['variant']=='native'for c in j['comparisons']),'tolerance':2e-7,'input_pcm_bytes':xf['results'][0]['input_pcm_bytes']},
'checks':{'total':len(checks),'passed':sum(j['passed']for j in checks),'failed':sum(not j['passed']for j in checks)},
'qualification':'Consistency-check passes include confirming candidate failures. Not performance, production, hardware or universal correctness qualification.'}
save('analysis.json',summary);save('verification.json',{'checks':checks,**summary['checks']});print(json.dumps(summary,indent=2))
if summary['checks']['failed']:sys.exit(1)
