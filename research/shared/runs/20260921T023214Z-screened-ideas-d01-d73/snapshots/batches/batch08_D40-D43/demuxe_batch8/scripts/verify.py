"""SPDX-License-Identifier: MIT. Checks evidence consistency, not universal correctness/performance."""
from common import *
checks=[]
def get(n):return json.loads((E/n).read_text())
def check(name,value,kind='candidate'):
 checks.append({'name':name,'passed':bool(value),'kind':kind})
m=get('multistream_component.json');bm=get('browser_multi.json')['decoding'];life=get('browser_multilife.json')
for name,v in m['variants'].items():
 check('D40 '+name+' host exact',v['host']['exact']);check('D40 '+name+' payload exact',v['component_payload_exact'])
 for ext in ['opus','webm']:
  r=bm['variants'][name+'.'+ext];check('D40 '+name+'.'+ext+' all channels exact',all(c['exact']for c in r['comparisons']))
 check('D40 '+name+' MSE lifecycle',life[name].get('ended') and not life[name].get('error') and all(abs(s['requested']-s['current'])<1e-6 for s in life[name]['seeks']))
 check('D40 '+name+' MSE audible',all(c['nonzero']>0 for c in life[name]['capture']))
for k,v in m['controls'].items():check('D40 rejects '+k,v['rejected'],'negative')
check('D40 wrong selected channels detected',not bm['wrongSelection']['exact'],'negative')
l=get('lacing_component.json');bl=get('browser_lacing.json')['decoding']['variants'];ll=get('browser_lacinglife.json')
for mode,v in l['variants'].items():
 for flag in ['packets_exact','head_exact','end_exact','host_source_exact','host_output_exact']:check('D41 '+mode+' '+flag,v[flag])
 for n in ['plain_'+mode+'.webm','stripped_'+mode+'.mka','recovered_'+mode+'.webm']:check('D41 '+n+' browser full PCM',all(c['exact']for c in bl[n]['comparisons']))
 check('D41 '+mode+' original MSE rejected',bool(ll['stripped_'+mode+'.mka'].get('error')),'negative')
 n='recovered_'+mode+'.webm';check('D41 '+mode+' recovered MSE lifecycle',ll[n].get('ended') and not ll[n].get('error'))
for k,v in l['controls'].items():check('D41 rejects '+k,v['rejected'],'negative')
check('D41 wrong per-lace restoration detected',not all(c['exact']for c in bl['wrong_restore.webm'].get('comparisons',[])),'negative')
check('D41 laced tail discrepancy retained',l['laced_tail_boundary']['missing_frames']==2376 and not l['laced_tail_boundary']['host_exact'],'boundary_observation')
p=get('laced_tail_packets.json')['packets'][-4:];check('D41 duplicate tail exposed at packet boundary',all(x.get('side_data_list',[{}])[0].get('discard_padding')==792 for x in p),'boundary_observation')
direct=get('browser_lacingdirect.json');check('D41 original already native-direct',direct['stripped_xiph.mka'].get('ended'),'scope')
c=get('chain_component.json');bc=get('browser_chain.json');cl=get('browser_chainlife.json')['original']
check('D42 exact source slicing',c['split_bytes_exact']);check('D42 three independent preskips preserved',[x['pre_skip']for x in c['links']]==[312,120,312]);check('D42 gains preserved',[x['gain_q8']for x in c['links']]==[0,768,-1536])
for k,v in c['controls'].items():check('D42 rejects '+k,v['rejected'],'negative')
for i,v in enumerate(bc['decoding']['split']):check('D42 link '+str(i)+' all channels exact',all(x['exact']for x in v['comparisons']))
check('D42 complete scheduled output exact',all(x['exact']for x in bc['schedule']['comparisons']))
check('D42 incorrect one-sample schedule detected',not all(x['exact']for x in bc['wrong_schedule']['comparisons']),'negative')
check('D42 monolithic browser output fails after first link',all(x['first']==50003 and not x['exact']for x in bc['decoding']['variants']['chained.opus']['comparisons']),'boundary_observation')
check('D42 monolithic host output also differs',not c['host_whole']['exact'],'boundary_observation')
check('D42 direct duration wrong and later seeks clamped',abs(cl['duration']-c['source_duration_seconds'])>1 and any(abs(s['requested']-s['current'])>.1 for s in cl['seeks']),'boundary_observation')
r=get('browser_resample.json')['results'];rf=get('browser_resample_followup.json')['results']
for k,v in {**r,**rf}.items():
 check('D43 '+k+' full repeat deterministic',v['wholeRepeat']['exact'],'reference')
 for name,g in v['guards'].items():check('D43 '+k+' rejects '+name,g['rejected'],'negative')
 if v['sr']==24000:
  check('D43 '+k+' aligned/halo output exact',v['variants']['phase_align32_halo128']['comparison']['exact'])
  check('D43 '+k+' naive output wrong',not v['variants']['naive']['comparison']['exact'],'negative')
 else:check('D43 '+k+' fractional exactness remains failed',not v['variants']['phase_align32_halo128']['comparison']['exact'],'boundary_observation')
result={'purpose':'Consistency checks include detection of known failures. Passing this file does not make every tested route valid.','checks':checks,'passed':sum(x['passed']for x in checks),'failed':sum(not x['passed']for x in checks),'scientific_outcomes':{'D40':'pursue restricted whole-component selection; not downmix','D41':'regression/composition follow-up; lacing normalization already exists; streaming tail not qualified','D42':'pursue per-link native decoding plus bounded scheduling; live integration untested','D43_24000_48000':'empirical exact component screen on three fixtures; version-specific boundary','D43_fractional_rates':'exactness failed; do not silently relax numerical contract'},'performance':'not measured'}
save('verification.json',result);print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2));sys.exit(0 if result['failed']==0 else 1)
