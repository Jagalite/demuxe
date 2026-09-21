# SPDX-License-Identifier: MIT
"""Post-run consistency checks. Expected failed candidates remain failures."""
from pathlib import Path
import json,hashlib,sys
import numpy as np
from PIL import Image
from build import project_cues,frame
R=Path(__file__).resolve().parents[1];E=R/'evidence';F=R/'fixtures'
def read(n):return json.loads((E/n).read_text())
checks=[]
def ck(name,condition,detail=None):checks.append({'name':name,'passed':bool(condition),'detail':detail})
sm=read('silence_manifest.json');s=read('browser_silence.json');follow=read('browser_silence_followup.json')
a=s['decode']['symbolic.flac'];b=s['decode']['dense.flac'];ck('D52 complete browser PCM identity',a['hashes']==b['hashes'] and a['frames']==b['frames']==192000 and a['channels']==b['channels']==2)
ck('D52 all decoded silent samples are zero',all(z['peak']==0 for z in a['silent']));ck('D52 independent host integer equality',sm['independent_host_exact']);ck('D52 guards reject unknown/stale/bad intervals',all(sm['guards_rejected']))
ck('D52 two compact silence frames are 37 bytes',sum(x['frame_bytes']for x in sm['records'])==37)
ck('D52 wrapped silence fragments are 253 bytes',sum(x['bytes']for x in sm['audio']['fragments']if x['tfdt']in[48000,96000])==253)
def bands(o):
    out={}
    for name,lo,hi in [('first',.3,.6),('silence',1.4,2.6),('last',3.3,3.7)]:
        bs=[z for z in o['audio'] if lo<z['mediaTime']<hi]
        out[name]={'blocks':len(bs),'median_amplitudes':np.median([z['amps']for z in bs],axis=0).tolist()if bs else None,'max_L_peak':max((z['L']['peak']for z in bs),default=0),'median_L_rms':float(np.median([z['L']['rms']for z in bs]))if bs else None}
    return out
bands_all={k:bands(o)for k,o in [('filled',s['filled']),('gap',s['gap']),*follow.items()]}
for name in ['filled','gap-seek']:
    z=bands_all[name];ck('D52 '+name+' first tones present',z['first']['median_amplitudes'][0]>.2 and z['first']['median_amplitudes'][1]>.15)
    ck('D52 '+name+' declared central interval quiet',z['silence']['max_L_peak']==0)
    ck('D52 '+name+' last tones at expected time',z['last']['median_amplitudes'][2]>.2 and z['last']['median_amplitudes'][3]>.15)
ck('D52 upfront filled continuous four-second range and EOF',s['filled'].get('ended') and s['filled']['afterEos']['media']==[[0,4]] and s['filled']['finalDuration']==4)
for k,o in [('gap',s['gap']),*follow.items()]:
    ck('D52 '+k+' initially stalls at hole',o.get('stallTime')==1 and o['beforeEos']['media']==[[0,1],[3,4]])
    ck('D52 '+k+' final video range/EOF retained',o.get('repairedEnded') and o['repairedRanges']==[[0,4]] and o['videoSourceBufferRetained'])
    ck('D52 '+k+' matches filled video samples after repair',[(q['mediaTime'],q['hash'])for q in o['pictures']]==[(q['mediaTime'],q['hash'])for q in s['filled']['pictures']])
for k in ['gap','gap-repeat','gap-no-eos']:ck('D52 '+k+' late fill fails subsequent audio timing',bands_all[k]['last']['max_L_peak']==0)
# D53, a regression for an existing policy, not a new eviction algorithm.
e=read('browser_evict.json');base={q['requested']:(q['mediaTime'],q['hash'])for q in e['baseline']['pictures']}
ck('D53 baseline complete',e['baseline'].get('ended') and not e['baseline'].get('error'))
ck('D53 exact boundary retains next GOP',e['safe']['post']==[[2,6]]);ck('D53 0.1ms overrun removes next GOP',e['unsafe']['post']==[[4,6]])
ck('D53 unsafe rewind is visibly unavailable','rewindError'in e['unsafe']);ck('D53 retained-fragment reappend restores range',e['unsafe']['restored']==[[2,6]])
for k in ['safe','unsafe']:
    for i,q in enumerate(e[k]['pictures']):ck(f'D53 {k} picture {i}',base[q['requested']]==(q['mediaTime'],q['hash']))
    ck(f'D53 {k} retained owner EOF cleanup',e[k].get('ended') and e[k].get('retainedSourceBuffer') and e[k]['cleaned'])
