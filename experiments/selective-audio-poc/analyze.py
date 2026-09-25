# SPDX-License-Identifier: Apache-2.0
"""Offline paired analysis; preserves failed cells and raw measurements."""
import json,statistics,sys
from pathlib import Path
root=Path(sys.argv[1]);j=json.loads((root/'result.json').read_text());ts=j['trials'];accepted=[t for t in ts if t['status']=='accepted'];median=statistics.median
roles=['browser','renderer','gpu','audioService','other']
summary={}
for arm in 'ABC':
 xs=[t for t in accepted if t['arm']==arm]
 if not xs:continue
 summary[arm]={'n':len(xs),'whole':median(t['cpu']['whole'] for t in xs),
   'nonBrowser':median(t['cpu']['whole']-t['cpu']['roles']['browser'] for t in xs),
   'roles':{r:median(t['cpu']['roles'][r] for t in xs) for r in roles},
   'maximumAVDriftMs':max((t.get('av') or {}).get('maxAbsClockSkewMs') or 0 for t in xs) if arm=='C' else None,
   'corrections':sum(len(t.get('corrections',[])) for t in xs),
   'videoDropped':sum(t['browserVideo']['dropped'] or 0 for t in xs),
   'audioUnderruns':sum(t.get('audioUnderruns',0) for t in xs)}
pairs={}
for a,b in [('B','A'),('C','B'),('C','A')]:
 ys=[]
 for t in accepted:
  if t['arm']!=a:continue
  o=next((z for z in accepted if z['round']==t['round'] and z['arm']==b),None)
  if o:ys.append({'round':t['round'],'whole':t['cpu']['whole']-o['cpu']['whole'],
   'nonBrowser':(t['cpu']['whole']-t['cpu']['roles']['browser'])-(o['cpu']['whole']-o['cpu']['roles']['browser']),
   **{r:t['cpu']['roles'][r]-o['cpu']['roles'][r] for r in roles}})
 if ys:pairs[f'{a}-{b}']={'values':ys,'median':{k:median(y[k] for y in ys) for k in ys[0] if k!='round'}}
thread={}
for t in accepted:
 if 'threadCPU' not in t:continue
 ss=t['threadCPU'];rows={};
 for after in ss['end']:
  before=next((x for x in ss['start'] if x['pid']==after['pid']),None)
  if not before or 'threads' not in before or 'threads' not in after:continue
  pre={v['id']:v for v in before['threads']};
  for v in after['threads']:
   p=pre.get(v['id'])
   if not p:continue
   name=after['type']+' / '+v['name'];rows[name]=rows.get(name,0)+(v['userNs']+v['systemNs']-p['userNs']-p['systemNs'])/1e9/t['elapsed']*100
 thread[f"{t['round']}{t['arm']}"]=dict(sorted(rows.items(),key=lambda x:-x[1]))
out={'source':str(root),'method':'All CPU values are one-core percentages. Pair each arm within round, then take median. Non-browser is a concurrent process sum. Thread snapshots omit created/exited threads. A/V clock skew is a sampled proxy, not an acoustic output measurement.','arms':summary,'pairs':pairs,
 'trials':[{'round':t['round'],'arm':t['arm'],'status':t['status'],'rejection':t.get('rejection'),'error':t.get('error'),
   'whole':t.get('cpu',{}).get('whole'),'roles':t.get('cpu',{}).get('roles'),'av':t.get('av'),
   'browserVideoDecoder':t.get('browserVideoDecoder'),'mpvVideoChain':t.get('mpvVideoChain'),
   'audioUnderruns':t.get('audioUnderruns'),'corrections':t.get('corrections'),'browserVideo':t.get('browserVideo'),
   'worker':t.get('worker')} for t in ts], 'threadGroups':thread}
(root/'analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'arms':summary,'pairs':pairs},indent=2))
