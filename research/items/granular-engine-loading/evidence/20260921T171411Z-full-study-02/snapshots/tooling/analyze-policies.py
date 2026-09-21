# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json
b=Path('research/items/granular-engine-loading');r=Path((b/'full-run.txt').read_text().strip());rows=[]
for p in sorted(r.glob('*/result.json')):
 d=json.loads(p.read_text())
 if d['stage'] not in ['policy','cache','recovery','software-recovery']:continue
 rows.append({'path':str(p),'stage':d['stage'],'browser':d['family'],'policy':d['policy'],'network':d['network'],'passed':d['passed'],'preparation':d.get('preparation'),'fault':d.get('fault'),'preparationAfterPlayback':d.get('preparationAfterPlayback'),'partialRecovery':d.get('partialRecovery'),'startup':d.get('startup'),'chargedPreparationPlusProgressMs':d.get('preparation',{}).get('ms',0)+d.get('startup',{}).get('movementMs',0),'repeat':d.get('repeat'),'warmReload':d.get('warmReload'),'recoveryMs':d.get('fallback',{}).get('ms'),'servedBytes':sum(x['bytes'] for x in d['requests']),'servedWasmBytes':sum(x['bytes'] for x in d['requests'] if x['url'].endswith('.wasm')),'wasmRequests':[{k:x[k] for k in ['url','bytes','gzip']} for x in d['requests'] if x['url'].endswith('.wasm')]})
(r/'policy-analysis.json').write_text(json.dumps({'samples':rows,'note':'One exploratory sample per policy/cache/recovery condition; not confidence-qualified. Preparation time charged separately. Cache test reloads the page within the same browser context.'},indent=2));print(json.dumps([{k:v for k,v in x.items() if k not in ['path','wasmRequests','warmReload','preparation']} for x in rows],indent=2))