# D54 independent query-time mapping, unlike the candidate cue-list constructor.
c=read('browser_captions.json');cm=read('captions_manifest.json');cue_summary={}
for mode,o in c.items():
    mismatches=[]
    for i,q in enumerate(o['checks']):
        t=q['currentTime']*1000;seg=next((s for s in cm['plan']if s['dest_start']<=t<s['dest_start']+s['source_end']-s['source_start']),None)
        st=t-seg['dest_start']+seg['source_start']if seg else -1
        want=sorted(z['text']for z in cm['source_cues']if z['start']<=st<z['end']);got=sorted(z['text']for z in q['active'])
        if want!=got:mismatches.append({'index':i,'time':q['currentTime'],'expected':want,'actual':got})
        if mode=='correct':ck('D54 native active cue set '+str(i),want==got)
    cue_summary[mode]={'checks':len(o['checks']),'mismatches':mismatches}
    if mode!='correct':ck('D54 '+mode+' negative detected',len(mismatches)>0)
    ck('D54 '+mode+' EOF and source retention',o['close']['ended'] and o['close']['urlUnchanged'] and o['close']['cleaned'])
ck('D54 candidate projector repeatability',project_cues(cm['plan'],cm['source_cues'])==cm['projected'])
images={}
for a,b in [('caption_1.png','caption_12.png'),('caption_1.png','caption_16.png'),('caption_12.png','caption_17.png'),('caption_1.png','caption_hidden.png')]:
    x=np.array(Image.open(E/a));y=np.array(Image.open(E/b));n=int(np.count_nonzero(x!=y));images[a+' / '+b]=n;ck('D54 screenshot '+a+' / '+b, n>0 if 'hidden'in b else n==0)
neg=[]
for plan in [[{'source_start':0,'source_end':2000,'dest_start':0},{'source_start':0,'source_end':2000,'dest_start':1000}],[{'source_start':-1,'source_end':2000,'dest_start':0}],[{'source_start':0,'source_end':2000,'dest_start':0,'rate':2}],[{'source_start':0,'source_end':2000.5,'dest_start':0}]]:
    try:project_cues(plan,cm['source_cues']);neg.append(False)
    except ValueError:neg.append(True)
for i,v in enumerate(neg):ck('D54 malformed/unsupported edit guard '+str(i),v)
# D55 preserves predeclared tolerance, not false bit-exactness.
f=read('browser_fir_qualified.json')['results'];initial=read('browser_fir.json')['results'];ff=read('browser_fir_followup.json')['results'];small=read('browser_tail_minimal.json')['results'];tol=read('fir_manifest.json')['tolerance_absolute']
ck('D55 initial full-channel tail negative detected',initial['full']['maxAbs']>tol)
ck('D55 stable-channel full output qualified',f['full']['maxAbs']<=tol and f['full']['length']==100646)
for i,q in enumerate(f['jobs']):
    ck('D55 job '+str(i)+' independent FIR reference',q['oracle']['length']==q['oracle']['expected'] and q['oracle']['maxAbs']<=tol)
    ck('D55 job '+str(i)+' continuous renderer reference',q['continuous']['maxAbs']<=tol)
    ck('D55 job '+str(i)+' implicit normalization rejected',q['defaultNormalization']['maxAbs']>tol)
    if i:ck('D55 job '+str(i)+' missing preceding history rejected',q['noHalo']['maxAbs']>tol)
for k in ['explicit-discrete','explicit-speakers','padded-source']:ck('D55 full tail alternative '+k,ff[k]['overTolerance']==0)
ck('D55 independent minimal default negative',small['default']['channels'][0]['maxAbs']==0 and small['default']['channels'][1]['maxAbs']==.375)
for k in ['explicit','padded']:ck('D55 minimal '+k+' exact',all(x['maxAbs']==0 for x in small[k]['channels']))
analysis={'D52':{'upfront':'scoped A/V pass','late_fill_without_seek':'fails subsequent audio timing despite video EOF','explicit_seek':'coarse streaming audio witness restored; skips 40ms of declared silence, not a gapless result','silence_coded_bytes':37,'silence_fragment_bytes':253,'bands':bands_all},'D53':{'scope':'existing-policy precision regression','safe_range':e['safe']['post'],'unsafe_range':e['unsafe']['post'],'cutoff_difference_seconds':.0001},'D54':{'cue_results':cue_summary,'screenshots_differing_components':images,'guard_results':neg},'D55':{'full_max_abs':f['full']['maxAbs'],'window_max_abs':max(q['oracle']['maxAbs']for q in f['jobs']),'window_scalar_samples':sum(q['oracle']['length']for q in f['jobs']),'max_input_frames':max(q['inputFrames']for q in f['jobs']),'tolerance':tol,'minimal_failure_max_abs':.375}}
(E/'analysis.json').write_text(json.dumps(analysis,indent=2));result={'total':len(checks),'passed':sum(c['passed']for c in checks),'failed':sum(not c['passed']for c in checks),'meaning':'Post-run consistency assertions include expected failed candidates; not independent experiments or performance gates.','checks':checks};(E/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:result[k]for k in ['total','passed','failed']},indent=2))
if result['failed']:
    print(json.dumps([x for x in checks if not x['passed']],indent=2));sys.exit(1)
