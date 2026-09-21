# SPDX-License-Identifier: MIT
from common import *
from PIL import features
import platform,datetime

def main():
 checks=[]
 def check(n,ok,detail=None):checks.append({'name':n,'pass':bool(ok),'detail':detail})
 og=json.loads((E/'ogg_manifest.json').read_text());bo=json.loads((E/'browser_ogg.json').read_text());pv=json.loads((E/'browser_page_views.json').read_text())
 for i,s in enumerate(og['streams']):
  check(f'Ogg stream {i}: original packet and page preservation',s['packet_hashes_exact'] and len(s['page_hashes'])==s['pages'])
  check(f'Ogg stream {i}: independent full integer output',s['host_equals_selected_source'])
  check(f'Ogg stream {i}: full browser output',all(c['exact'] for c in bo['comparisons']['selected'+str(i)]))
  check(f'Ogg stream {i}: page-slice Blob bytes',pv[i]['materializedHash']==pv[i]['referenceHash'])
  check(f'Ogg stream {i}: native lifecycle',pv[i].get('ended') and pv[i]['cleaned'] and len(pv[i]['seeks'])==2)
 check('Full multiplex decodes first stream',all(x['exact'] for x in bo['comparisons']['full0']))
 check('Wrong stream is detected despite matching length',not any(x['exact'] for x in bo['comparisons']['full1']))
 for k,v in og['controls'].items():check('Ogg negative '+k,v['rejected'])
 vd=json.loads((E/'video_manifest.json').read_text());v1=json.loads((E/'browser_video1.json').read_text());v2=json.loads((E/'browser_video2.json').read_text())
 check('Video guarded compatibility and packet bytes',vd['compatibility_equal'] and vd['mdat_equal'] and vd['packet_identity'] and vd['patched_values']==1)
 for k,v in vd['controls'].items():check('Video negative '+k,v['rejected'])
 check('Unmapped track fails MSE append',bool(v2['unchanged'].get('error')) and not v2['unchanged'].get('ended'))
 source_refs={}
 for n in ['a','b']:
  v=v1['ref-'+n];source_refs[n]={round(x['mediaTime']*20):x['hash'] for x in v['checks']+v.get('observed',[])+[v['firstFrame']]}
  check('Reference video '+n+' complete observed picture coverage',len(source_refs[n])==20)
 video_details={}
 for name,v in [('fresh_init',v1['fresh_init']),('mapped',v2['mapped']),('wrong_picture',v2['wrong_picture'])]:
  seek=[];obs=[]
  for x in v['checks']:
   region=int(x['requested']);n='b' if region==1 else 'a';frame=int((x['requested']-region)*20);expected=source_refs[n][frame];seek.append(x['hash']==expected and abs(x['mediaTime']-(region+frame/20))<1e-6)
  for x in v['observed']+[v['firstFrame']]:
   frame=round(x['mediaTime']*20);region=frame//20;n='b' if region==1 else 'a';obs.append(x['hash']==source_refs[n][frame%20])
  video_details[name]={'seek_checks':len(seek),'exact_seek_checks':sum(seek),'observed_checks':len(obs),'exact_observed_checks':sum(obs),'duration':v['duration']}
  if name!='wrong_picture':
   check(name+' independent source-picture seek/timing witnesses',all(seek))
   check(name+' every observed frame plus initial frame',all(obs),len(obs))
   check(name+' duration/EOF/ownership/cleanup',v['duration']==3 and v['ended'] and v['retainedSourceBuffer'] and v['cleaned'])
  else:check('Wrong compatible source detected although it reaches EOF',not all(seek) and not all(obs) and v['ended'])
 a=packet_summary('v_b.mp4');b=packet_summary('v_b_mapped.mp4');keys=['pts','dts','duration','size','data_hash'];check('Video packet payload/timestamps/durations unchanged',[[p.get(k) for k in keys] for p in a]==[[p.get(k) for k in keys] for p in b])
 raw_a=ff('-i',F/'v_b.mp4','-pix_fmt','yuv420p','-f','rawvideo','-');raw_b=ff('-i',F/'v_b_mapped.mp4','-pix_fmt','yuv420p','-f','rawvideo','-');check('Video complete host pixels unchanged',raw_a==raw_b)
 wm=json.loads((E/'webp_manifest.json').read_text());wb=json.loads((E/'browser_webp.json').read_text());pf=json.loads((E/'webp_frame_decode_comparison.json').read_text());png=json.loads((E/'webp_png_composition.json').read_text())
 for k,v in wm['controls'].items():check('WebP negative '+k,v['rejected'])
 for i,f in enumerate(wm['binary']['frames']):check(f'Binary frame {i}: independent authored oracle',f['authored_numpy_oracle_exact'])
 for name,m in [(n,wm[n]) for n in ['binary','fractional']]:
  src=(F/m['file']).read_bytes();check(name+' all compressed subchunks unchanged',all((F/f['file']).read_bytes()[12:]==src[f['chunk_start']:f['chunk_end']] for f in m['frames']))
 bv=wb['binary_correct'];check('Binary native cold seeks match all 12 targets',all(q['exact'] for q in bv['checks']))
 check('Binary on both opaque backgrounds matches',all(c['exact'] for q in bv['checks'] for c in q['onBackgrounds'].values()))
 check('Binary 27 actual frame image decodes, all closed',bv['created']==bv['closed']==27)
 check('Native original animation first image matches',bv['sourceFirstImage']['hash']==next(q['referenceHash'] for q in bv['checks'] if q['target']==0))
 check('Fractional alpha not admitted as exact',sum(q['exact'] for q in wb['fractional_correct']['checks'])<12)
 check('Ignore disposal produces detected failure',any(not q['exact'] for q in wb['binary_ignore-dispose']['checks']))
 check('Ignore blend produces detected failure',any(not q['exact'] for q in wb['binary_ignore-blend']['checks']))
 check('Per-frame alpha differences retained',sum(x['exact'] for x in pf)<len(pf))
 check('PNG substitution does not fix every fractional composition',not all(q['exact'] for q in png['checks']))
 result={'research_ids':['D65','D66','D67'],'checks_passed':sum(x['pass'] for x in checks),'checks_total':len(checks),'video':video_details,'ogg':{'source_bytes':og['source_bytes'],'selected_bytes':[s['bytes'] for s in og['streams']],'selected_values_total':2*2*og['frames'],'wrong_stream_different_values':sum(c['different'] for c in bo['comparisons']['full1'])},'webp':{'binary_seeks_exact':sum(c['exact'] for c in bv['checks']),'candidate_decodes':bv['created'],'full_prefix_decodes':sum(range(1,13)),'fractional_seeks_exact':sum(c['exact'] for c in wb['fractional_correct']['checks']),'fractional_max_abs':max(c['maxAbs'] for c in wb['fractional_correct']['checks']),'standalone_frames_exact':sum(c['exact'] for c in pf),'standalone_frames_total':len(pf),'png_composition_exact':sum(c['exact'] for c in png['checks'])},'qualifications':{'maintained_player':False,'hardware_acceleration':False,'cpu_energy_memory_benefit':False,'audio_live_sample_exactness':False,'arbitrary_webp_alpha':False},'checks':checks}
 save('verification.json',result);save('analysis.json',{k:v for k,v in result.items() if k!='checks'});print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2))
 if not all(x['pass'] for x in checks):raise SystemExit(1)
if __name__=='__main__':main()
