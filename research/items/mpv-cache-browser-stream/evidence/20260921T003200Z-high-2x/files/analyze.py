# SPDX-License-Identifier: Apache-2.0
"""Derive metrics without rewriting captured runs. Arguments: run directories."""
import json,sys,statistics
from pathlib import Path
def max_or_none(xs):return max([x for x in xs if x is not None],default=None)
def cache(s):return s.get('props',{}).get('demuxer-cache-state') or {}
def diag(s):return s.get('diagnostics') or {}
def forward(s):
 pos=s['position'];rs=s.get('video',{}).get('buffered',[]) if s.get('video') else [[r['start'],r['end']] for r in cache(s).get('seekable-ranges',[])]
 return max([b-pos for a,b in rs if a<=pos<=b],default=0)
def freeze(samples):
 blocks=[];start=None;prev=None;group=[]
 for s in samples:
  if s['phase'] not in ['fast','modest','close','outage','recovery']:
   prev=None;continue
  if prev and s['position']-prev['position']<.005 and s['position']>=prev['position']-.005:
   if start is None:start=prev;group=[prev]
   group.append(s)
  else:
   if start and (prev['at']-start['at'])>=500:
    confirm=any(cache(x).get('underrun') or x.get('props',{}).get('paused-for-cache') or (x.get('video') and x['video']['readyState']<3) for x in group)
    blocks.append({'start':start['wall'],'end':s['wall'],'seconds':(s['at']-start['at'])/1000,'phase':start['phase'],'networkCorroborated':confirm})
   start=None;group=[]
  prev=s
 if start and prev and prev['at']-start['at']>=500:blocks.append({'start':start['wall'],'end':prev['wall'],'seconds':(prev['at']-start['at'])/1000,'phase':start['phase'],'networkCorroborated':any(cache(x).get('underrun') or x.get('props',{}).get('paused-for-cache') or (x.get('video') and x['video']['readyState']<3) for x in group),'rightCensored':True})
 return blocks
def network(reqs):
 intervals=sorted((r['start'],r['start']+r['bytesWritten']) for r in reqs if r['bytesWritten'])
 total=sum(b-a for a,b in intervals);unique=0;end=0
 for a,b in intervals:
  unique+=max(0,b-max(a,end));end=max(end,b)
 return {'requests':len(reqs),'bytesWritten':total,'uniqueBytesWritten':unique,'overlappingBytesWritten':total-unique,'cancelledResponses':sum(not r.get('complete',False) for r in reqs),'rangePatterns':[{'range':r['range'],'bytesWritten':r['bytesWritten'],'complete':r.get('complete')} for r in reqs]}
