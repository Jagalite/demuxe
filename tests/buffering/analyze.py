# SPDX-License-Identifier: Apache-2.0
"""Summarize observed state, server writes, packet cache, seeks and process CPU.
No raw byte cache is converted into playable time. Originals remain untouched.
"""
import json,sys,pathlib
rows=[]
for name in sys.argv[1:]:
 p=pathlib.Path(name);r=json.loads(p.read_text())
 if 'trials' not in r:continue
 for t in r['trials']:
  samples=(t.get('data') or {}).get('samples',[])
  phases=t.get('phases',[])
  observed_phases=[p for p in phases if p.get('samples')]
  start=phases[0]['start']['wall'] if phases else 0
  end=observed_phases[-1]['samples'][-1]['wall'] if observed_phases else start
  phase_samples=[s for s in samples if start<=s['wall']<=end]
  count=0;duration=0;last=False
  for a,b in zip(phase_samples,phase_samples[1:]):
   buffering=a['state']['status']=='buffering'
   if buffering and not last:count+=1
   if buffering:duration+=max(0,b['wall']-a['wall'])/1000
   last=buffering
  freezes=[];freeze_start=None
  for a,b in zip(phase_samples,phase_samples[1:]):
   frozen=a['state']['status'] in ['playing','buffering'] and b['state']['status'] in ['playing','buffering'] and abs(b['state']['currentTime']-a['state']['currentTime'])<.001
   if frozen and freeze_start is None:freeze_start=a['wall']
   if not frozen and freeze_start is not None:
    if a['wall']-freeze_start>=750:freezes.append((a['wall']-freeze_start)/1000)
    freeze_start=None
  if freeze_start is not None and phase_samples[-1]['wall']-freeze_start>=750:freezes.append((phase_samples[-1]['wall']-freeze_start)/1000)
  def maximum(f):
   values=[f(s) for s in samples];return max([v for v in values if isinstance(v,(int,float))],default=None)
  def backend(s):return s.get('diagnostics',{}).get('backend',{}) or {}
  packet=[(s.get('properties',{}).get('demuxer-cache-state') or {}) for s in samples]
  cpu=[]
  for phase in t.get('phases',[]):
   if not phase.get('samples'):continue
   a=phase['start'];b=phase['samples'][-1]
   if a.get('processes') and b.get('processes'):
    initial={x['id']:x['cpuTime'] for x in a['processes']}
    seconds=sum(max(0,x['cpuTime']-initial.get(x['id'],0)) for x in b['processes'])
    if b['wall']>a['wall']:cpu.append({'phase':phase['name'],'percentOneCore':seconds*100000/(b['wall']-a['wall'])})
  req=t.get('requests') or [];total=sum(q['bytesWritten'] for q in req)
  spans=sorted((q['start'],q['start']+q['bytesWritten']) for q in req if q['bytesWritten']);unique=0;end=0
  for a,b in spans:unique+=max(0,b-max(a,end));end=max(end,b)
  # Per-trial totals include reopened different files, so do not union offsets
  # across source identity. Recompute one union for each URL.
  unique=0
  for url in set(q['url'] for q in req):
   end=0
   for a,b in sorted((q['start'],q['start']+q['bytesWritten']) for q in req if q['url']==url):unique+=max(0,b-max(a,end));end=max(end,b)
  seeks=[]
  for seek in t.get('seeks',[]):
   post=[s for s in samples if seek['after']['wall']<=s['wall']<=seek['after']['wall']+250]
   after=post[-1] if post else seek['after'];before=seek['before']
   cache=lambda s:(s.get('properties',{}).get('demuxer-cache-state') or {})
   low_before=cache(before).get('debug-low-level-seeks');low_after=cache(after).get('debug-low-level-seeks')
   network_before=seek.get('networkBefore');network_after=seek.get('networkAfter')
   seeks.append({'target':seek['target'],'actualDistance':seek['target']-before['state']['currentTime'],'ms':seek['ms'],
    'demuxSeeksDelta':low_after-low_before if isinstance(low_before,(int,float)) and isinstance(low_after,(int,float)) else None,
    'bridgeSeeksDelta':((after.get('diagnostics',{}).get('backend') or {}).get('io') or {}).get('seeks',0)-((before.get('diagnostics',{}).get('backend') or {}).get('io') or {}).get('seeks',0),
    'packetRangesBefore':cache(before).get('seekable-ranges'),'packetRangesAfter':cache(after).get('seekable-ranges'),
    'requests':network_after['requests']-network_before['requests'] if network_before and network_after else None,
    'bytes':network_after['bytes']-network_before['bytes'] if network_before and network_after else None})

  rows.append({'run':str(p.parent),'id':t['config']['id'],'family':r['family'],'rttMs':r['rttMs'],'stage':r['stage'],'passed':t.get('passed',False),'error':t.get('error'),'openedMs':t.get('open',{}).get('opened'),'firstFrameMs':next((s.get('firstFrame') for s in samples if s.get('firstFrame') is not None),None),'rebuffers':count if phases else None,'rebufferSeconds':round(duration,3) if phases else None,'timelineFreezesOver750ms':len(freezes) if phases else None,'timelineFreezeSeconds':round(sum(freezes),3) if phases else None,'bytesWritten':total,'bytesBeforeSeeks':phases[-1].get('networkAfter',{}).get('bytes') if phases else None,'duplicateWrittenBytesAcrossLifecycle':total-unique,'requests':len(req),'peakObservedTotalWasmLinearBytes':maximum(lambda s:s.get('wasmLinearBytesObserved')),'peakObservedWasmEngines':maximum(lambda s:s.get('observedWasmEngines')),'peakWasmLinearBytes':maximum(lambda s:backend(s).get('heapBytes')),'peakSourceCacheBytes':maximum(lambda s:(backend(s).get('io') or {}).get('peakCacheBytes')),'peakPacketBytes':max([x.get('total-bytes',0) for x in packet],default=None),'peakForwardPacketBytes':max([x.get('fw-bytes',0) for x in packet],default=None),'peakRemuxWasmLinearBytes':maximum(lambda s:((backend(s).get('remux') or {}).get('remux') or {}).get('heapBytes')),'peakRemuxCodedBytes':maximum(lambda s:((backend(s).get('remux') or {}).get('stats') or {}).get('peakBufferedBytesUpperBound')),'cpu':cpu,'seeks':seeks,'cleanup':t.get('cleanup'),'close':t.get('close')})
 del r
print(json.dumps(rows,indent=2))
