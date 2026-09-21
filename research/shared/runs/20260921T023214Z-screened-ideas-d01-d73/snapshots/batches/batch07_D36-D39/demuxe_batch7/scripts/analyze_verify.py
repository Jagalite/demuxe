"""SPDX-License-Identifier: MIT. Verification includes expected failures; not a release gate."""
from common import *
import numpy as np
checks=[]
def ck(name,ok,details=None):
 checks.append({'check':name,'passed':bool(ok),'details':details})
def load(n):return json.loads((E/n).read_text())

def main():
 ec=load('edited_component.json');views=load('browser_views.json');manifest=load('manifest.json');vc={}
 for n in ['a.mp4','b.mp4']:
  ck(n+' source identity',sha((F/n).read_bytes())==manifest['sources'][n]['sha256']);ck(n+' browser source oracle',len(views[n]['pictures'])==40 and views[n].get('ended'))
 for name in ['edited','aliased']:
  q=views[name];m=manifest['views'][name];rows=[]
  ck(name+' materialized bytes pinned',sha((F/(name+'.mp4')).read_bytes())==m['sha256']==q['testOnlyBlobHash']);ck(name+' duration and EOF',q['duration']==3 and q['ended'] and q['cleaned'])
  ck(name+' independent full host pixels',ec[name]['complete_host_yuv_pass']);ck(name+' exact packet identity timing',ec[name]['packet_identity_timing_pass']);ck(name+' range map comparisons',ec[name]['random_boundary_ranges_checked']>=580)
  for p in q['pictures']:
   t=p['requested'];epoch=min(2,int(t));j=int((t-epoch)*20+1e-6);ref=views['b.mp4'if epoch==1 else'a.mp4']['pictures'][j]
   same=p['hash']==ref['hash'] and p['width']==ref['width']and p['height']==ref['height'];timed=abs(p['mediaTime']-(epoch+j/20))<1e-6;rows.append({'requested':t,'same_pixels':same,'correct_time':timed})
  ck(name+' all 60 ordinals plus 4 return seeks',len(rows)==64 and all(z['same_pixels']and z['correct_time']for z in rows));vc[name]={'comparisons':rows,'all_64_exact':all(z['same_pixels']and z['correct_time']for z in rows),'duration':q['duration']}
 for label,x in ec['controls'].items():ck('author guard '+label,x['rejected'])
 ck('browser stale source rejection','source validator changed'in views['stale_source'].get('error',''))
 ck('wrong offset decoding control',bool(views['wrong_offset'].get('error')))
 ck('alias has backward sample offset',ec['aliased']['backward_chunk_offsets']==1)
 ck('alias reduces physical storage, not timeline samples',ec['aliased']['bytes']<ec['edited']['bytes']and ec['aliased']['timeline_samples']==ec['edited']['timeline_samples']==60)
 save('view_comparison.json',vc)

 order=load('browser_ordered.json');baseline=order['baseline']['pictures'];oc={}
 for variant in ['baseline','permuted','tail_first','sparse_seek','duplicate','wrong_sequence','wrong_time']:
  q=order[variant];matches=sum(p['hash']==ref['hash']and p['mediaTime']==ref['mediaTime']and p['width']==ref['width']and p['height']==ref['height']for p,ref in zip(q['pictures'],baseline));oc[variant]={'points':len(q['pictures']),'matches':matches,'duration':q.get('duration'),'error':q.get('error')}
  if variant not in ['wrong_sequence','wrong_time']:
   ck(variant+' ten timestamp/pixel witnesses',len(q['pictures'])==matches==10);ck(variant+' EOF and retained graph',q.get('ended')and q['retainedMediaSource']and q['retainedSourceBuffer']and q['duration']==4.1)
 ck('sequence mode detects wrong presentation',order['wrong_sequence']['ended'] and oc['wrong_sequence']['matches']==0)
 ck('wrong tfdt detects missing/misplaced output',oc['wrong_time']['matches']<10 and bool(order['wrong_time'].get('error')))
 early=order['sparse_seek']['early'];ref=baseline[6]
 ck('early seek matches correct later picture',early['hash']==ref['hash']and early['mediaTime']==ref['mediaTime']==3.2)
 ck('early seek only requested init and last GOP',order['sparse_seek']['earlyFetched']==['order.init','order3.m4s'] and order['sparse_seek']['earlyBuffered']==[[3.1,4.1]])
 oc['early_sparse_matches_baseline']=early['hash']==ref['hash'];save('order_comparison.json',oc)

 for profile,prefix,imgPrefix in [('yuv','avif','image'),('rgb','avif_rgb','rgb')]:
  component=load(prefix+'_component.json');out=load('browser_'+prefix+'.json');comparison={}
  for name,co in component['outputs'].items():
   ck(name+' packet-copy identity',co['packets']==3 and all(co['packet_matches']));ck(name+' host decoded component identity',co.get('host_yuv_equal',co.get('host_gbr_equal')))
  for mode in ['direct','mse']:
   q=out[mode];rows=[];ck(profile+' '+mode+' duration/EOF',q['duration']==2.75 and q['ended']);ck(profile+' '+mode+' six positions',len(q['pictures'])==6)
   for i,p in enumerate(q['pictures']):
    idx=[0,1,1,1,2,2][i];ref=out['images'][f'{imgPrefix}{idx}.avif'];a=np.array(ref['rgba'],dtype=np.int16);b=np.array(p['rgba'],dtype=np.int16);d=np.abs(a-b);rows.append({'target':p['requested'],'time':p['mediaTime'],'item':idx,'different_components':int(np.count_nonzero(d)),'max_error':int(d.max()),'mean_abs':float(d.mean()),'exact':bool((d==0).all())})
   ck(profile+' '+mode+' correct hold timestamps',[p['mediaTime']for p in q['pictures']]==[0,.5,.5,.5,2,2])
   ck(profile+' '+mode+(' exact positive'if profile=='rgb'else' exact-pixel negative detected'),all(z['exact']for z in rows)if profile=='rgb'else all(not z['exact']for z in rows))
   comparison[mode]=rows
  for label,val in component.get('controls',{}).items():
   if isinstance(val,dict)and 'rejected'in val:ck(profile+' AVIF guard '+label,val['rejected'])
  save(prefix+'_comparison.json',comparison)
 # Basic artifact cross-checks: scopes intentionally record failed qualification separately.
 outcomes={'D36':'pursue: local source-slice MP4 view; browser HTTP virtual URL blocked','D37':'pursue only explicit edited/repeated assets; storage result, not fewer decodes','D38':'pursue: destination order/seek screen for independently decodable AVC GOPs, video only','D39_rgb':'pursue restricted native timed-image route with exact tested canvas output','D39_yuv':'stop exact-canvas-equivalence variant on this environment; presentation differs'}
 result={'checks':checks,'passed':sum(c['passed']for c in checks),'failed':sum(not c['passed']for c in checks),'qualification_outcomes':outcomes,'warning':'Expected-failure controls count as verified observations, not successful routes. No production/performance gate is passed.'};save('verification.json',result);print(json.dumps({k:v for k,v in result.items()if k!='checks'},indent=2))
 if result['failed']:raise SystemExit('Cross-check failures retained in evidence/verification.json')
if __name__=='__main__':main()
