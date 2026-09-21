# SPDX-License-Identifier: MIT
from common import *
checks=[]
def check(name,value):checks.append({'name':name,'passed':bool(value)})
def load(n):return json.loads((E/n).read_text())
def exact(c):return c['different']==0 and c['lengthA']==c['lengthB']
def cmp_pics(a,b):return len(a)==len(b) and all(all(x[k]==y[k] for k in ['w','h','hash','mediaTime']) for x,y in zip(a,b))
tm=load('tiff_manifest.json');t=load('browser_tiff.json')['result'];roi=load('browser_tiff_region.json')['result']
check('D59 original TIFF rejected by this browser endpoint',len(t['originals'])==5 and all('error' in x for x in t['originals']))
check('D59 seven independent full-TIFF host oracle comparisons',len(tm['cases'])==7 and all(x['host_different']==0 for x in tm['cases']))
for x in t['cases']:check('D59 browser full-page equality '+x['file']+' page '+str(x['page']),exact(x['comparison']))
for x in t['negative']:check('D59 wrong output detected '+x['mode'],x['comparison']['different']>0)
for k,x in tm['guards'].items():check('D59 guard '+k,isinstance(x,str))
for x in roi['cases']:check('D59 ROI '+str(x['rect']),exact(x['comparison']) and x['decodedPixels']<x['fullPagePixels'])
vm=load('video_manifest.json');v=load('browser_video.json')
check('D60 exact canonical original file recovered',(F/'original.mp4').read_bytes()==(F/'repaired.mp4').read_bytes())
check('D60 only eight byte values repaired',sum(a!=b for a,b in zip((F/'damaged.mp4').read_bytes(),(F/'repaired.mp4').read_bytes()))==8)
check('D60 complete host output preserved',len({x['sha256'] for x in vm['host'].values()})==1 and all(x['bytes']==160*96*3//2*80 for x in vm['host'].values()))
check('D60 eighty original coded samples',sum(x['samples'] for x in vm['records'])==80)
check('D60 genuine dependent sample guards',len(vm['guards']['genuine_dependent_samples_not_IDR'])==76 and all(vm['guards']['genuine_dependent_samples_not_IDR']))
check('D60 framing and source guards',isinstance(vm['guards']['bad_nal_extent'],str) and isinstance(vm['guards']['wrong_source'],str))
check('D60 damaged direct seek fails', 'seek failed' in v['damaged_direct'].get('error',''))
check('D60 restored direct picture/timestamp witnesses',cmp_pics(v['original_direct']['pictures'],v['repaired_direct']['pictures']) and len(v['repaired_direct']['pictures'])==10)
for mode in ['mse','cold']:
 for name in ['damaged','repaired']:check('D60 '+name+' '+mode+' same-endpoint reference',cmp_pics(v['original_'+mode]['pictures'],v[name+'_'+mode]['pictures']))
for k,q in v.items():
 if k=='environment' or k=='damaged_direct':continue
 check('D60 '+k+' end and exact duration',q.get('ended') and q['duration']==4 and q.get('cleaned'))
l=load('browser_loop.json')['result'];f=load('browser_loop_followup.json')['result']
for i,r in enumerate(l['sameRate']):
 for mode in ['sliced','materialized']:check('D61 case '+str(i)+' '+mode+' all exact',all(exact(c) for c in next(q for q in r['outputs'] if q['mode']==mode)['comparison']))
 check('D61 case '+str(i)+' wrong end detected',all(c['different']>0 for c in next(q for q in r['outputs'] if q['mode']=='wrong-end')['comparison']))
check('D61 full-buffer one-frame loop failure retained',all(c['different']==2002 for c in l['sameRate'][-1]['outputs'][0]['comparison']))
check('D61 fractional full-buffer deviations retained',all(any(c['max']>.01 for c in r['loopVsMaterial']) for r in l['fractional']))
check('D61 rate-doubling isolated loop exact',all(exact(c) for c in l['fractional'][0]['slicedVsMaterial']))
check('D61 fractional-rate isolated loops remain nonexact',all(any(c['different']>0 for c in r['slicedVsMaterial']) for r in l['fractional'][1:]))
check('D61 fractional isolated max recorded',all(c['max']<=3e-8 for r in l['fractional'][1:] for c in r['slicedVsMaterial']))
check('D61 same-input repeatability',all(exact(c) for r in l['fractional'] for c in r['repeat']))
for i,q in enumerate(f['cases']):
 check('D61 before-loop mutation irrelevant '+str(i),all(exact(x) for x in q['outputs'][1]['vsOriginal']))
 check('D61 after-loop mutation affects output '+str(i),all(x['different']>0 for x in q['outputs'][2]['vsOriginal']))
check('D61 bad requests rejected',all(isinstance(x,str) for x in l['guards']))
result={'total':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'checks':checks,'note':'Assertions include expected candidate failures; this is not a count of discoveries or production passes.'}
save('verification.json',result)
summary={'D59':{'decision':'pursue restricted JPEG-in-TIFF adapter','pages':len(t['cases']),'strips':sum(x['strips'] for x in t['cases']),'rgba_values':sum(x['comparison']['values'] for x in t['cases']),'ROIs':roi['cases']},'D60':{'decision':'conditional native-direct seek repair; unnecessary for tested MSE; cross-endpoint fidelity unqualified','changed_values':8,'coded_samples':80,'same_endpoint_tests':{k:{'error':q.get('error'),'duration':q.get('duration'),'pictures':len(q.get('pictures',[])),'ended':q.get('ended',False)} for k,q in v.items() if k!='environment'},'cross_endpoint_identical_picture_hashes':sum(a['hash']==b['hash'] for a,b in zip(v['original_mse']['pictures'],v['original_direct']['pictures']))},'D61':{'decision':'pursue isolated-cycle same-rate native looping; reject full-buffer blanket exactness and fractional-rate bit-exact claims','same_rate_requested_channel_values':sum(r['frames']*2 for r in l['sameRate']),'same_rate_jobs':len(l['sameRate']),'fractional':l['fractional']},'verification':{k:result[k] for k in ['total','passed','failed']}}
save('analysis.json',summary);print(json.dumps({k:result[k] for k in ['total','passed','failed']}))
if result['failed']:raise SystemExit(1)
