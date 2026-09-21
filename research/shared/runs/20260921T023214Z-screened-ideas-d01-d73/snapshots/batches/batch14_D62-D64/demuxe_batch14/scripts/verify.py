# SPDX-License-Identifier: MIT
from common import *
import numpy as np
checks=[]
def check(name,ok):checks.append({'name':name,'passed':bool(ok)})
manifest=json.loads((E/'audio_manifest.json').read_text());pgs=json.loads((E/'pgs_manifest.json').read_text());bp=json.loads((E/'browser_pgs.json').read_text());audio={}
for stage in ['first','rest','join','live','controls']:audio.update(json.loads((E/f'browser_audio_{stage}.json').read_text()))
results={}
for name,v in audio.items():
 check(name+' completed and cleaned',v.get('ended') and v.get('cleaned') and v.get('retainedSourceBuffer') and not v.get('error'))
 expected='joined' if name.startswith('joined') else 'a' if name=='full_a' else name.split('_')[0]
 x=np.fromfile(F/(expected+'.f32'),'<f4').reshape(-1,2);y=np.fromfile(E/v['capture_file'],'<f4').reshape(-1,2)
 if np.any(np.all(x==0,axis=1)):raise AssertionError('Fixture lost nonzero-frame witness')
 ix=np.flatnonzero(np.any(y!=0,axis=1))
 if len(ix):
  a=int(ix[0]);b=int(ix[-1]+1);z=y[a:a+len(x)];d=abs(z-x) if len(z)==len(x) else None
  r={'aligned_start_frame':a,'observed_signal_frames':b-a,'expected_frames':len(x),'different_values':int(np.count_nonzero(d)) if d is not None else None,'max_abs':float(d.max()) if d is not None else None,'first_bad_frames':np.flatnonzero(np.any(d,axis=1))[:12].tolist() if d is not None else [],'all_requested_values_equal':bool(d is not None and not np.any(d)),'exact_length':b-a==len(x),'internal_zero_frames':int(np.count_nonzero(np.all(y[a:b]==0,axis=1))),'aligned_output_sha256':sha(y[a:b].tobytes()),'prefix_matches_before_join':bool(np.array_equal(z[:30001],x[:30001])) if name.startswith('joined') else None,'suffix_matches_after_join':bool(np.array_equal(z[55007:],x[55007:])) if name.startswith('joined') else None}
 else:r={'all_requested_values_equal':False,'exact_length':False,'error':'no signal'}
 r['exact']=r['all_requested_values_equal'] and r['exact_length'];results[name]=r
 bad=('wrong' in name or 'extra_tail' in name)
 check(name+' expected fidelity verdict',not r['exact'] if bad else r['exact'])
 if not bad:check(name+' no inserted zero frames',r['internal_zero_frames']==0)
check('one-sample wrong clip changes all requested values',results['clip0_wrong']['different_values']==94072)
check('extra tail detected despite correct requested prefix',results['clip2_extra_tail']['all_requested_values_equal'] and results['clip2_extra_tail']['observed_signal_frames']==129)
check('wrong join leaves first and last interval intact',results['joined_wrong_boundary']['prefix_matches_before_join'] and results['joined_wrong_boundary']['suffix_matches_after_join'] and not results['joined_wrong_boundary']['exact'])
check('live append begins before first end and after source starts',0<audio['joined_live']['startedBeforeRemainingAppend']['time']<30001/48000)
for n,v in manifest['sources'].items():check(n+' source payload preservation verified',v['packet_payloads_preserved'])
for i,e in enumerate(pgs['events']):check('PGS independent straight RGBA event '+str(i),e['straight_rgba_exact'])
for n,c in pgs['controls'].items():check('PGS rejects '+n,c['rejected'])
check('PGS cold second epoch matches warm source',pgs['cold_epoch_seek_exact'])
check('PGS exactly three complete object decodes',pgs['decoded_objects']==3)
check('PGS compressed index reused across palette updates',pgs['events'][0]['draws'][0]['idat_hash']==pgs['events'][1]['draws'][0]['idat_hash'] and pgs['events'][0]['draws'][0]['file']!=pgs['events'][1]['draws'][0]['file'])
check('PGS epoch object identity changes despite reused id/version',pgs['events'][0]['draws'][0]['id']==pgs['events'][4]['draws'][0]['id'] and pgs['events'][0]['draws'][0]['version']==pgs['events'][4]['draws'][0]['version'] and pgs['events'][0]['draws'][0]['object_identity']!=pgs['events'][4]['draws'][0]['object_identity'])
for mode,o in bp.items():
 check('PGS '+mode+' lifecycle',o.get('ended') and o.get('cleaned') and o.get('videoSourceUnchanged') and o['created']==o['closed'])
 if mode=='correct':
  for i,q in enumerate(o['checks']):check('PGS correct native composition '+str(i),q['exact'])
 else:check('PGS '+mode+' wrong output detected',any(not q['exact'] for q in o['checks']))
check('PGS five native image assets shared across seeks',bp['correct']['created']==5)
summary={'D62':{'display_sets':len(pgs['events']),'source_bytes':pgs['source_bytes'],'object_decodes':pgs['decoded_objects'],'native_images':bp['correct']['created'],'correct_picture_checks':sum(q['exact'] for q in bp['correct']['checks']),'negative_mismatch_counts':{k:sum(not q['exact'] for q in v['checks']) for k,v in bp.items() if k!='correct'},'boundary':'PGS straight subtitle RGBA plus same-browser overlay, not YUV burn-in equivalence'},'D63':{'clips':[results[f'clip{i}_window'] for i in range(3)],'total_requested_scalar_values':sum(results[f'clip{i}_window']['expected_frames']*2 for i in range(3)),'extra_tail_control':results['clip2_extra_tail']},'D64':{'prebuffered':results['joined_window'],'same_init':results['joined_no_init'],'live':results['joined_live'],'wrong_boundary':results['joined_wrong_boundary'],'live_append_record':audio['joined_live']['startedBeforeRemainingAppend']},'audio_results':results,'no_performance_measurement':True,'capture_alignment':'Only one global leading capture-silence offset removed. No per-interval resync, sample deletion, or tail repair. All expected fixture frames contain a nonzero value; output length checked independently.'}
save('analysis.json',summary);save('verification.json',{'passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks})
print(sum(c['passed'] for c in checks),'/',len(checks),'checks')
for c in checks:
 if not c['passed']:print('FAILED',c['name'])
assert all(c['passed'] for c in checks)
