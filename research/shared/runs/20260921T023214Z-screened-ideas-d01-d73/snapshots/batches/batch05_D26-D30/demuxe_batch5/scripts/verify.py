"""Post-run consistency checks. These are not passed performance/production gates."""
from common import *
import numpy as np
checks=[]
def load(n):return json.loads((E/n).read_text())
def check(name,ok,detail=None):checks.append({'name':name,'passed':bool(ok),'detail':detail})
component=load('component_initial.json');host=load('host_checks.json');first=load('browser_first.json');op=first['opus'];stream=load('browser_opusstream.json');mono=load('browser_monostream.json')['mono']
for name in ['dual','left','right']:
 c=component['D26'][name]
 check('D26:'+name+':host_exact',c['host_mismatches']==0 and c['host_frames']==102576)
 check('D26:'+name+':media_pages_preserved',c['media_pages_unchanged'])
 check('D26:'+name+':Ogg_browser_exact',op[name].get('mismatches')==[0,0] and op[name]['frames']==102576)
 check('D26:'+name+':WebM_browser_exact',stream['whole_webm'][name].get('mismatches')==[0,0] and stream['whole_webm'][name]['frames']==102576)
 for ext in ['opus','webm']:check('D26:'+name+':'+ext+':packets',host['D26'][name+'.'+ext]['payloads_unchanged'] and host['D26'][name+'.'+ext]['packet_count']==108)
 s=stream[name];check('D26:'+name+':MSE_EOF_seek',s.get('ended') and s.get('seeks')==[.51,1.51])
 valid={'dual':s['differentChannels']==0 and s['nonzero'][0]>1000,'left':s['nonzero'][0]>1000 and s['nonzero'][1]==0,'right':s['nonzero'][1]>1000 and s['nonzero'][0]==0}[name]
 check('D26:'+name+':MSE_mapping',valid)
 check('D26:'+name+':MSE_duration_not_changed_by_mapping',s['duration']==mono['duration'])
for k in ['invalid_mapping','truncated','corrupt_page']:check('D26:guard:'+k,component['D26'][k]['rejected'])
check('D26:wrong_side_control',stream['right']['nonzero'][0]==0 and stream['right']['nonzero'][1]>1000)
check('D26:streaming_tail_not_exact',abs(mono['duration']-102576/48000)>.001,{'MSE_duration':mono['duration'],'exact_decoded_duration':102576/48000})

extra=load('opus_additional_oracle.json')
for name in ['dual','left','right']:
 check('D26:'+name+':explicit_libopus_oracle',extra[name]['libopus_mismatches']==0 and extra[name]['libopus_frames']==102576)
