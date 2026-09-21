# SPDX-License-Identifier: MIT
"""Output-oracle comparisons, not a tally of accepted media formats."""
from common import *

def read(n):return json.loads((E/n).read_text())
checks=[]
def check(name,ok,detail=None):checks.append({'name':name,'passed':bool(ok),'detail':detail})
def eq(a,b):return a.get('hash')==b.get('hash') and a.get('width')==b.get('width') and a.get('height')==b.get('height')
def temporal(c,t):return abs(c.get('mediaTime',1e9)-t)<1.1e-6
r=read('reverse_manifest.json');analysis={'D71':{},'D72':{},'D73':{}}
check('D71 independent complete host reversed YUV',r['independent_host_reverse_exact'])
for k,v in r['guard_controls'].items():check('D71 guard '+k,v['rejected'])
p=packet_summary('reverse.mp4');check('D71 original packet hashes reversed',[x['data_hash'].split(':')[-1] for x in p]==list(reversed(r['payload_hashes'])))
for route in ['mse','direct']:
 d=read('browser_reverse_'+route+'.json');refs=d['forward']['checks'][:48];wanted=r['times']['reverse'];vals={}
 for name in ['reverse','wrong_forward','wrong_duration']:
  observed=d[name]['checks'][:48]
  vals[name]={'picture_matches':sum(eq(a,refs[t['source']]) for a,t in zip(observed,wanted)),'timestamp_matches':sum(temporal(a,t['pts']) for a,t in zip(observed,wanted)),'queries':len(observed)}
 check('D71 '+route+' all 48 reversed pictures',vals['reverse']['picture_matches']==48)
 check('D71 '+route+' all 48 requested timestamps',vals['reverse']['timestamp_matches']==48)
 check('D71 '+route+' wrong order detected',vals['wrong_forward']['picture_matches']<48)
 check('D71 '+route+' wrong duration detected',vals['wrong_duration']['timestamp_matches']<48)
 for name in ['forward','reverse']:
  check('D71 '+route+' '+name+' exact duration + EOF',d[name].get('duration')==3 and d[name].get('ended'))
 # Additional seek queries use the same source-bound reverse timeline map.
 tail=[]
 for a in d['reverse']['checks'][48:]:
  t=next(x for x in wanted if x['pts']<=a['query']<x['pts']+x['duration'])
  tail.append(eq(a,refs[t['source']]) and temporal(a,t['pts']))
 check('D71 '+route+' three return seeks',len(tail)==3 and all(tail))
 vals['natural_observation_counts']={k:len(d[k].get('observed',[]))+1 for k in ['forward','reverse']}
 vals['candidate_cleanup']=d['reverse']['cleaned'];analysis['D71'][route]=vals
analysis['D71']['bytes']={k:r[k] for k in ['source_bytes','candidate_bytes','compressed_payload_bytes','host_reverse_bytes']}

m=read('duration_manifest.json');a=read('browser_duration_mse.json');direct=read('browser_duration_direct.json');ref=direct['explicit']['checks'];info={}
check('D72 complete host pixels unchanged across wrappers',len(set(m['host_decoded_hashes'].values()))==1)
for name,pk in m['host_packet_summaries'].items():check('D72 '+name+' all six original payloads',[x['hash'] for x in pk]==m['original_payload_hashes'])
for name in ['explicit','last_explicit','explicit_with_default']:
 v=a[name];good=[eq(x,y) and temporal(x,y['mediaTime']) for x,y in zip(v['checks'],a['explicit']['checks'])]
 check('D72 MSE '+name+' nine same-destination witnesses',len(good)==9 and all(good))
 check('D72 MSE '+name+' declared duration/EOF',v.get('duration')==2.75 and v.get('ended'))
 check('D72 MSE '+name+' complete coverage',v['bufferedBeforeEOS']==[[0,2.75]])
for name in ['no_durations','default_short','no_durations_forced_end']:
 v=a[name];check('D72 missing duration '+name+' rejected as complete playback',v.get('ended') is False)
 check('D72 '+name+' coverage not complete',v['bufferedBeforeEOS']!=[[0,2.75]])
