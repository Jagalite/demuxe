"""Post-run consistency assertions. Expected rejection is not a production success."""
from common import *
def load(n):return json.loads((E/n).read_text())
checks=[]
def ck(k,v):checks.append({'name':k,'passed':bool(v)})
def hashes(o):return [x.get('hash')for x in o.get('pictures',[])]
d=load('browser_descriptions.json');m=load('description_manifest.json');deq={}
ck('D44 all 60 coded packets preserved in authored source',m['packet_count']==60 and m['payloads_equal_reference'])
ck('D44 unknown descriptor guard',m['unknown_index_rejected'])
for name in ['original_mse','projected']:
 eq=[]
 for p in d[name]['pictures']:
  t=p['requested'];which='b'if 1<=t<2 else'a';ref=next(x for x in d['ref_'+which]['pictures']if abs(x['requested']-t%1)<1e-6)
  ok=p.get('hash')==ref['hash'] and abs(p.get('mediaTime',-99)-(int(t)+ref['mediaTime']))<1e-5 and p.get('width')==ref['width'] and p.get('height')==ref['height'];eq.append(ok)
 ck('D44 '+name+' 12 exact picture/timestamp witnesses',len(eq)==12 and all(eq));deq[name]=eq
 ck('D44 '+name+' duration/eof',d[name].get('ended') and d[name]['duration']==3)
ck('D44 original direct fails (not a pass)',bool(d['original_direct'].get('error')) and not d['original_direct'].get('ended'))
ck('D44 wrong first-description normalization fails',bool(d['wrong_first_entry'].get('error')))
for c in ['a','b']:ck('D44 native direct/MSE single-description controls agree '+c,hashes(d['ref_'+c])==hashes(d['ref_'+c+'_mse']))
rr=load('refresh_manifest.json');rb=load('browser_refresh.json')
ck('D45 uninterrupted native control reaches EOF',rb['full'].get('ended') and len(rb['full']['pictures'])==40)
for x in rr['host']:
 j=x['fragment'];bits=x['frame_equal_full'];ck(f'D45 host {j} eight incorrect then twelve correct frames',bits==[False]*8+[True]*12)
 info=rr['fragments'][j];ck(f'D45 recovery metadata {j}',info['recovery_messages']==[{'recovery_frame_cnt':8,'exact_match':1,'broken_link':0}] and 5 not in info['nal_types'] and 'K' in info['first_flags'])
 for typ in ['cold_','cold_safe_']:
  r=rb[typ+str(j)];ck('D45 '+typ+str(j)+' native candidate NOT qualified',r.get('buffered')==[] and bool(r.get('error')) and r.get('cleaned'))
cm=load('color_manifest.json');co=load('browser_colors.json');cr=load('browser_color_resolved.json');controls=load('color_authority_controls.json');c_summary={}
ck('D46 all 11 native-component decodes unchanged',len(set(x['decoded_native_components_sha256']for x in cm.values()))==1)
for name in ['color709','color601','colorfull']:
 ck('D46 coherent '+name+' direct/MSE agree',hashes(co[name+'_direct'])==hashes(co[name+'_mse']))
source_ref={'sps709_colr601':'color709','sps601_colr709':'color601','sps709_colrfull':'color709','spsfull_colr709':'colorfull'}
for conflict,actual in source_ref.items():
 q=cm['resolved_'+conflict];target=q['requested_reference'];c_summary[conflict]={'observed_bitstream_reference':actual,'explicit_requested_reference':target,'packet_and_timing_preserved':q['packet_and_timing_equal']}
 ck('D46 '+conflict+' packet/timing identity on resolution',q['packet_and_timing_equal'])
 for mode in ['direct','mse']:
  ck('D46 '+conflict+' ignores conflicting container '+mode,hashes(co[conflict+'_'+mode])==hashes(co[actual+'_'+mode]) and hashes(co[conflict+'_'+mode])!=hashes(co[target+'_'+mode]))
  ck('D46 '+conflict+' explicit-authority normalization '+mode,hashes(cr['resolved_'+conflict+'_'+mode])==hashes(co[target+'_'+mode]) and cr['resolved_'+conflict+'_'+mode].get('ended'))
ck('D46 absent authority rejected',controls['conflict_without_authority_rejected'])
vm=load('vorbis_manifest.json');vb=load('browser_vorbis.json')
ck('D47 actual short/long modes present',vm['block_histogram']=={'256':538,'2048':308} and vm['transitions']==82)
ck('D47 rebuilt whole-file host output exact',vm['rebuild_host']['exact'])
ck('D47 rebuilt whole-file browser output exact to own reference',all(x['exact']for x in vb['rebuilt']))
ck('D47 CRC-negative rejected',vm['crc_control_rejected'])
for i,(a,b)in enumerate(zip(vm['jobs'],vb['jobs'])):
 ck(f'D47 window {i} coded packets unchanged',a['payloads_exact'])
 ck(f'D47 window {i} host requested output exact',a['host']['exact'])
 ck(f'D47 window {i} browser requested output exact',all(x['exact']for x in b['selected']))
 ck(f'D47 window {i} omitted-preroll output rejected',not a['wrong_host']['exact'] and not any(x['exact']for x in b['wrong']))
 ck(f'D47 window {i} extra browser tail retained as failure',not any(x['exact']for x in b['whole_window']) and all(x['mismatches']==0 for x in b['whole_window']))
ck('D47 native offline scheduling all requested samples exact',vb['scheduled_frames']==20173 and all(x['exact']for x in vb['scheduled']))
summary={'D44':{'picture_witnesses':deq,'source_packets':m['packet_count'],'original_mse_normalization_bytes':0,'projection_needed_in_test':False},'D45':{'native_cold_decoding':'rejected_empty_buffer','software_warmup_incorrect_frames':8},'D46':c_summary,'D47':{'source_packets':vm['source_packets'],'selected_packets_per_job':[j['packets']for j in vm['jobs']],'requested_sample_frames':sum(j['frames']for j in vm['jobs']),'requested_scalar_samples':2*sum(j['frames']for j in vm['jobs']),'window_bytes':[j['compressed_bytes']for j in vm['jobs']],'returned_window_frames':[j['decodedFrames']for j in vb['jobs']],'extra_tail_frames':[j['whole_window'][0]['length_a']-j['whole_window'][0]['length_b']for j in vb['jobs']],'full_browser_returned_frames':vb['sourceFrames'],'authoritative_source_end':vm['source_frames'],'largest_candidate_pcm_bytes':max(j['decodedFrames']for j in vb['jobs'])*8,'full_browser_pcm_bytes':vb['sourceFrames']*8}}
save('analysis.json',summary);save('verification.json',{'passing':sum(c['passed']for c in checks),'failing':sum(not c['passed']for c in checks),'meaning':'Consistency assertions, including expected failures; NOT experiment/production/performance pass count.','checks':checks});print(json.dumps(summary,indent=2));print('assertions',len(checks),'failing',sum(not c['passed']for c in checks));assert all(c['passed']for c in checks)
