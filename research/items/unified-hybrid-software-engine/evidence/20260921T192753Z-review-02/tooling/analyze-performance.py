# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
from pathlib import Path
import json,statistics
base=Path('research/items/unified-hybrid-software-engine');out=resolve_run(base);order=json.loads((out/'performance-order.json').read_text());rows=[]
require_writable_run(out)
for trial in order:
 if trial['exit']:continue
 end=json.loads(trial['output'].strip().splitlines()[-1]);r=json.loads((Path(end['dest'])/'result.json').read_text());assert r['passed'];rows.append({**{k:trial[k] for k in ['browser','variant','stage','prepare','network','pair']},'path':str(Path(end['dest'])/'result.json'),'prepareMs':r['preparation']['ms'],'selectionMs':r['startup']['movementMs'],'totalMs':r['preparation']['ms']+r['startup']['movementMs'],'fallbackMs':r.get('fallback',{}).get('ms'),'wasmTransferBytes':sum(q['bytes'] for q in r['requests'] if q['url'].endswith('.wasm')),'engineRequests':len([q for q in r['requests'] if q['url'].endswith('player.wasm')]),'compileCalls':len(r.get('compilePhases',[])),'preparationStatuses':{a['name']:a['status'] for a in r['preparation'].get('report',{}).get('assets',[])}})
summary=[]
for browser,stage,network in sorted({(r['browser'],r['stage'],r['network']) for r in rows}):
 group=[r for r in rows if (r['browser'],r['stage'],r['network'])==(browser,stage,network)];metrics={}
 for metric in ['prepareMs','selectionMs','totalMs','fallbackMs','wasmTransferBytes']:
  a={r['pair']:r[metric] for r in group if r['variant']=='baseline' and r[metric] is not None};b={r['pair']:r[metric] for r in group if r['variant']=='unified' and r[metric] is not None}
  if not a or a.keys()!=b.keys():continue
  am=statistics.median(a.values());bm=statistics.median(b.values());savings=[a[i]-b[i] for i in a];metrics[metric]={'baselineMedian':am,'unifiedMedian':bm,'reductionPercent':100*(am-bm)/am if am else None,'pairedSavings':savings,'pairedSavingsRange':[min(savings),max(savings)]}
 summary.append({'browser':browser,'stage':stage,'network':network,'pairs':len(group)//2,'metrics':metrics})
sizes={r['variant']:r for r in json.loads((out/'sizes.json').read_text())};combined=sizes['baseline']['gzipBytes']+sizes['software-baseline']['gzipBytes'];candidate=sizes['unified']['gzipBytes'];result={'rows':rows,'summary':summary,'size':{'combinedGzipBytes':combined,'unifiedGzipBytes':candidate,'savedPercent':100*(combined-candidate)/combined,'softwareOnlyIncreasePercent':100*(candidate/sizes['software-baseline']['gzipBytes']-1)},'scope':'Small paired lab samples; selection metric is time to advancing media time, not exact photon latency. Browser launch and media transfer are excluded; only Wasm is paced. Memory and energy benefits not claimed.'};(out/'performance-analysis.json').write_text(json.dumps(result,indent=2));print(json.dumps({'summary':summary,'size':result['size']},indent=2))