for name,v in direct.items():
 good=[eq(x,y) and temporal(x,y['mediaTime']) for x,y in zip(v['checks'],ref)]
 check('D72 direct '+name+' all witnesses and EOF',len(good)==9 and all(good) and v.get('ended'))
 info[name]={'direct_duration':v.get('duration'),'direct_ended':v.get('ended'),'mse_duration':a[name].get('duration'),'mse_buffered':a[name].get('bufferedBeforeEOS'),'mse_ended':a[name].get('ended'),'bytes':m['assets'][name]['bytes']}
analysis['D72']['cases']=info
analysis['D72']['complete_duration_metadata_added_bytes']=m['assets']['explicit']['bytes']-m['assets']['no_durations']['bytes']
analysis['D72']['last_only_added_bytes']=m['assets']['last_explicit']['bytes']-m['assets']['no_durations']['bytes']
analysis['D72']['after_end_followup']=a.get('no_durations_forced_after_end')

g=read('geometry_manifest.json');check('D73 unrotated complete host pictures identical',len(set(g['host_unrotated_yuv_hashes'].values()))==1)
check('D73 all 10 wrapper variants preserve 48 compressed packets',all(g['packet_payloads_all_equal'].values()))
for k,v in g['controls'].items():check('D73 guard '+k,v['rejected'])
geometry={};natural_guard=[]
for route in ['direct','mse']:
 d=read('browser_geometry_'+route+'.json');geometry[route]={}
 for name,v in d.items():
  c=v['checks'];meta=g['assets'][name];intended=[160*meta['spsSAR'],96];intended=intended[::-1] if meta['rotated'] else intended
  accepted=len(c)==4 and all([x['width'],x['height']]==intended for x in c)
  geometry[route][name]={'natural':[c[0]['width'],c[0]['height']],'callback':[c[0]['frameWidth'],c[0]['frameHeight']],'intended_test_geometry':intended,'admitted_by_geometry_guard':accepted}
  check('D73 '+route+' '+name+' frame callback remains coded dimensions',len(c)==4 and all([x['frameWidth'],x['frameHeight']]==[160,96] for x in c))
  check('D73 '+route+' '+name+' query consistency',len(c)==4 and all([x['width'],x['height']]==[c[0]['width'],c[0]['height']] for x in c))
  natural_guard.append(accepted)
 for name in ['sar_s1_p1_w160','sar_s2_p2_w320','sar_rotated_s2']:
  check('D73 '+route+' coherent '+name+' geometry and EOF',geometry[route][name]['admitted_by_geometry_guard'] and d[name].get('ended'))
 # Within each endpoint all equal-geometry alternatives must match the same endpoint's coherent reference.
 for name,v in d.items():
  if name.startswith('sar_rotated'):continue
  refname='sar_s1_p1_w160' if v['checks'][0]['width']==160 else 'sar_s2_p2_w320'
  check('D73 '+route+' '+name+' coherent pixel reference',all(eq(x,y) for x,y in zip(v['checks'],d[refname]['checks'])))
check('D73 endpoint disagreement reproduced',geometry['direct']['sar_s1_p1_w320']['natural']==[160,96] and geometry['mse']['sar_s1_p1_w320']['natural']==[320,96])
check('D73 coded dimensions are insufficient for rotated anamorphic display',geometry['mse']['sar_rotated_s2']['natural']==[96,320] and geometry['mse']['sar_rotated_s2']['callback']==[160,96])
analysis['D73']['matrix']=geometry;analysis['D73']['source_intent_guard']={'accepted':sum(natural_guard),'rejected':len(natural_guard)-sum(natural_guard),'case_count':len(natural_guard),'note':'Intended geometry comes from known authoring contract, not an assumed universal bitstream-precedence rule.'}
# Endpoints need not render equal color samples; deliberately record rather than erase this limit.
x=read('browser_geometry_direct.json');y=read('browser_geometry_mse.json')
analysis['D73']['cross_endpoint_coherent_pixel_hash_matches']={k:sum(eq(a,b) for a,b in zip(x[k]['checks'],y[k]['checks'])) for k in ['sar_s1_p1_w160','sar_s2_p2_w320','sar_rotated_s2']}
verification={'total':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'checks':checks}
save('analysis.json',analysis);save('verification.json',verification)
print(json.dumps({k:verification[k] for k in ['total','passed','failed']}))
if verification['failed']:
 print([x for x in checks if not x['passed']]);raise SystemExit(1)
