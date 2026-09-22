# SPDX-License-Identifier: Apache-2.0
"""Summarize retained CDP process CPU measurements without subtracting idle cost."""
import json,sys,statistics,collections
from pathlib import Path
rows=[]
for argument in sys.argv[1:]:
 path=Path(argument)
 for t in json.loads(path.read_text())['trials']:
  if 'perf' not in t: continue
  a,b=t['samples'][0],t['samples'][-1]
  before={p['id']:p for p in a['processes']};cpu=collections.defaultdict(float)
  for p in b['processes']:
   if p['id'] in before:cpu[p['type']]+=100*(p['cpuTime']-before[p['id']]['cpuTime'])/t['perf']['wallSeconds']
  rows.append(dict(run=str(path.parent),mode=t['mode'],cpu=dict(cpu),total=sum(cpu.values()),excludingBrowser=sum(v for k,v in cpu.items() if k!='browser'),mediaSeconds=t['perf']['mediaSeconds'],wallSeconds=t['perf']['wallSeconds'],lostProcesses=t['perf']['lostProcesses'],errors=t['samples'][-1]['state']['errors'],workersAfterClose=t.get('workersAfterClose')))
summary={}
for mode in sorted({r['mode'] for r in rows}):
 rr=[r for r in rows if r['mode']==mode]
 summary[mode]={'n':len(rr),'medianTotal':statistics.median(r['total'] for r in rr),'rangeTotal':[min(r['total'] for r in rr),max(r['total'] for r in rr)],'medianExcludingBrowser':statistics.median(r['excludingBrowser'] for r in rr),'medianByProcessType':{k:statistics.median(r['cpu'].get(k,0) for r in rr) for k in sorted({k for r in rr for k in r['cpu']})}}
print(json.dumps({'units':'percent of one CPU core; GPU is GPU-process CPU, not GPU utilization','summary':summary,'trials':rows},indent=2))
