# SPDX-License-Identifier: Apache-2.0
"""Offline process/thread accounting. No browser launch or credential access."""
import json, statistics, sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'results/hybrid-handoff/factorial')
raw=json.loads(next(root.glob('*-result.json')).read_text())
trials=[]
for t in raw['trials']:
 if 'cpu' not in t:continue
 groups={};processes=[]
 for end in t.get('threadCPU',{}).get('end',[]):
  start=next((v for v in t['threadCPU']['start'] if v['pid']==end['pid']),None)
  if not start or 'threads' not in start or 'threads' not in end:continue
  prev={v['id']:v for v in start['threads']};elapsed=(end['at']-start['at'])/1000;rows=[]
  for thread in end['threads']:
   before=prev.get(thread['id'])
   if not before:continue
   value=100*(thread['userNs']+thread['systemNs']-before['userNs']-before['systemNs'])/1e9/elapsed
   key=f"{end['type']} / {thread['name']}";groups[key]=groups.get(key,0)+value
   rows.append({**thread,'cpu':value})
  processes.append({'pid':end['pid'],'type':end['type'],'summedMatchedThreadCPU':sum(v['cpu'] for v in rows),
   'newThreads':len({v['id'] for v in end['threads']}-prev.keys()),'exitedThreads':len(prev.keys()-{v['id'] for v in end['threads']}),
   'threads':sorted(rows,key=lambda v:-v['cpu'])})
 trials.append({'arm':t['arm'],'round':t['round'],'status':t['status'],'whole':t['cpu']['whole'],'roles':t['cpu']['roles'],
  'nonBrowser':t['cpu']['whole']-t['cpu']['roles']['browser'],'groups':dict(sorted(groups.items(),key=lambda v:-v[1])),
  'presenterWindow':{k:t['endState']['diagnostics']['presenter'][k]-t['startState']['diagnostics']['presenter'][k] for k in ['draws','imports','submissions']} if t.get('presenter',{}).get('kind')=='webgpu-external-texture' else None,
  'processes':processes,'webCodecs':t.get('webCodecs'),'audioWorklet':t.get('audioWorklet'),'presenter':t.get('presenter'),'mpvDropDeltas':{k:t['mpv']['end'].get(k,0)-t['mpv']['start'].get(k,0) for k in ['frame-drop-count','decoder-frame-drop-count']} if 'mpv' in t else None})
accepted=[t for t in trials if t['status']=='accepted'];median=statistics.median
arms={a:{'n':len(ts),'whole':median(t['whole'] for t in ts),'nonBrowser':median(t['nonBrowser'] for t in ts),
 'roles':{role:median(t['roles'][role] for t in ts) for role in ts[0]['roles']}} for a in dict.fromkeys(t['arm'] for t in accepted)
 for ts in [[t for t in accepted if t['arm']==a]]}
pairs={}
for a,b in [('D','E'),('F','G'),('D','F'),('E','G'),('B','A'),('B','C'),('C','A')]:
 rows=[]
 for t in accepted:
  if t['arm']!=a:continue
  other=next((o for o in accepted if o['arm']==b and o['round']==t['round']),None)
  if other:rows.append({'round':t['round'],'whole':t['whole']-other['whole'],'nonBrowser':t['nonBrowser']-other['nonBrowser'],
    **{role:t['roles'][role]-other['roles'][role] for role in t['roles']}})
 if rows:pairs[f'{a}-{b}']={'values':rows,'medians':{k:median(r[k] for r in rows) for k in rows[0] if k!='round'}}
out={'source':str(root),'method':'Process CPU-time deltas; matched OS thread deltas with individual snapshot times. Thread sums exclude new/exited threads; no inference from wall stack samples to CPU shares. NonBrowser is a concurrent process sum, not an idle subtraction. Diagnostic clear/offscreen arms do not display correct video.','arms':arms,'pairs':pairs,'trials':trials}
(root/'analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'arms':arms,'pairs':pairs},indent=2))