allrows=[]
for arg in sys.argv[1:]:
 root=Path(arg);run=json.loads((root/'results.json').read_text())
 for t in run['trials']:
  if 'raw' not in t:continue
  ss=t['raw']['samples'];active=[s for s in ss if s['phase'] in ['fast','modest','close','outage','recovery']];freezes=freeze(ss)
  # Engine initialization can render an idle black canvas. A source video track
  # and timestamped presentation are required; retain the old counter separately.
  source_frames=[s for s in ss if any(x.get('type')=='video' and x.get('selected') for x in s.get('props',{}).get('track-list',[])) and isinstance((diag(s).get('presentation',{}).get('position') if t['config']['mode']=='hybrid' else diag(s).get('presentedPosition')),(int,float)) and (diag(s).get('presentation',{}).get('drawn',0) if t['config']['mode']=='hybrid' else diag(s).get('rendered',0))>0]
  source_frame_ms=t['raw'].get('firstFrame') if t['config']['mode']=='native' else source_frames[0]['at'] if source_frames else None
  reqfile=root/t['config']['id']/'requests.jsonl';reqs=[json.loads(l) for l in reqfile.read_text().splitlines()] if reqfile.exists() else []
  cutoff=next((s['networkBefore']['wall'] for s in t.get('seeks',[]) if 'networkBefore' in s),None)
  before_seeks=[{**r,'bytesWritten':sum(n for at,off,n in r['writes'] if at<cutoff)} for r in reqs if r['started']<cutoff] if cutoff else []
  row={'run':str(root),'id':t['config']['id'],'config':t['config'],'passed':t.get('passed'),'error':t.get('error'),'effective':t.get('open',{}).get('effective'),'startupNetworkBytesPerSecond':t.get('startupNetworkBytesPerSecond'),'startupMs':{**{k:t['raw'].get(k) for k in ['ready','opened','playing','firstFrame']},'qualifiedSourceFrame':source_frame_ms},'freezes':freezes,
   'networkCorroboratedRebuffers':sum(x['networkCorroborated'] for x in freezes),'networkCorroboratedRebufferSeconds':sum(x['seconds'] for x in freezes if x['networkCorroborated']),
   'allTimelineFreezeSeconds':sum(x['seconds'] for x in freezes),'network':network(reqs),'networkBeforeSeeks':network(before_seeks) if cutoff else None,'networkBeforeSeeksCutoffWall':cutoff,
   'rangeReaderFetchedBytesLast':max_or_none([diag(s).get('io',{}).get('fetchedBytes') for s in ss]),
   'peakWasmLinearMemoryBytes':max_or_none([diag(s).get('heapBytes') for s in ss]),'peakWasmMallocBytes':None,
   'peakSourceCacheBytes':max_or_none([diag(s).get('io',{}).get('peakCacheBytes') for s in ss]),
   'peakSourceActiveReadBytes':max_or_none([diag(s).get('io',{}).get('peakActiveBytes') for s in ss]),
   'peakPacketTotalBytes':max_or_none([cache(s).get('total-bytes') for s in ss]),'peakPacketForwardBytes':max_or_none([cache(s).get('fw-bytes') for s in ss]),
   'peakPacketNonForwardBytesEstimate':max_or_none([cache(s)['total-bytes']-cache(s)['fw-bytes'] for s in ss if 'fw-bytes' in cache(s)]),
   'peakForwardTimelineCoverageSeconds':max_or_none([forward(s) for s in ss]),
   'peakMpvApproxDemuxDurationSeconds':max_or_none([cache(s).get('cache-duration') for s in ss]),
   'peakAudioQueuedFrames':max_or_none([diag(s).get('queuedFrames') for s in ss]),
   'peakRetainedVideoFrames':max_or_none([diag(s).get('presentation',{}).get('peakRetained') for s in ss]),
   'observationSamples':len(ss),'unfocusedSamples':sum(not s.get('focused',False) for s in ss),'hiddenSamples':sum(s.get('visible')!='visible' for s in ss),
   'phases':[],'seeks':[],'cleanup':t.get('cleanup'),'remainingProcessIDs':t.get('remainingProcessIDs')}
  for ph in t.get('phases',[]):
   a,b=ph['begin'],ph['end'];wall=(b['wall']-a['wall'])/1000;old={p['id']:p['cpuTime'] for p in a['processes']};new={p['id']:p['cpuTime'] for p in b['processes']}
   cpu=sum(v-old.get(k,0) for k,v in new.items()) if old.keys()<=new.keys() else None
   samples=[s for s in active if a['wall']<=s['wall']<=b['wall']]
   phase={'name':ph['name'],'wallSeconds':wall,'cpuSeconds':cpu,'cpuOneCorePercent':100*cpu/wall if cpu is not None else None,'peakSummedRssKiB':max(x['rssKiB'] for x in [a]+ph['samples'] if x['rssKiB'] is not None),'positionAdvance':b['state']['position']-a['state']['position'],'forwardStartSeconds':forward(a['state']),'forwardEndSeconds':forward(b['state']),'mpvApproxDurationEnd':cache(b['state']).get('cache-duration'),'pausedForCacheSamples':sum(s.get('props',{}).get('paused-for-cache') is True for s in samples),'underrunSamples':sum(cache(s).get('underrun') is True for s in samples),'serverBytesWritten':sum(n for r in reqs for at,off,n in r['writes'] if a['wall']<=at<b['wall']),'cacheStateEnd':cache(b['state']),'nativeBufferedEnd':b['state'].get('video',{}).get('buffered') if b['state'].get('video') else None}
   row['phases'].append(phase)
   for metric in ['frame-drop-count','decoder-frame-drop-count']:
    va=a['state'].get('props',{}).get(metric);vb=b['state'].get('props',{}).get(metric)
    phase[metric+'-delta']=vb-va if isinstance(va,(int,float)) and isinstance(vb,(int,float)) else None
  recovery=next((p for p in t.get('phases',[]) if p['name']=='recovery'),None)
  if recovery:
   at=recovery['begin']['wall'];crossing=[f for f in freezes if f['start']<=at<f['end']]
   row['outageRecoveryDelaySeconds']=max([x['end']-at for x in crossing],default=0)/1000
  for s in t.get('seeks',[]):
   nb=s.get('networkBefore',{});na=s.get('networkAfter',{})
   settled=[x for x in ss if s['after']['wall']<=x['wall']<=na.get('wall',s['after']['wall'])]
   after_state=settled[-1] if settled else s['after']
   before=cache(s['before']);after=cache(after_state)
   rb=s['before'].get('video',{}).get('buffered',[]) if s['before'].get('video') else [[r['start'],r['end']] for r in before.get('seekable-ranges',[])]
   ib=diag(s['before']).get('io',{});ia=diag(after_state).get('io',{})
   row['seeks'].append({'kind':s.get('kind'),'target':s['target'],'latencyMs':s['latencyMs'],'targetInDeclaredTimelineCache':any(a<=s['target']<=b for a,b in rb),'newRequests':na.get('requests',0)-nb.get('requests',0),'bytesWrittenDuringSeekAnd500ms':na.get('bytes',0)-nb.get('bytes',0),'mpvLowLevelSeekDelta':after.get('debug-low-level-seeks',0)-before.get('debug-low-level-seeks',0) if before else None,'sourceIODeltasWithin500ms':{k:ia.get(k,0)-ib.get(k,0) for k in ['reads','seeks','fetchedBytes','requests']} if ib else None,'postSeekObservationWall':after_state['wall'],'beforeCache':before,'afterCache':after,'nativeBufferedBefore':s['before'].get('video',{}).get('buffered') if s['before'].get('video') else None})
  allrows.append(row)
print(json.dumps({'metrics':allrows,'units':'seconds, milliseconds, bytes as named; RSS KiB; CPU percent of one logical core','notes':['Network counts are server writes; cancelled-body overdelivery is possible.','Rebuffer grouping uses >=500ms timeline plateaus with network/cache corroboration. Decode stalls remain a possible confound; inspect phase progress and queues.','Packet non-forward bytes are total minus forward estimates, not precise allocator ownership.','No raw byte-cache count is converted to seconds.']},indent=2))
