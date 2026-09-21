# SPDX-License-Identifier: Apache-2.0
import json, pathlib, statistics
base=pathlib.Path(__file__).resolve().parents[1];run=pathlib.Path((base/'active-run.txt').read_text().strip())
rows=[]
for p in sorted(run.glob('performance-*/result.json')):
 r=json.loads(p.read_text());rows.append({'path':str(p),'variant':r['variant'],'network':r['network'],'passed':r['passed'],'mode':r.get('state',{}).get('mode'),**r.get('startup',{}),'cpuDeltaSeconds':r['after']['cpuSeconds']-r['before']['cpuSeconds'] if r.get('after') else None,'rssDeltaKiB':r['after']['rssKiB']-r['before']['rssKiB'] if r.get('after') else None,'survivingPids':r.get('survivingPids')})
summary={}
for network in sorted(set(r['network'] for r in rows)):
 summary[network]={}
 for variant in ['baseline','stripped']:
  samples=[r for r in rows if r['variant']==variant and r['network']==network and r['passed']]
  summary[network][variant]={'n':len(samples),**{k:statistics.median(r[k] for r in samples) if samples else None for k in ['openMs','playMs','movementMs','cpuDeltaSeconds','rssDeltaKiB']}}
 if all(summary[network][v]['n'] for v in ['baseline','stripped']):
  b=summary[network]['baseline']['movementMs'];s=summary[network]['stripped']['movementMs'];summary[network]['savingMs']=b-s;summary[network]['savingPercent']=100*(b-s)/b
out={'samples':rows,'medians':summary,'note':'Three alternating pairs; exploratory, no confidence interval. CPU cumulative process delta and RSS end-minus-start proxy; neither peak memory nor isolated decoder cost.'}
(run/'performance-analysis.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(summary,indent=2))
