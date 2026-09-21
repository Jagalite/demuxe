# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,statistics,random,os
base=Path('research/items/granular-engine-loading');out=Path((base/'full-run.txt').read_text().strip());prefix='hevc-' if os.environ.get('STUDY')=='hevc' else '';orders=json.loads((out/(prefix+'performance-order.json')).read_text());samples=[]
for o in orders:
 try:meta=json.loads(o['output'].strip().splitlines()[-1]);r=json.loads((Path(meta['dest'])/'result.json').read_text())
 except Exception:continue
 samples.append({'browser':o['browser'],'network':o['network'],'pair':o['pair'],'candidate':o['candidate'],'passed':r['passed'],'path':str(Path(meta['dest'])/'result.json'),**r.get('startup',{}),'rssDeltaKiB':r['after']['rssKiB']-r['before']['rssKiB'] if r.get('after') else None,'cpuDeltaSeconds':r['after']['cpuSeconds']-r['before']['cpuSeconds'] if r.get('after',{}).get('cpuSeconds') is not None else None,'servedBytes':sum(q['bytes'] for q in r['requests']),'servedWasmBytes':sum(q['bytes'] for q in r['requests'] if q['url'].endswith('.wasm')),'survivingPids':r.get('survivingPids')})
summary=[];random.seed(731)
for browser in ['chrome','firefox']:
 for network in ['local','10mbps']:
  group=[x for x in samples if x['browser']==browser and x['network']==network and x['passed']];b=[x for x in group if not x['candidate']];c=[x for x in group if x['candidate']]
  if not b or not c:continue
  med=lambda rows,k:statistics.median(x[k] for x in rows)
  pairs=[next(x['movementMs'] for x in b if x['pair']==p)-next(x['movementMs'] for x in c if x['pair']==p) for p in sorted(set(x['pair'] for x in b)&set(x['pair'] for x in c))]
  boots=sorted(statistics.median(random.choices(pairs,k=len(pairs))) for _ in range(10000)) if pairs else []
  bm,cm=med(b,'movementMs'),med(c,'movementMs');summary.append({'browser':browser,'network':network,'baselineN':len(b),'candidateN':len(c),'baselineProgressMs':bm,'candidateProgressMs':cm,'baselineOpenMs':med(b,'openMs'),'candidateOpenMs':med(c,'openMs'),'medianSavingMs':bm-cm,'medianSavingPercent':100*(bm-cm)/bm,'pairedSavingMs':pairs,'medianPairedSavingMs':statistics.median(pairs) if pairs else None,'pairedMedianBootstrap95': [boots[249],boots[9749]] if boots else None,'baselineWasmBytes':med(b,'servedWasmBytes'),'candidateWasmBytes':med(c,'servedWasmBytes'),'baselineRssDeltaKiB':med(b,'rssDeltaKiB'),'candidateRssDeltaKiB':med(c,'rssDeltaKiB')})
result={'samples':samples,'summary':summary,'note':'Exploratory paired bootstrap interval over 3 or 5 pairs; small samples, no population guarantee. Progress endpoint includes >0.2s media advancement. RSS is summed sampled-process end-minus-start, not peak or retained usage.'};(out/(prefix+'performance-analysis.json')).write_text(json.dumps(result,indent=2));print(json.dumps(summary,indent=2))