# D27, consistent-duration reference comparisons.
epochs=load('browser_epochs.json');same=load('browser_sameaspect.json');boundary=load('browser_boundary.json')
def compare_seeks(result,refs):
 out=[]
 for pic in result['pictures']:
  i=min(2,int(pic['time']//1.5));local=round(pic['time']-1.5*i,6);r=next((p for p in refs[i]['pictures'] if abs(p['time']-local)<1e-6),None)
  out.append(r is not None and r['size']==pic['size'] and r['hash']==pic['hash'])
 return out
refs=[first['epoch'+str(i)+'.mp4:False'] for i in range(3)]
check('D27:fresh_init_six_seek_oracles',all(compare_seeks(epochs['fresh_inits'],refs)) and len(epochs['fresh_inits']['pictures'])==6)
check('D27:changed_aspect_no_init_not_fidelity_pass',not all(compare_seeks(epochs['one_init'],refs)),{'actual_middle_size':epochs['one_init']['pictures'][1]['size'],'expected':[192,112]})
check('D27:missing_inband_header_negative','error' in epochs['missing_headers'])
check('D27:three_independent_host_interval_decodes',host['D27']['source_frames']==90 and host['D27']['constructed_frames']==90 and all(x['exact'] for x in host['D27']['frames']))
samerefs=[refs[0],same['reference'],refs[2]]
for k in ['one_init','fresh_inits']:
 check('D27:same_aspect:'+k+':seeks',all(compare_seeks(same[k],samerefs)) and same[k].get('ended'))
 check('D27:same_aspect:'+k+':SourceBuffer_retained',same[k]['sourceBuffers']==1)
def compare_observed(x):
 a={round(p['time'],6):p for p in x['one_init']['observed']};b={round(p['time'],6):p for p in x['fresh_inits']['observed']};keys=sorted(a.keys()&b.keys());return {'common_frames':len(keys),'mismatches':[{'time':t,'one_init_size':a[t]['size'],'fresh_init_size':b[t]['size']} for t in keys if a[t]['size']!=b[t]['size'] or a[t]['hash']!=b[t]['hash']]}
observed={'changed_aspect':compare_observed(epochs),'same_aspect_first':compare_observed(same),'same_aspect_instrumented_repeat':compare_observed(boundary)}
save('transition_observations.json',observed)
# Do not assert a transient observation must reproduce. Record both; no seamless gate pass.

recovery=load('browser_recovery.json')
for location in ['header','payload']:
 ref=recovery['baseline:'+location]
 for v in ['abort_retry','abort_guarded']:
  row=recovery[v+':'+location];check('D28:'+v+':'+location+':pictures_EOF',row.get('ended') and [(x['time'],x['hash']) for x in row['pictures']]==[(x['time'],x['hash']) for x in ref['pictures']] and len(row['pictures'])==4)
  check('D28:'+v+':'+location+':one_buffer',row.get('sourceBuffers')==1)
 for v in ['no_abort','abort_stale']:check('D28:'+v+':'+location+':negative','error' in recovery[v+':'+location])
 check('D28:stale_generation_rejection:'+location,recovery['abort_guarded:'+location]['discardedStaleBytes']>0)

crop=load('browser_cropfollow.json')
for direct in [False,True]:
 k=str(direct);original=first['epoch0.mp4:'+k];clap=first['clean_aperture.mp4:'+k]
 check('D29:clap_ignored:'+k,clap.get('ended') and [p['hash'] for p in clap['pictures']]==[p['hash'] for p in original['pictures']] and all(p['size']==[160,96] for p in clap['pictures']))
 for name,w in [('coherent8.mp4',144),('coherent32.mp4',128)]:
  row=crop[name+':'+k];check('D29:'+name+':'+k+':not_requested_geometry',row.get('ended') and all(p['size']!=[w,80] for p in row['pictures']))
for name,row in host['D29'].items():
 check('D29:'+name+':VCL_preserved',row['vcl_preserved'])
 if 'host_crop_exact' in row:check('D29:'+name+':host_crop_exact',row['host_crop_exact'])

clip=load('browser_clip.json');ref=clip['reference'];p=clip['preroll'];zero=clip['zero_retime'];win=clip['window']
check('D30:retained_preroll_seek_witness',ref.get('ended') and p.get('ended') and [a['hash'] for a in ref['pictures']]==[a['hash'] for a in p['pictures']])
check('D30:appendWindow_loses_start',win.get('ranges')==[[1,3]] and 'error' in win)
check('D30:zero_retime_false_success',zero.get('ended') and zero['pictures'][0]['hash']!=ref['pictures'][0]['hash'] and abs(zero['pictures'][0]['time']-.64)<1e-6)
check('D30:zero_retime_keeps_later_picture',zero['pictures'][2]['hash']==ref['pictures'][2]['hash'])
result={'assertions':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'meaning':'Post-run consistency assertions including expected candidate failures; not production or performance gates. D27 first-run boundary discrepancy is retained and not gated away.','checks':checks}
save('verification.json',result);print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2))
# Preserve the unexpected default-decoder left-map failure as a failed check.
# Exit status is nonzero so automation cannot mistake this for universal qualification.
if result['failed']:raise SystemExit(1)
